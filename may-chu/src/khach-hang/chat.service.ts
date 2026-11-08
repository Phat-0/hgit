import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { KetNoiKhachService, hash, type KhachDb } from './ket-noi.service.js';
@Injectable()
export class ChatService {
  constructor(private readonly conn: KetNoiKhachService) {}
  private guest(token?: string) {
    if (!token) return null;
    if (!/^[a-f0-9]{64}$/.test(token))
      throw new ForbiddenException('Phiên chat không hợp lệ');
    return hash(token);
  }
  private async access(c: KhachDb, id: string, uid?: string, token?: string) {
    this.conn.id(id);
    const r = await c.query(
      'SELECT * FROM public.cuoc_tro_chuyen WHERE id=$1',
      [id],
    );
    const t = r.rows[0];
    if (!t) throw new ForbiddenException('Không có quyền xem hội thoại');
    const member = uid
      ? (
          await c.query(
            'SELECT 1 FROM public.thanh_vien_tro_chuyen WHERE cuoc_tro_chuyen_id=$1 AND nguoi_dung_id=$2',
            [id, uid],
          )
        ).rowCount
      : 0;
    const staff =
      uid && t.loai === 'ho_tro'
        ? await this.conn.staff(c, uid, t.homestay_id)
        : false;
    if (
      !member &&
      !staff &&
      (!token ||
        !t.khach_vang_lai_hash ||
        (t.khach_hang_id && t.khach_hang_id !== uid) ||
        this.guest(token) !== t.khach_vang_lai_hash)
    )
      throw new ForbiddenException('Không có quyền xem hội thoại');
    return { t, staff };
  }
  async start(
    x: Record<string, unknown>,
    authorization?: string,
    guestToken?: string,
  ) {
    const user = await this.conn.identity(authorization),
      c = await this.conn.db();
    try {
      await c.query('BEGIN');
      if (x.nguoi_nhan_id) {
        if (!user) throw new UnauthorizedException();
        const recipient = this.conn.id(String(x.nguoi_nhan_id));
        if (recipient === user.id)
          throw new BadRequestException('Chọn tài khoản khác');
        const exists = await c.query(
          "SELECT id FROM public.nguoi_dung WHERE id=$1 AND trang_thai='Đang hoạt động'",
          [recipient],
        );
        if (!exists.rowCount)
          throw new BadRequestException(
            'Tài khoản không tồn tại hoặc không nhận tin',
          );
        const key = [user.id, recipient].sort().join(':');
        const r = await c.query(
          "INSERT INTO public.cuoc_tro_chuyen(khach_hang_id,loai,khoa_truc_tiep,che_do_xu_ly) VALUES($1,'truc_tiep',$2,'Nhân viên tiếp quản') ON CONFLICT(khoa_truc_tiep) DO UPDATE SET khoa_truc_tiep=excluded.khoa_truc_tiep RETURNING id",
          [user.id, key],
        );
        await c.query(
          'INSERT INTO public.thanh_vien_tro_chuyen VALUES($1,$2),($1,$3) ON CONFLICT DO NOTHING',
          [r.rows[0].id, user.id, recipient],
        );
        await c.query('COMMIT');
        return { id: r.rows[0].id };
      }
      const branch = x.chi_nhanh_id
        ? this.conn.id(String(x.chi_nhanh_id))
        : null;
      if (
        branch &&
        !(
          await c.query(
            "SELECT 1 FROM public.homestay WHERE id=$1 AND trang_thai='Đang hoạt động'",
            [branch],
          )
        ).rowCount
      )
        throw new BadRequestException('Chi nhánh không tồn tại');
      // Token ngẫu nhiên chỉ lưu ở trình duyệt khách; database chỉ lưu hash.
      const token =
          guestToken || (!user ? randomBytes(32).toString('hex') : null),
        guestHash = token ? this.guest(token) : null;
      if (guestHash) {
        const existing = await c.query(
          'SELECT id,homestay_id,khach_hang_id FROM public.cuoc_tro_chuyen WHERE khach_vang_lai_hash=$1 FOR UPDATE',
          [guestHash],
        );
        if (existing.rowCount) {
          const id = existing.rows[0].id;
          if (
            existing.rows[0].khach_hang_id &&
            existing.rows[0].khach_hang_id !== user?.id
          )
            throw new ForbiddenException('Hội thoại đã thuộc tài khoản khác');
          if (user) {
            await c.query(
              'INSERT INTO public.thanh_vien_tro_chuyen VALUES($1,$2) ON CONFLICT DO NOTHING',
              [id, user.id],
            );
            await c.query(
              'UPDATE public.cuoc_tro_chuyen SET khach_hang_id=COALESCE(khach_hang_id,$2) WHERE id=$1',
              [id, user.id],
            );
          }
          await c.query('COMMIT');
          return { id, guest_token: token };
        }
      }
      if (user) {
        await c.query('SELECT pg_advisory_xact_lock(hashtext($1))', [user.id]);
        const existing = await c.query(
          "SELECT id FROM public.cuoc_tro_chuyen WHERE khach_hang_id=$1 AND loai='ho_tro' AND homestay_id IS NOT DISTINCT FROM $2 AND trang_thai='Đang mở' LIMIT 1",
          [user.id, branch],
        );
        if (existing.rowCount) {
          await c.query('COMMIT');
          return { id: existing.rows[0].id };
        }
      }
      const r = await c.query(
        "INSERT INTO public.cuoc_tro_chuyen(khach_hang_id,homestay_id,khach_vang_lai_hash,che_do_xu_ly) VALUES($1,$2,$3,'Nhân viên tiếp quản') RETURNING id",
        [user?.id ?? null, branch, guestHash],
      );
      if (user)
        await c.query(
          'INSERT INTO public.thanh_vien_tro_chuyen VALUES($1,$2)',
          [r.rows[0].id, user.id],
        );
      await c.query('COMMIT');
      return { id: r.rows[0].id, guest_token: token };
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      await c.end();
    }
  }
  async list(authorization?: string) {
    const user = await this.conn.identity(authorization);
    if (!user) throw new UnauthorizedException();
    const c = await this.conn.db();
    try {
      const r = await c.query(
        `SELECT t.id,t.loai,t.trang_thai,t.ngay_cap_nhat,h.ten_homestay,COALESCE(CASE WHEN t.loai='truc_tiep' THEN (SELECT n2.ho_ten FROM public.thanh_vien_tro_chuyen m2 JOIN public.nguoi_dung n2 ON n2.id=m2.nguoi_dung_id WHERE m2.cuoc_tro_chuyen_id=t.id AND m2.nguoi_dung_id<>$1 LIMIT 1) ELSE n.ho_ten END,'Khách vãng lai') AS ten_khach,(SELECT noi_dung FROM public.tin_nhan WHERE cuoc_tro_chuyen_id=t.id ORDER BY ngay_gui DESC,id DESC LIMIT 1) AS tin_cuoi FROM public.cuoc_tro_chuyen t LEFT JOIN public.homestay h ON h.id=t.homestay_id LEFT JOIN public.nguoi_dung n ON n.id=t.khach_hang_id WHERE EXISTS(SELECT 1 FROM public.thanh_vien_tro_chuyen m WHERE m.cuoc_tro_chuyen_id=t.id AND m.nguoi_dung_id=$1) OR t.loai='ho_tro' AND EXISTS(SELECT 1 FROM public.nguoi_dung_vai_tro nv JOIN public.vai_tro v ON v.id=nv.vai_tro_id WHERE nv.nguoi_dung_id=$1 AND nv.ngay_thu_hoi IS NULL AND (v.ma_vai_tro='Quản trị hệ thống' AND nv.homestay_id IS NULL OR v.ma_vai_tro IN ('Quản lý','Chăm sóc khách hàng') AND nv.homestay_id=t.homestay_id)) ORDER BY t.ngay_cap_nhat DESC LIMIT 100`,
        [user.id],
      );
      return { toi: user.id, hoi_thoai: r.rows };
    } finally {
      await c.end();
    }
  }
  async messages(
    id: string,
    authorization?: string,
    token?: string,
    before?: string,
  ) {
    const user = await this.conn.identity(authorization),
      c = await this.conn.db();
    try {
      await this.access(c, id, user?.id, token);
      if (before) this.conn.id(before);
      const r = await c.query(
        `SELECT t.id,t.nguoi_gui_id,t.loai_nguoi_gui,t.noi_dung,t.ngay_gui,COALESCE(n.ho_ten,t.loai_nguoi_gui) AS ten_nguoi_gui FROM public.tin_nhan t LEFT JOIN public.nguoi_dung n ON n.id=t.nguoi_gui_id WHERE t.cuoc_tro_chuyen_id=$1 AND ($2::uuid IS NULL OR (t.ngay_gui,t.id)<(SELECT ngay_gui,id FROM public.tin_nhan WHERE id=$2 AND cuoc_tro_chuyen_id=$1)) ORDER BY t.ngay_gui DESC,t.id DESC LIMIT 60`,
        [id, before || null],
      );
      return { toi: user?.id ?? null, tin_nhan: r.rows.reverse() };
    } finally {
      await c.end();
    }
  }
  async send(
    id: string,
    x: Record<string, unknown>,
    authorization?: string,
    token?: string,
  ) {
    const content = typeof x.noi_dung === 'string' ? x.noi_dung.trim() : '';
    if (!content || content.length > 4000)
      throw new BadRequestException('Tin nhắn cần từ 1 đến 4.000 ký tự');
    const messageId = this.conn.id(String(x.ma_phia_khach || '')),
      user = await this.conn.identity(authorization),
      c = await this.conn.db();
    try {
      await c.query('BEGIN');
      const { t, staff } = await this.access(c, id, user?.id, token);
      if (t.trang_thai !== 'Đang mở')
        throw new BadRequestException('Hội thoại đã đóng');
      const r = await c.query(
        `INSERT INTO public.tin_nhan(cuoc_tro_chuyen_id,nguoi_gui_id,loai_nguoi_gui,noi_dung,ma_phia_khach) VALUES($1,$2,$3,$4,$5) ON CONFLICT(cuoc_tro_chuyen_id,ma_phia_khach) WHERE ma_phia_khach IS NOT NULL DO NOTHING RETURNING id`,
        [
          id,
          user?.id ?? null,
          user ? (staff ? 'Nhân viên' : 'Khách hàng') : 'Khách vãng lai',
          content,
          messageId,
        ],
      );
      await c.query(
        'UPDATE public.cuoc_tro_chuyen SET ngay_cap_nhat=now() WHERE id=$1',
        [id],
      );
      await c.query('COMMIT');
      return { ok: true, id: r.rows[0]?.id };
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      await c.end();
    }
  }
}

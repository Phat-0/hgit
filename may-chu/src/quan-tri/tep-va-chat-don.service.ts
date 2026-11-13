import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { QuanTriService } from './quan-tri.service.js';
import { docTepChat, type ChatFile } from '../khach-hang/chat-tep.js';
const phone = (s: unknown) => {
  const v = String(s || '').replace(/[ .()+-]/g, '');
  return /^0\d{9}$/.test(v)
    ? '+84' + v.slice(1)
    : /^84\d{9}$/.test(v)
      ? '+' + v
      : /^\d{9,15}$/.test(v)
        ? '+' + v
        : '';
};
@Injectable()
export class TepVaChatDonService {
  constructor(private readonly admin: QuanTriService) {}
  private async db() {
    const c = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: true },
      connectionTimeoutMillis: 5000,
      query_timeout: 10000,
    });
    await c.connect();
    return c;
  }
  private id(v: string) {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        v,
      )
    )
      throw new BadRequestException('Mã đơn hoặc ảnh không hợp lệ');
  }
  private storage() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
      throw new ServiceUnavailableException('Chưa cấu hình kho ảnh đơn');
    return createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    ).storage.from('anh-don');
  }
  private async allow(uid: string, id: string) {
    await this.admin.kiemTraTrang(uid, 'lich|dat-phong');
    this.id(id);
  }
  async images(uid: string, id: string) {
    await this.allow(uid, id);
    const c = await this.db();
    try {
      const r = await c.query(
        'SELECT id,ten_tep,duong_dan,ngay_tao FROM public.anh_don_dat_phong WHERE dat_phong_id=$1 ORDER BY ngay_tao,id',
        [id],
      );
      if (!r.rows.length) return [];
      const storage = this.storage();
      return await Promise.all(
        r.rows.map(async (x) => {
          const signed = await storage.createSignedUrl(x.duong_dan, 300);
          if (signed.error)
            throw new ServiceUnavailableException('Không mở được ảnh đơn');
          return {
            id: x.id,
            ten_tep: x.ten_tep,
            ngay_tao: x.ngay_tao,
            url: signed.data?.signedUrl,
          };
        }),
      );
    } finally {
      await c.end();
    }
  }
  async upload(uid: string, id: string, file: ChatFile) {
    await this.allow(uid, id);
    const checked = docTepChat(file);
    if (!checked.image || file.size > 5242880)
      throw new BadRequestException('Chỉ nhận JPG/PNG/WebP tối đa 5 MB');
    const c = await this.db();
    let uploaded = '',
      commitAttempted = false;
    try {
      await c.query('BEGIN');
      if (
        !(
          await c.query(
            'SELECT id FROM public.dat_phong WHERE id=$1 FOR UPDATE',
            [id],
          )
        ).rowCount
      )
        throw new NotFoundException('Không tìm thấy đơn');
      if (
        Number(
          (
            await c.query(
              'SELECT count(*) AS n FROM public.anh_don_dat_phong WHERE dat_phong_id=$1',
              [id],
            )
          ).rows[0].n,
        ) >= 20
      )
        throw new BadRequestException('Mỗi đơn tối đa 20 ảnh');
      const path = id + '/' + randomUUID() + '.' + checked.ext;
      const storage = this.storage();
      const result = await storage.upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });
      if (result.error)
        throw new ServiceUnavailableException('Không tải được ảnh đơn');
      uploaded = path;
      const r = await c.query(
        'INSERT INTO public.anh_don_dat_phong(dat_phong_id,duong_dan,ten_tep,mime,dung_luong,nguoi_tai_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',
        [id, path, checked.name, file.mimetype, file.size, uid],
      );
      commitAttempted = true;
      await c.query('COMMIT');
      return r.rows[0];
    } catch (e) {
      await c.query('ROLLBACK');
      if (uploaded && !commitAttempted)
        await this.storage()
          .remove([uploaded])
          .catch(() => {});
      throw e;
    } finally {
      await c.end();
    }
  }
  async remove(uid: string, id: string, image: string) {
    await this.allow(uid, id);
    this.id(image);
    const c = await this.db();
    try {
      await c.query('BEGIN');
      const r = await c.query(
        'SELECT duong_dan FROM public.anh_don_dat_phong WHERE id=$1 AND dat_phong_id=$2 FOR UPDATE',
        [image, id],
      );
      if (!r.rowCount) throw new NotFoundException('Ảnh không thuộc đơn này');
      const deleted = await this.storage().remove([r.rows[0].duong_dan]);
      if (deleted.error)
        throw new ServiceUnavailableException('Không xóa được ảnh');
      await c.query('DELETE FROM public.anh_don_dat_phong WHERE id=$1', [
        image,
      ]);
      await c.query('COMMIT');
      return { ok: true };
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      await c.end();
    }
  }
  async conversation(uid: string, id: string) {
    await this.allow(uid, id);
    await this.admin.kiemTraTrang(uid, 'tin-nhan');
    const c = await this.db();
    try {
      await c.query('BEGIN');
      const r = await c.query(
        'SELECT * FROM public.dat_phong WHERE id=$1 FOR UPDATE',
        [id],
      );
      if (!r.rowCount) throw new NotFoundException('Không tìm thấy đơn');
      const d = r.rows[0],
        number = phone(d.so_dien_thoai_dat);
      let owner: string | null = null;
      if (d.nguoi_dung_id && number) {
        const account = await c.query(
          'SELECT id,phone FROM auth.users WHERE id=$1 AND phone_confirmed_at IS NOT NULL',
          [d.nguoi_dung_id],
        );
        if (account.rows[0] && phone(account.rows[0].phone) === number)
          owner = account.rows[0].id;
      }
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
        'chat-don:' + (number || id) + ':' + d.homestay_id,
      ]);
      const mapped = await c.query(
        'SELECT t.* FROM public.hoi_thoai_don_dat_phong h JOIN public.cuoc_tro_chuyen t ON t.id=h.cuoc_tro_chuyen_id WHERE h.dat_phong_id=$1',
        [id],
      );
      let thread = mapped.rows[0];
      if (
        thread?.khach_hang_id &&
        number &&
        (!d.nguoi_dung_id || d.nguoi_dung_id === thread.khach_hang_id)
      ) {
        const a = await c.query(
          'SELECT id,phone FROM auth.users WHERE id=$1 AND phone_confirmed_at IS NOT NULL',
          [thread.khach_hang_id],
        );
        if (a.rows[0] && phone(a.rows[0].phone) === number)
          owner = thread.khach_hang_id;
      }
      if (
        thread &&
        (phone(thread.so_dien_thoai_lien_ket) !== number ||
          (thread.khach_hang_id && thread.khach_hang_id !== owner))
      )
        thread = undefined;
      if (!thread && (number || owner)) {
        const existing = await c.query(
          "SELECT * FROM public.cuoc_tro_chuyen WHERE loai='ho_tro' AND homestay_id=$1 AND trang_thai='Đang mở' AND (($2::uuid IS NOT NULL AND khach_hang_id=$2) OR (khach_hang_id IS NULL AND so_dien_thoai_lien_ket=$3 AND $3<>'')) ORDER BY ngay_cap_nhat DESC LIMIT 1",
          [d.homestay_id, owner, number],
        );
        thread = existing.rows[0];
      }
      if (!thread)
        thread = (
          await c.query(
            "INSERT INTO public.cuoc_tro_chuyen(khach_hang_id,homestay_id,so_dien_thoai_lien_ket,loai,che_do_xu_ly) VALUES($1,$2,$3,'ho_tro','Nhân viên tiếp quản') RETURNING *",
            [owner, d.homestay_id, number || null],
          )
        ).rows[0];
      await c.query(
        'INSERT INTO public.hoi_thoai_don_dat_phong(dat_phong_id,cuoc_tro_chuyen_id) VALUES($1,$2) ON CONFLICT(dat_phong_id) DO UPDATE SET cuoc_tro_chuyen_id=$2,ngay_cap_nhat=now()',
        [id, thread.id],
      );
      if (owner) {
        const bound = await c.query(
          'UPDATE public.cuoc_tro_chuyen SET khach_hang_id=$2 WHERE id=$1 AND (khach_hang_id IS NULL OR khach_hang_id=$2) RETURNING id',
          [thread.id, owner],
        );
        if (!bound.rowCount)
          throw new ConflictException(
            'Hội thoại đã được liên kết với tài khoản khác',
          );
        await c.query(
          'INSERT INTO public.thanh_vien_tro_chuyen(cuoc_tro_chuyen_id,nguoi_dung_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
          [thread.id, owner],
        );
      }
      await c.query('COMMIT');
      return {
        id: thread.id,
        ten_hien_thi: d.ten_don,
        cho_lien_ket: !owner && !thread.khach_hang_id,
      };
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      await c.end();
    }
  }
}

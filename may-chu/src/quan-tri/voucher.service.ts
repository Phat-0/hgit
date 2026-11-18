import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { QuanTriService } from './quan-tri.service.js';
import { moDb, maId, chu, ghiNhatKy } from './van-hanh.db.js';
import { traVoucher } from './voucher.sql.js';
@Injectable()
export class VoucherService {
  constructor(private readonly admin: QuanTriService) {}
  private db() {
    return moDb();
  }
  async recipients(uid: string) {
    await this.admin.kiemTraQuanTri(uid);
    const c = await this.db();
    try {
      return (
        await c.query(
          "SELECT n.id,n.ho_ten,n.so_dien_thoai FROM public.nguoi_dung n WHERE n.trang_thai='Đang hoạt động' AND NOT EXISTS(SELECT 1 FROM public.nguoi_dung_vai_tro nv JOIN public.vai_tro v ON v.id=nv.vai_tro_id WHERE nv.nguoi_dung_id=n.id AND nv.ngay_thu_hoi IS NULL AND v.ma_vai_tro<>'Khách hàng') ORDER BY n.ho_ten LIMIT 1000",
        )
      ).rows;
    } finally {
      await c.end();
    }
  }
  async list(uid: string) {
    await this.admin.kiemTraTrang(uid, 'goi-combo');
    const c = await this.db();
    try {
      return {
        voucher: (
          await c.query(
            "SELECT k.*,count(s.id) FILTER(WHERE d.trang_thai NOT IN ('Đã hủy','Không nhận phòng') AND (d.trang_thai NOT IN ('Chờ xác nhận','Chờ thanh toán') OR d.het_han_giu_cho IS NULL OR d.het_han_giu_cho>now()))::int as da_dung FROM public.khuyen_mai k LEFT JOIN public.su_dung_khuyen_mai s ON s.khuyen_mai_id=k.id LEFT JOIN public.dat_phong d ON d.id=s.dat_phong_id GROUP BY k.id ORDER BY k.bat_dau DESC",
          )
        ).rows,
        chi_nhanh: (
          await c.query(
            'SELECT id,ten_homestay FROM public.homestay ORDER BY ten_homestay',
          )
        ).rows,
      };
    } finally {
      await c.end();
    }
  }
  async save(uid: string, id: string | undefined, b: Record<string, unknown>) {
    await this.admin.kiemTraTrang(uid, 'goi-combo');
    if (id) maId(id);
    const code = chu(b.ma_khuyen_mai, 3, 40).toUpperCase(),
      name = chu(b.ten_khuyen_mai, 1, 150),
      kind = String(b.loai_giam),
      value = Number(b.gia_tri),
      min = Number(b.don_toi_thieu || 0),
      max =
        b.giam_toi_da == null || b.giam_toi_da === ''
          ? null
          : Number(b.giam_toi_da),
      limit =
        b.gioi_han_su_dung == null || b.gioi_han_su_dung === ''
          ? null
          : Number(b.gioi_han_su_dung),
      start = new Date(String(b.bat_dau)),
      end = new Date(String(b.ket_thuc)),
      state = String(b.trang_thai),
      branch = b.homestay_id ? maId(b.homestay_id) : null;
    if (
      !/^[A-Z0-9_-]{3,40}$/.test(code) ||
      !['Phần trăm', 'Số tiền'].includes(kind) ||
      !Number.isSafeInteger(value) ||
      value <= 0 ||
      value > 1e12 ||
      (kind === 'Phần trăm' && value > 100) ||
      !Number.isSafeInteger(min) ||
      min < 0 ||
      min > 1e12 ||
      (max !== null && (!Number.isSafeInteger(max) || max < 0 || max > 1e12)) ||
      (limit !== null && (!Number.isSafeInteger(limit) || limit < 1)) ||
      !Number.isFinite(+start) ||
      !Number.isFinite(+end) ||
      start >= end ||
      !['Đang hoạt động', 'Tạm ngưng'].includes(state)
    )
      throw new BadRequestException('Thiết lập voucher không hợp lệ');
    const c = await this.db();
    try {
      await c.query('BEGIN');
      const args = [
        code,
        name,
        kind,
        value,
        max,
        min,
        limit,
        start.toISOString(),
        end.toISOString(),
        state,
        branch,
      ];
      const r = id
        ? await c.query(
            'UPDATE public.khuyen_mai SET ma_khuyen_mai=$1,ten_khuyen_mai=$2,loai_giam=$3,gia_tri=$4,giam_toi_da=$5,don_toi_thieu=$6,gioi_han_su_dung=$7,bat_dau=$8,ket_thuc=$9,trang_thai=$10,homestay_id=$11 WHERE id=$12 RETURNING id',
            [...args, id],
          )
        : await c.query(
            'INSERT INTO public.khuyen_mai(ma_khuyen_mai,ten_khuyen_mai,loai_giam,gia_tri,giam_toi_da,don_toi_thieu,gioi_han_su_dung,bat_dau,ket_thuc,trang_thai,homestay_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id',
            args,
          );
      if (!r.rowCount) throw new NotFoundException();
      await ghiNhatKy(
        c,
        uid,
        id ? 'Sửa voucher' : 'Tạo voucher',
        'khuyen_mai',
        r.rows[0].id,
        { ma: code, trang_thai: state },
      );
      await c.query('COMMIT');
      return r.rows[0];
    } catch (e) {
      await c.query('ROLLBACK');
      if ((e as any).code === '23505')
        throw new BadRequestException('Mã voucher đã tồn tại');
      throw e;
    } finally {
      await c.end();
    }
  }
  async preview(uid: string, b: Record<string, unknown>) {
    await this.admin.kiemTraTrang(uid, 'dat-phong|lich');
    const c = await this.db();
    try {
      const branch = (
        await c.query('SELECT homestay_id FROM public.phong WHERE id=$1', [
          maId(b.phong_id),
        ])
      ).rows[0]?.homestay_id;
      if (!branch) throw new BadRequestException('Không tìm thấy phòng');
      const v = await traVoucher(c, b.ma_voucher, branch, Number(b.tong_tien), b.dat_phong_id?maId(b.dat_phong_id):undefined);
      return { tien_giam: v?.tien_giam || 0 };
    } finally {
      await c.end();
    }
  }
  async send(uid: string, id: string, b: Record<string, unknown>) {
    await this.admin.kiemTraTrang(uid, 'goi-combo');
    maId(id);
    if (
      !Array.isArray(b.khach_ids) ||
      !b.khach_ids.length ||
      b.khach_ids.length > 100
    )
      throw new BadRequestException('Chọn từ 1 đến 100 khách đã có tài khoản');
    const ids = [...new Set(b.khach_ids.map(maId))];
    const c = await this.db();
    try {
      await c.query('BEGIN');
      const v = (
        await c.query(
          "SELECT * FROM public.khuyen_mai WHERE id=$1 AND trang_thai='Đang hoạt động' AND ket_thuc>now()",
          [id],
        )
      ).rows[0];
      if (!v) throw new BadRequestException('Voucher không còn hoạt động');
      const r = await c.query(
        "INSERT INTO public.thong_bao(nguoi_dung_id,tieu_de,noi_dung,loai,du_lieu) SELECT n.id,$2,$3,'Voucher',$4::jsonb FROM public.nguoi_dung n WHERE n.id=ANY($1::uuid[]) AND n.trang_thai='Đang hoạt động' AND NOT EXISTS(SELECT 1 FROM public.thong_bao t WHERE t.nguoi_dung_id=n.id AND t.loai='Voucher' AND t.du_lieu->>'voucher_id'=$5) RETURNING id",
        [
          ids,
          v.ten_khuyen_mai,
          'Mã ưu đãi: ' + v.ma_khuyen_mai,
          JSON.stringify({ voucher_id: id, ma_voucher: v.ma_khuyen_mai }),
          id,
        ],
      );
      await ghiNhatKy(c, uid, 'Gửi voucher', 'khuyen_mai', id, {
        so_khach: r.rowCount,
      });
      await c.query('COMMIT');
      return { da_gui: r.rowCount };
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      await c.end();
    }
  }
}

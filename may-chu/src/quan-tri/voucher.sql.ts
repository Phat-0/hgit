import { BadRequestException, ConflictException } from '@nestjs/common';
import type { Client } from 'pg';
export function tinhGiam(
  v: {
    loai_giam: string;
    gia_tri: unknown;
    giam_toi_da: unknown;
    don_toi_thieu: unknown;
  },
  total: number,
) {
  if (!Number.isSafeInteger(total) || total < 0 || total > 1e12)
    throw new BadRequestException('Tổng tiền không hợp lệ');
  if (total < Number(v.don_toi_thieu))
    throw new BadRequestException('Đơn chưa đạt giá trị tối thiểu của voucher');
  let cut =
    v.loai_giam === 'Phần trăm'
      ? Math.floor((total * Number(v.gia_tri)) / 100)
      : Number(v.gia_tri);
  if (v.giam_toi_da !== null) cut = Math.min(cut, Number(v.giam_toi_da));
  return Math.max(0, Math.min(total, Math.floor(cut)));
}
export async function traVoucher(
  c: Pick<Client, 'query'>,
  code: unknown,
  branch: string,
  total: number,
  order?: string,
  lock = false,
) {
  const ma = typeof code === 'string' ? code.trim().toUpperCase() : '';
  if (!ma) return null;
  if (!/^[A-Z0-9_-]{3,40}$/.test(ma))
    throw new BadRequestException('Mã voucher không hợp lệ');
  const r = await c.query(
    'SELECT * FROM public.khuyen_mai WHERE ma_khuyen_mai=$1' +
      (lock ? ' FOR UPDATE' : ''),
    [ma],
  );
  const v = r.rows[0];
  if (
    !v ||
    v.trang_thai !== 'Đang hoạt động' ||
    new Date(v.bat_dau) > new Date() ||
    new Date(v.ket_thuc) <= new Date() ||
    (v.homestay_id && v.homestay_id !== branch)
  )
    throw new BadRequestException('Voucher không áp dụng hoặc đã hết hạn');
  const used = await c.query(
    "SELECT count(*)::int n FROM public.su_dung_khuyen_mai s JOIN public.dat_phong d ON d.id=s.dat_phong_id WHERE s.khuyen_mai_id=$1 AND ($2::uuid IS NULL OR d.id<>$2) AND d.trang_thai NOT IN ('Đã hủy','Không nhận phòng') AND (d.trang_thai NOT IN ('Chờ xác nhận','Chờ thanh toán') OR d.het_han_giu_cho IS NULL OR d.het_han_giu_cho>now())",
    [v.id, order || null],
  );
  if (v.gioi_han_su_dung !== null && used.rows[0].n >= v.gioi_han_su_dung)
    throw new ConflictException('Voucher đã hết lượt');
  return { id: v.id, ma: v.ma_khuyen_mai, tien_giam: tinhGiam(v, total) };
}
export async function luuVoucher(
  c: Pick<Client, 'query'>,
  order: string,
  v: { id: string; tien_giam: number } | null,
) {
  if (v)
    await c.query(
      'INSERT INTO public.su_dung_khuyen_mai(dat_phong_id,khuyen_mai_id,so_tien_giam) VALUES($1,$2,$3) ON CONFLICT(dat_phong_id) DO UPDATE SET khuyen_mai_id=$2,so_tien_giam=$3',
      [order, v.id, v.tien_giam],
    );
  else
    await c.query(
      'DELETE FROM public.su_dung_khuyen_mai WHERE dat_phong_id=$1',
      [order],
    );
  await c.query(
    'UPDATE public.dat_phong SET tien_giam=$2,ngay_cap_nhat=now() WHERE id=$1',
    [order, v?.tien_giam || 0],
  );
}

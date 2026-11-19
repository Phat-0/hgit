import { createHash } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import type { Client } from 'pg';
const stable = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(stable)
    : v && typeof v === 'object'
      ? Object.fromEntries(
          Object.entries(v)
            .filter(([, x]) => x !== undefined)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, x]) => [k, stable(x)]),
        )
      : v;
export const bamNoiDung = (v: unknown) =>
  createHash('sha256')
    .update(JSON.stringify(stable(v)))
    .digest('hex');
export async function nhanKhoa(
  c: Pick<Client, 'query'>,
  uid: string | null,
  phone: string,
  key: string,
  body: unknown,
  operation = 'tao_dat_phong',
) {
  const scope = uid ? 'u:' + uid : 'g:' + bamNoiDung(phone),
    fingerprint = bamNoiDung(body);
  await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
    scope + ':' + operation + ':' + key,
  ]);
  const old = (
    await c.query(
      'SELECT * FROM public.khoa_chong_lap_yeu_cau WHERE pham_vi=$1 AND ten_nghiep_vu=$2 AND khoa_yeu_cau=$3 FOR UPDATE',
      [scope, operation, key],
    )
  ).rows[0];
  if (old) {
    if (old.ma_bam_noi_dung !== fingerprint)
      throw new ConflictException(
        'Khóa yêu cầu đã được dùng cho thông tin khác. Tạo yêu cầu mới khi đổi thông tin',
      );
    if (old.trang_thai === 'Hoàn thành')
      return { id: old.id, ket_qua: old.ket_qua };
    throw new ConflictException('Yêu cầu đang được xử lý. Vui lòng thử lại');
  }
  const row = (
    await c.query(
      "INSERT INTO public.khoa_chong_lap_yeu_cau(nguoi_dung_id,pham_vi,khoa_yeu_cau,ten_nghiep_vu,ma_bam_noi_dung,het_han_luc) VALUES($1,$2,$3,$4,$5,now()+interval '24 hours') RETURNING id",
      [uid, scope, key, operation, fingerprint],
    )
  ).rows[0];
  return { id: row.id, ket_qua: null };
}
export async function xongKhoa(
  c: Pick<Client, 'query'>,
  id: string,
  result: unknown,
) {
  await c.query(
    "UPDATE public.khoa_chong_lap_yeu_cau SET trang_thai='Hoàn thành',ket_qua=$2::jsonb WHERE id=$1",
    [id, JSON.stringify(result)],
  );
}

import { Client } from 'pg';
import { BadRequestException } from '@nestjs/common';
export async function moDb() {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true },
    connectionTimeoutMillis: 5000,
    query_timeout: 10000,
  });
  await c.connect();
  return c;
}
export const maId = (s: unknown) => {
  if (
    typeof s !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      s,
    )
  )
    throw new BadRequestException('Mã không hợp lệ');
  return s;
};
export const chu = (s: unknown, min = 0, max = 1000) => {
  if (typeof s !== 'string' || s.trim().length < min || s.trim().length > max)
    throw new BadRequestException('Nội dung không hợp lệ');
  return s.trim();
};
export function ngay(s: unknown, fallback: string) {
  if (s === undefined || s === '') return fallback;
  const v = String(s);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
    !Number.isFinite(+new Date(v)) ||
    new Date(v).toISOString().slice(0, 10) !== v
  )
    throw new BadRequestException('Ngày không hợp lệ');
  return v;
}
export async function ghiNhatKy(
  c: Pick<Client, 'query'>,
  uid: string,
  action: string,
  table: string,
  id: string | null,
  change: unknown,
) {
  await c.query(
    'INSERT INTO public.nhat_ky_he_thong(nguoi_thuc_hien_id,hanh_dong,ten_bang,ban_ghi_id,du_lieu_thay_doi) VALUES($1,$2,$3,$4,$5::jsonb)',
    [uid, action, table, id, JSON.stringify(change)],
  );
}

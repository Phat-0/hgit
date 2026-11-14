import 'dotenv/config';
import { Client } from 'pg';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const version = '20261114123000_doi_tuong_bieu_do_thu_chi';
if (!process.env.DATABASE_URL) {
  console.error(
    'Thiếu DATABASE_URL trong may-chu/.env; chưa thay đổi database.',
  );
  process.exit(1);
}
// Nạp CA trực tiếp: NODE_EXTRA_CA_CERTS chỉ có tác dụng khi Node khởi động.
// Dùng cùng file CA với start-dev.mjs, đường dẫn độc lập thư mục terminal.
const caUrl = new URL('../certificates/supabase-ca.crt', import.meta.url);
let ca;
try {
  ca = await readFile(caUrl, 'utf8');
  console.log('[TLS] Đang dùng CA:', fileURLToPath(caUrl));
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
  console.warn(
    '[TLS] Chưa có certificates/supabase-ca.crt; dùng CA mặc định của Node.',
  );
}
const connectionUrl = new URL(process.env.DATABASE_URL);
// pg phân tích các tùy chọn SSL trong URL sau cấu hình Client. Không để URL
// ghi đè CA ở trên hoặc vô hiệu hóa kiểm tra chứng chỉ.
for (const key of [
  'ssl',
  'sslmode',
  'sslrootcert',
  'sslcert',
  'sslkey',
  'uselibpqcompat',
]) {
  if (connectionUrl.searchParams.has(key)) {
    console.error(
      'Hãy bỏ tham số ' +
        key +
        ' khỏi DATABASE_URL để migration dùng CA và xác minh TLS được cấu hình trong script. Chưa thay đổi database.',
    );
    process.exit(1);
  }
}
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
  connectionTimeoutMillis: 10000,
});
try {
  await client.connect();
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(20261114,1)');
  await client.query(
    'CREATE TABLE IF NOT EXISTS public.migrations_ung_dung(phien_ban text PRIMARY KEY,ngay_chay timestamptz NOT NULL DEFAULT now())',
  );
  await client.query(
    'ALTER TABLE public.migrations_ung_dung ENABLE ROW LEVEL SECURITY',
  );
  await client.query(
    'REVOKE ALL ON public.migrations_ung_dung FROM anon,authenticated',
  );
  const sql = await readFile(
    new URL(`../../co-so-du-lieu/migrations/${version}.sql`, import.meta.url),
    'utf8',
  );
  const done = await client.query(
    'SELECT 1 FROM public.migrations_ung_dung WHERE phien_ban=$1',
    [version],
  );
  if (!done.rowCount) {
    await client.query(sql);
    await client.query(
      'INSERT INTO public.migrations_ung_dung(phien_ban) VALUES($1) ON CONFLICT DO NOTHING',
      [version],
    );
  }
  await client.query('COMMIT');
  console.log('Đã đồng bộ nhóm so sánh biểu đồ thu chi theo tài khoản.');
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error(
    'Migration không hoàn tất, đã rollback:',
    error instanceof Error ? error.message : 'Lỗi database',
  );
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}

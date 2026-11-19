import 'dotenv/config';
import { Client } from 'pg';
import { readFile } from 'node:fs/promises';
const versions = ['20261119134739_don_chi_tiet_va_don_db'];
if (!process.env.DATABASE_URL) throw Error('Thiếu DATABASE_URL');
const url = new URL(process.env.DATABASE_URL);
if (
  ['ssl', 'sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'uselibpqcompat'].some(
    (k) => url.searchParams.has(k),
  )
)
  throw Error('Bỏ tùy chọn SSL trong URL để dùng cấu hình xác minh TLS');
let ca;
try {
  ca = await readFile(
    new URL('../certificates/supabase-ca.crt', import.meta.url),
    'utf8',
  );
} catch (e) {
  if (e.code !== 'ENOENT') throw e;
}
const c = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
  connectionTimeoutMillis: 10000,
});
try {
  await c.connect();
  await c.query('BEGIN');
  await c.query('SELECT pg_advisory_xact_lock(20261119,19)');
  for (const version of versions) {
    const sql = (
      await readFile(
        new URL(
          '../../co-so-du-lieu/migrations/' + version + '.sql',
          import.meta.url,
        ),
        'utf8',
      )
    )
      .replace(/^BEGIN;\s*/, '')
      .replace(/COMMIT;\s*$/, '');
    if (
      !(
        await c.query(
          'SELECT 1 FROM public.migrations_ung_dung WHERE phien_ban=$1',
          [version],
        )
      ).rowCount
    )
      await c.query(sql);
  }
  await c.query('COMMIT');
  console.log('Đã chuyển chi tiết đơn và dọn ba bảng không dùng');
} catch (e) {
  await c.query('ROLLBACK').catch(() => {});
  console.error('Chưa đồng bộ:', e.message);
  process.exitCode = 1;
} finally {
  await c.end().catch(() => {});
}

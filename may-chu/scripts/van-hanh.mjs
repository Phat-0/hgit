import 'dotenv/config';import{Client}from'pg';import{readFile}from'node:fs/promises';
const version='20261118205919_khach_hang_voucher_ve_sinh';
if(!process.env.DATABASE_URL)throw Error('Thiếu DATABASE_URL');
const url=new URL(process.env.DATABASE_URL);if(['ssl','sslmode','sslrootcert','sslcert','sslkey','uselibpqcompat'].some(k=>url.searchParams.has(k)))throw Error('Bỏ tùy chọn SSL trong URL để dùng cấu hình xác minh TLS');
let ca;try{ca=await readFile(new URL('../certificates/supabase-ca.crt',import.meta.url),'utf8')}catch(e){if(e.code!=='ENOENT')throw e}
const c=new Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true,...(ca?{ca}:{})},connectionTimeoutMillis:10000});
try{await c.connect();await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(20261119,19)');const sql=(await readFile(new URL('../../co-so-du-lieu/migrations/'+version+'.sql',import.meta.url),'utf8')).replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,'');await c.query(sql);await c.query('COMMIT');console.log('Đã đồng bộ hồ sơ khách và quyền vệ sinh');}catch(e){await c.query('ROLLBACK').catch(()=>{});console.error('Chưa đồng bộ:',e.message);process.exitCode=1}finally{await c.end().catch(()=>{})}

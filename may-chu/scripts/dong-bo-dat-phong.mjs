import 'dotenv/config';
import {Client} from 'pg';
import {readFile} from 'node:fs/promises';

const version='20261106-dong-bo-kieu-dat-va-ten-don';
if(!process.env.DATABASE_URL){
  console.error('Thiếu DATABASE_URL trong may-chu/.env; chưa thay đổi database.');
  process.exit(1);
}
const client=new Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true},connectionTimeoutMillis:10000});
try{
  await client.connect();
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(20261106,1)');
  await client.query(`CREATE TABLE IF NOT EXISTS public.migrations_ung_dung (
    phien_ban text PRIMARY KEY,ngay_chay timestamptz NOT NULL DEFAULT now()
  )`);
  await client.query('ALTER TABLE public.migrations_ung_dung ENABLE ROW LEVEL SECURITY');
  await client.query('REVOKE ALL ON public.migrations_ung_dung FROM anon,authenticated');
  const existing=await client.query('SELECT phien_ban FROM public.migrations_ung_dung WHERE phien_ban=$1',[version]);
  if(existing.rowCount){
    await client.query('COMMIT');
    console.log('Migration đã được áp dụng; không chạy lại.');
  }else{
    const totals=()=>client.query('SELECT count(*)::text AS so_don,COALESCE(sum(tien_phong),0)::text AS tien_phong,COALESCE(sum(tong_tien),0)::text AS tong_tien FROM public.dat_phong');
    // Giữ nguyên đơn và tổng tiền trong lúc đối chiếu trước/sau.
    await client.query('LOCK TABLE public.dat_phong IN SHARE ROW EXCLUSIVE MODE');
    const before=(await totals()).rows[0];
    const sql=await readFile(new URL(`../../co-so-du-lieu/migrations/${version}.sql`,import.meta.url),'utf8');
    await client.query(sql.replace(/^BEGIN;\s*$/m,'').replace(/^COMMIT;\s*$/m,''));
    const after=(await totals()).rows[0];
    if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('Số đơn hoặc tổng tiền thay đổi ngoài dự kiến');
    await client.query('INSERT INTO public.migrations_ung_dung(phien_ban) VALUES($1)',[version]);
    await client.query('COMMIT');
    console.log('Đã đồng bộ tên đơn, ba kiểu đặt, giá phòng và khung giờ. Số đơn/tổng tiền được giữ nguyên.');
  }
}catch(error){
  await client.query('ROLLBACK').catch(()=>{});
  console.error('Migration không hoàn tất, đã rollback:',error instanceof Error?error.message:'Lỗi database');
  process.exitCode=1;
}finally{await client.end().catch(()=>{});}

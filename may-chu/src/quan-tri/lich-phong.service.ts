import {BadRequestException,ConflictException,Injectable,NotFoundException} from '@nestjs/common';
import {Client} from 'pg';
import {QuanTriService} from './quan-tri.service.js';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
@Injectable()
export class LichPhongService{
 constructor(private readonly admin:QuanTriService){}
 private async db(){const c=new Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true},connectionTimeoutMillis:5000,query_timeout:8000});await c.connect();return c;}
 private validId(v:string){if(!UUID.test(v))throw new BadRequestException('ID không hợp lệ');}
 private dates(start:string,end:string){const a=new Date(start),b=new Date(end);if(!Number.isFinite(a.getTime())||!Number.isFinite(b.getTime())||a>=b||b.getTime()-a.getTime()>90*86400000)throw new BadRequestException('Khoảng thời gian không hợp lệ hoặc dài quá 90 ngày');return [a.toISOString(),b.toISOString()];}
 private failure(e:unknown):never{const code=(e as {code?:string})?.code;if(code==='23P01'||code==='23505'||code==='P0001')throw new ConflictException('Khoảng thời gian đã có khóa hoặc đơn đặt phòng');throw e;}
 async calendar(uid:string,branch:string,start:string,end:string){await this.admin.kiemTraQuanTri(uid);if(branch)this.validId(branch);const [a,b]=this.dates(start,end);const c=await this.db();try{
 const rooms=await c.query('SELECT p.id,p.ma_phong,p.ten_phong,p.homestay_id,h.ten_homestay,p.gia_moi_dem,p.gia_moi_gio,p.gia_moi_ngay,p.gia_phu_thu_gio FROM public.phong p JOIN public.homestay h ON h.id=p.homestay_id WHERE ($1::uuid IS NULL OR p.homestay_id=$1) ORDER BY h.ten_homestay,p.ma_phong',[branch||null]);
 const ids=rooms.rows.map(x=>x.id);if(!ids.length)return {phong:[],khoa:[],dat_phong:[],gia:[]};
 const [locks,bookings,prices]=await Promise.all([
 c.query("SELECT id,phong_id,bat_dau,ket_thuc,ly_do,loai_khoa,co_dinh FROM public.chan_lich_phong WHERE phong_id=ANY($1::uuid[]) AND bat_dau<$3 AND ket_thuc>$2 ORDER BY bat_dau",[ids,a,b]).catch(async e=>{if((e as {code?:string}).code==='42703')return c.query("SELECT id,phong_id,bat_dau,ket_thuc,ly_do,'gio'::text AS loai_khoa,false AS co_dinh FROM public.chan_lich_phong WHERE phong_id=ANY($1::uuid[]) AND bat_dau<$3 AND ket_thuc>$2 ORDER BY bat_dau",[ids,a,b]);throw e;}),
 c.query("SELECT d.id,d.phong_id,d.nhan_phong_luc AS bat_dau,d.tra_phong_luc AS ket_thuc,d.trang_thai,d.hinh_thuc_dat,d.ma_dat_phong,COALESCE(NULLIF(trim(n.ho_ten),''),d.ma_dat_phong) AS ten_khach FROM public.dat_phong d LEFT JOIN public.nguoi_dung n ON n.id=d.nguoi_dung_id WHERE d.phong_id=ANY($1::uuid[]) AND d.nhan_phong_luc<$3 AND d.tra_phong_luc>$2 AND d.trang_thai IN ('Chờ thanh toán','Chờ xác nhận','Đã xác nhận','Đã nhận phòng')",[ids,a,b]),
 c.query("SELECT id,phong_id,bat_dau,ket_thuc,loai_gia,gia,ten,thu_trong_tuan,phu_thu_gio FROM public.gia_lich_phong WHERE phong_id=ANY($1::uuid[]) AND bat_dau<$3 AND ket_thuc>$2",[ids,a,b]).catch(e=>{if((e as {code?:string}).code==='42P01')return {rows:[]};throw e;})]);
 return {phong:rooms.rows,khoa:locks.rows,dat_phong:bookings.rows,gia:prices.rows};
 }catch(e){const err=e as {code?:string;message?:string};if(err.code==='42P01'||err.code==='42703')throw new BadRequestException('Thiếu bảng hoặc cột lịch trong Supabase. Hãy chạy migrations: them-gia-phong.sql và lich-phong-quan-tri.sql. Chi tiết: '+(err.message||err.code));throw e;}finally{await c.end();}}
 async block(uid:string,body:unknown){await this.admin.kiemTraQuanTri(uid);const x=body as Record<string,unknown>|null;const room=String(x?.phong_id||''),kind=String(x?.loai_khoa||''),reason=String(x?.ly_do||'Khóa lịch từ quản trị').trim();this.validId(room);if(!['ngay','gio','qua-dem'].includes(kind)||reason.length>500||!reason)throw new BadRequestException('Thông tin khóa không hợp lệ');const [a,b]=this.dates(String(x?.bat_dau||''),String(x?.ket_thuc||''));if(kind==='ngay'&&(!a.endsWith('17:00:00.000Z')||((new Date(b).getTime()-new Date(a).getTime())%86400000!==0)))throw new BadRequestException('Khóa ngày phải bắt đầu lúc 00:00 Việt Nam và theo ngày tròn');const c=await this.db();try{const r=await c.query('INSERT INTO public.chan_lich_phong(phong_id,bat_dau,ket_thuc,ly_do,loai_khoa,co_dinh) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[room,a,b,reason,kind,kind==='ngay'&&x?.co_dinh===true]);return r.rows[0];}catch(e){this.failure(e);}finally{await c.end();}}
 async unblock(uid:string,id:string){await this.admin.kiemTraQuanTri(uid);this.validId(id);const c=await this.db();try{const r=await c.query('DELETE FROM public.chan_lich_phong WHERE id=$1 RETURNING id',[id]);if(!r.rowCount)throw new NotFoundException('Không tìm thấy khóa');return r.rows[0];}finally{await c.end();}}
 async price(uid:string,body:unknown){await this.admin.kiemTraQuanTri(uid);const x=body as Record<string,unknown>|null;const room=String(x?.phong_id||''),kind=String(x?.loai_gia||''),price=Number(x?.gia),extra=x?.phu_thu_gio==null?null:Number(x.phu_thu_gio);this.validId(room);if(!['ngay','gio','qua-dem'].includes(kind)||!Number.isSafeInteger(price)||price<0||(extra!==null&&(!Number.isSafeInteger(extra)||extra<0)))throw new BadRequestException('Giá không hợp lệ');const [a,b]=this.dates(String(x?.bat_dau||''),String(x?.ket_thuc||''));const c=await this.db();try{const r=await c.query('INSERT INTO public.gia_lich_phong(phong_id,bat_dau,ket_thuc,loai_gia,gia,phu_thu_gio) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[room,a,b,kind,price,extra]);return r.rows[0];}catch(e){this.failure(e);}finally{await c.end();}}
 async priceRule(uid:string,body:unknown){
  await this.admin.kiemTraQuanTri(uid);
  const x=body as Record<string,unknown>|null;
  const room=String(x?.phong_id||''),kind=String(x?.loai_gia||''),name=String(x?.ten||'').trim();
  const amount=Number(x?.gia),extra=x?.phu_thu_gio==null?null:Number(x.phu_thu_gio);
  const days=x?.thu_trong_tuan;
  this.validId(room);
  if(!['ngay','gio','qua-dem'].includes(kind)||!name||name.length>120||!Number.isSafeInteger(amount)||amount<0||amount>1000000000000||(extra!==null&&(!Number.isSafeInteger(extra)||extra<0||extra>1000000000000))||!Array.isArray(days)||!days.length||days.some(d=>!Number.isInteger(d)||d<0||d>6))throw new BadRequestException('Quy tắc giá không hợp lệ');
  const first=String(x?.bat_dau||''),last=String(x?.ket_thuc||'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(first)||!/^\d{4}-\d{2}-\d{2}$/.test(last))throw new BadRequestException('Ngày không hợp lệ');
  const start=new Date(first+'T00:00:00+07:00'),end=new Date(last+'T00:00:00+07:00');
  if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||start>end||(end.getTime()-start.getTime())/86400000>90)throw new BadRequestException('Khoảng áp dụng phải từ 1 đến 91 ngày');
  const c=await this.db();try{
   await c.query('BEGIN');
   const inserted=[];
   for(let t=start.getTime();t<=end.getTime();t+=86400000){
    const d=new Date(t),weekday=new Date(t+7*3600000).getUTCDay();
    if(!days.includes(weekday))continue;
    const a=d.toISOString(),b=new Date(t+86400000).toISOString();
    const r=await c.query('INSERT INTO public.gia_lich_phong(phong_id,bat_dau,ket_thuc,loai_gia,gia,ten,thu_trong_tuan,phu_thu_gio) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id',[room,a,b,kind,amount,name,days,extra]);
    inserted.push(r.rows[0]);
   }
   if(!inserted.length)throw new BadRequestException('Không có ngày nào khớp thứ trong tuần');
   await c.query('COMMIT');return {so_ngay:inserted.length};
  }catch(e){await c.query('ROLLBACK');this.failure(e);}finally{await c.end();}
 }
 async deletePrice(uid:string,id:string){await this.admin.kiemTraQuanTri(uid);this.validId(id);const c=await this.db();try{const r=await c.query('DELETE FROM public.gia_lich_phong WHERE id=$1 RETURNING id',[id]);if(!r.rowCount)throw new NotFoundException('Không tìm thấy giá');return r.rows[0];}finally{await c.end();}}
 async updateBasePrices(uid:string,roomId:string,body:unknown){
  await this.admin.kiemTraQuanTri(uid);this.validId(roomId);
  const x=body as Record<string,unknown>|null;
  const keys=['gia_moi_gio','gia_moi_dem','gia_moi_ngay','gia_phu_thu_gio'] as const;
  const values=keys.map(k=>Number(x?.[k]));
  if(values.some(v=>!Number.isSafeInteger(v)||v<0||v>1000000000000))throw new BadRequestException('Giá phải là số nguyên không âm');
  const c=await this.db();try{
   const r=await c.query('UPDATE public.phong SET gia_moi_gio=$2,gia_moi_dem=$3,gia_moi_ngay=$4,gia_phu_thu_gio=$5 WHERE id=$1 RETURNING id,gia_moi_gio,gia_moi_dem,gia_moi_ngay,gia_phu_thu_gio',[roomId,...values]);
   if(!r.rowCount)throw new NotFoundException('Không tìm thấy phòng');
   return r.rows[0];
  }finally{await c.end();}
 }

}

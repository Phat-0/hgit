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
 const rooms=await c.query('SELECT p.id,p.ma_phong,p.ten_phong,p.homestay_id,p.loai_phong_id,h.ten_homestay,p.gia_moi_dem,p.gia_moi_gio,p.gia_moi_ngay,p.gia_phu_thu_gio FROM public.phong p JOIN public.homestay h ON h.id=p.homestay_id WHERE ($1::uuid IS NULL OR p.homestay_id=$1) ORDER BY h.ten_homestay,p.ma_phong',[branch||null]);
 const ids=rooms.rows.map(x=>x.id);if(!ids.length)return {phong:[],khoa:[],dat_phong:[],gia:[]};
 const [locks,bookings,prices]=await (async()=>{
 const locks=await c.query("SELECT id,phong_id,bat_dau,ket_thuc,ly_do,loai_khoa,co_dinh,ghi_chu FROM public.chan_lich_phong WHERE phong_id=ANY($1::uuid[]) AND bat_dau<$3 AND ket_thuc>$2 ORDER BY bat_dau",[ids,a,b]).catch(async e=>{if((e as {code?:string}).code==='42703')return c.query("SELECT id,phong_id,bat_dau,ket_thuc,ly_do,'gio'::text AS loai_khoa,false AS co_dinh,NULL::text AS ghi_chu FROM public.chan_lich_phong WHERE phong_id=ANY($1::uuid[]) AND bat_dau<$3 AND ket_thuc>$2 ORDER BY bat_dau",[ids,a,b]);throw e;});
 const bookings=await c.query("SELECT d.id,d.phong_id,d.nhan_phong_luc AS bat_dau,d.tra_phong_luc AS ket_thuc,d.trang_thai,d.hinh_thuc_dat,d.ma_dat_phong,COALESCE(NULLIF(trim(n.ho_ten),''),d.ma_dat_phong) AS ten_khach FROM public.dat_phong d LEFT JOIN public.nguoi_dung n ON n.id=d.nguoi_dung_id WHERE d.phong_id=ANY($1::uuid[]) AND d.nhan_phong_luc<$3 AND d.tra_phong_luc>$2 AND d.trang_thai IN ('Chờ thanh toán','Chờ xác nhận','Đã xác nhận','Đã nhận phòng')",[ids,a,b]);
 const prices=await c.query("SELECT id,phong_id,loai_gia,bat_dau,ket_thuc,gia,phu_thu_gio,ten,thu_trong_tuan,ngay_tao FROM public.gia_lich_phong WHERE phong_id=ANY($1::uuid[]) AND bat_dau<$3 AND ket_thuc>$2 ORDER BY ngay_tao,id",[ids,a,b]);return [locks,bookings,prices] as const;})();
 return {phong:rooms.rows,khoa:locks.rows,dat_phong:bookings.rows,gia:prices.rows};
 }catch(e){const err=e as {code?:string;message?:string};if(err.code==='42P01'||err.code==='42703')throw new BadRequestException('Thiếu bảng hoặc cột lịch trong Supabase. Hãy chạy migrations: them-gia-phong.sql và lich-phong-quan-tri.sql. Chi tiết: '+(err.message||err.code));throw e;}finally{await c.end();}}
 async block(uid:string,body:unknown){await this.admin.kiemTraQuanTri(uid);const x=body as Record<string,unknown>|null;const room=String(x?.phong_id||''),kind=String(x?.loai_khoa||''),reason=String(x?.ly_do||'Khóa lịch từ quản trị').trim();this.validId(room);if(!['ngay','gio','qua-dem'].includes(kind)||reason.length>500||!reason)throw new BadRequestException('Thông tin khóa không hợp lệ');const [a,b]=this.dates(String(x?.bat_dau||''),String(x?.ket_thuc||''));if(new Date(a).getTime()<new Date(new Date(Date.now()+7*3600000).toISOString().slice(0,10)+'T00:00:00+07:00').getTime())throw new BadRequestException('Không được khóa ngày trong quá khứ');const note=String(x?.ghi_chu||'').trim();if(note.length>1000)throw new BadRequestException('Ghi chú quá dài');const c=await this.db();try{const r=await c.query('INSERT INTO public.chan_lich_phong(phong_id,bat_dau,ket_thuc,ly_do,loai_khoa,co_dinh,ghi_chu) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[room,a,b,reason,kind,kind==='ngay'&&x?.co_dinh===true,note]);return r.rows[0];}catch(e){this.failure(e);}finally{await c.end();}}
 async editBlock(uid:string,id:string,body:unknown){await this.admin.kiemTraQuanTri(uid);this.validId(id);const x=body as Record<string,unknown>|null;const room=String(x?.phong_id||''),kind=String(x?.loai_khoa||''),reason=String(x?.ly_do||'').trim(),note=String(x?.ghi_chu||'').trim();this.validId(room);if(!['ngay','gio','qua-dem'].includes(kind)||!reason||reason.length>500||note.length>1000)throw new BadRequestException('Dữ liệu khóa không hợp lệ');const [a,b]=this.dates(String(x?.bat_dau||''),String(x?.ket_thuc||''));const vnToday=new Date(Date.now()+7*3600000).toISOString().slice(0,10);if(a.slice(0,10)<vnToday&&new Date(a).getTime()<new Date(vnToday+'T00:00:00+07:00').getTime())throw new BadRequestException('Không được chọn ngày trong quá khứ');const c=await this.db();try{await c.query('BEGIN');const existing=await c.query('SELECT id FROM public.chan_lich_phong WHERE id=$1 FOR UPDATE',[id]);if(!existing.rowCount)throw new NotFoundException('Không tìm thấy lịch khóa');const booked=await c.query("SELECT id FROM public.dat_phong WHERE phong_id=$1 AND nhan_phong_luc<$3 AND tra_phong_luc>$2 AND trang_thai IN ('Chờ thanh toán','Chờ xác nhận','Đã xác nhận','Đã nhận phòng') LIMIT 1",[room,a,b]);const locked=await c.query('SELECT id FROM public.chan_lich_phong WHERE phong_id=$1 AND id<>$4 AND bat_dau<$3 AND ket_thuc>$2 LIMIT 1',[room,a,b,id]);if(booked.rowCount||locked.rowCount)throw new ConflictException('Phòng đã có lịch trong khoảng thời gian chọn');const result=await c.query('UPDATE public.chan_lich_phong SET phong_id=$2,bat_dau=$3,ket_thuc=$4,ly_do=$5,loai_khoa=$6,co_dinh=$7,ghi_chu=$8 WHERE id=$1 RETURNING *',[id,room,a,b,reason,kind,kind==='ngay',note]);await c.query('COMMIT');return result.rows[0];}catch(e){await c.query('ROLLBACK');this.failure(e);}finally{await c.end();}}
 async unblock(uid:string,id:string){await this.admin.kiemTraQuanTri(uid);this.validId(id);const c=await this.db();try{const r=await c.query('DELETE FROM public.chan_lich_phong WHERE id=$1 RETURNING id',[id]);if(!r.rowCount)throw new NotFoundException('Không tìm thấy khóa');return r.rows[0];}finally{await c.end();}}
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

 async saveScheduledPrice(uid:string,body:unknown){
  await this.admin.kiemTraQuanTri(uid);
  const x=body as Record<string,unknown>|null;
  const room=String(x?.phong_id||''),kind=String(x?.loai_gia||'');
  this.validId(room);
  if(!['ngay','gio','qua-dem'].includes(kind))throw new BadRequestException('Loại giá không hợp lệ');
  const [a,b]=this.dates(String(x?.bat_dau||''),String(x?.ket_thuc||''));
  const amount=Number(x?.gia),extra=x?.phu_thu_gio==null?null:Number(x.phu_thu_gio);
  if(!Number.isSafeInteger(amount)||amount<0||amount>1e12||(extra!==null&&(!Number.isSafeInteger(extra)||extra<0||extra>1e12)))throw new BadRequestException('Giá không hợp lệ');
  const days=x?.thu_trong_tuan;
  if(days!==undefined&&(!Array.isArray(days)||!days.length||days.some(d=>!Number.isInteger(d)||d<0||d>6)))throw new BadRequestException('Thứ áp dụng không hợp lệ');
  const name=String(x?.ten||'').trim();
  if(name.length>120)throw new BadRequestException('Tên lịch giá quá dài');
  const c=await this.db();
  try{
   const r=await c.query('INSERT INTO public.gia_lich_phong(phong_id,loai_gia,bat_dau,ket_thuc,gia,phu_thu_gio,ten,thu_trong_tuan) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[room,kind,a,b,amount,extra,name||null,days??null]);
   return r.rows[0];
  }catch(e){if((e as {code?:string}).code==='42P01')throw new BadRequestException('Thiếu bảng gia_lich_phong: hãy chạy migration lich-phong-quan-tri.sql trong Supabase');throw e;}finally{await c.end();}
 }
 async removeScheduledPrice(uid:string,id:string){
  await this.admin.kiemTraQuanTri(uid);this.validId(id);
  const c=await this.db();try{const r=await c.query('DELETE FROM public.gia_lich_phong WHERE id=$1 RETURNING id',[id]);if(!r.rowCount)throw new NotFoundException('Không tìm thấy lịch giá');return r.rows[0];}finally{await c.end();}
 }

}

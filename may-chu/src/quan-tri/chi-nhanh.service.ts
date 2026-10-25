import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Client } from 'pg';
import { QuanTriService } from './quan-tri.service.js';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATES=['Chờ duyệt','Đang hoạt động','Tạm ngưng','Ngừng kinh doanh'];
type Input={ten_homestay:string;mo_ta:string|null;dia_chi:string;tinh_thanh:string;phuong_xa:string|null;so_dien_tho:string|null;vi_do:number|null;kinh_do:number|null;trang_thai:string};
@Injectable()
export class ChiNhanhService{
 constructor(private readonly admin:QuanTriService){}
 private validateId(id:string){if(!UUID.test(id))throw new BadRequestException('Mã chi nhánh không hợp lệ');}
 private validate(raw:unknown):Input{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new BadRequestException('Dữ liệu không hợp lệ');
  const x=raw as Record<string,unknown>;
  const allowed=['ten_homestay','mo_ta','dia_chi','tinh_thanh','phuong_xa','so_dien_tho','vi_do','kinh_do','trang_thai'];
  if(Object.keys(x).some(k=>!allowed.includes(k)))throw new BadRequestException('Trường dữ liệu không được phép');
  const str=(k:string,min:number,max:number)=>{if(typeof x[k]!=='string')throw new BadRequestException(k+' không hợp lệ');const s=x[k].trim();if(s.length<min||s.length>max)throw new BadRequestException(k+' không hợp lệ');return s;};
  const opt=(k:string,max:number)=>{if(x[k]===undefined||x[k]===null||x[k]==='')return null;if(typeof x[k]!=='string'||x[k].trim().length>max)throw new BadRequestException(k+' không hợp lệ');return x[k].trim();};
  const num=(k:string,min:number,max:number)=>{if(x[k]===undefined||x[k]===null||x[k]==='')return null;if(typeof x[k]!=='number'||!Number.isFinite(x[k])||x[k]<min||x[k]>max)throw new BadRequestException(k+' không hợp lệ');return x[k];};
  const phone=opt('so_dien_tho',16);if(phone&&!/^\+?[0-9]{9,15}$/.test(phone))throw new BadRequestException('Số điện thoại không hợp lệ');
  const state=x.trang_thai??'Chờ duyệt';if(typeof state!=='string'||!STATES.includes(state))throw new BadRequestException('Trạng thái không hợp lệ');
  return {ten_homestay:str('ten_homestay',2,200),mo_ta:opt('mo_ta',5000),dia_chi:str('dia_chi',3,500),tinh_thanh:str('tinh_thanh',2,200),phuong_xa:opt('phuong_xa',200),so_dien_tho:phone,vi_do:num('vi_do',-90,90),kinh_do:num('kinh_do',-180,180),trang_thai:state};
 }
 private async db(){const c=new Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true},connectionTimeoutMillis:5000,query_timeout:8000});await c.connect();return c;}
 private dbError(e:unknown):never{if(e instanceof NotFoundException||e instanceof BadRequestException)throw e;if((e as {code?:string})?.code==='23503')throw new ConflictException('Chi nhánh đang có dữ liệu liên quan, không thể xóa');throw e;}
 async list(uid:string,tim='',state='',page=1,limit=10){
  await this.admin.kiemTraQuanTri(uid);
  if(tim.length>150||(state&&!STATES.includes(state))||!Number.isInteger(page)||page<1||page>100000||!Number.isInteger(limit)||limit<1||limit>100)throw new BadRequestException('Bộ lọc không hợp lệ');
  const c=await this.db();try{
   const where="WHERE (h.ten_homestay ILIKE $1 OR h.dia_chi ILIKE $1 OR h.tinh_thanh ILIKE $1) AND ($2::text IS NULL OR h.trang_thai=$2)";
   const p=['%'+tim.trim()+'%',state||null];
   const count=await c.query('SELECT count(*)::int AS total FROM public.homestay h '+where,p);
   const rows=await c.query('SELECT h.*,(SELECT count(*)::int FROM public.phong p WHERE p.homestay_id=h.id) AS so_phong FROM public.homestay h '+where+' ORDER BY h.ngay_tao DESC,h.id LIMIT $3 OFFSET $4',[...p,limit,(page-1)*limit]);
   return {du_lieu:rows.rows,tong_so:count.rows[0].total,trang:page,gioi_han:limit};
  }finally{await c.end();}
 }
 async detail(uid:string,id:string){await this.admin.kiemTraQuanTri(uid);this.validateId(id);const c=await this.db();try{const r=await c.query('SELECT h.*,(SELECT count(*)::int FROM public.phong p WHERE p.homestay_id=h.id) AS so_phong FROM public.homestay h WHERE h.id=$1',[id]);if(!r.rowCount)throw new NotFoundException('Không tìm thấy chi nhánh');return r.rows[0];}finally{await c.end();}}
 async create(uid:string,body:unknown){await this.admin.kiemTraQuanTri(uid);const x=this.validate(body);const c=await this.db();try{const r=await c.query('INSERT INTO public.homestay(ten_homestay,mo_ta,dia_chi,tinh_thanh,phuong_xa,so_dien_tho,vi_do,kinh_do,trang_thai) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',Object.values(x));return r.rows[0];}catch(e){this.dbError(e);}finally{await c.end();}}
 async update(uid:string,id:string,body:unknown){await this.admin.kiemTraQuanTri(uid);this.validateId(id);const x=this.validate(body);const c=await this.db();try{const r=await c.query('UPDATE public.homestay SET ten_homestay=$2,mo_ta=$3,dia_chi=$4,tinh_thanh=$5,phuong_xa=$6,so_dien_tho=$7,vi_do=$8,kinh_do=$9,trang_thai=$10,ngay_cap_nhat=now() WHERE id=$1 RETURNING *',[id,...Object.values(x)]);if(!r.rowCount)throw new NotFoundException('Không tìm thấy chi nhánh');return r.rows[0];}catch(e){this.dbError(e);}finally{await c.end();}}
 async remove(uid:string,id:string){await this.admin.kiemTraQuanTri(uid);this.validateId(id);const c=await this.db();try{const r=await c.query('DELETE FROM public.homestay WHERE id=$1 RETURNING id',[id]);if(!r.rowCount)throw new NotFoundException('Không tìm thấy chi nhánh');return {thong_bao:'Đã xóa chi nhánh',id};}catch(e){this.dbError(e);}finally{await c.end();}}
}

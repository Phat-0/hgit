import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Client } from 'pg';
import { QuanTriService } from './quan-tri.service.js';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATES=['Trống','Đang sử dụng','Cần dọn','Đang dọn','Chờ kiểm tra','Bảo trì','Bị khóa'];
@Injectable()
export class PhongService {
 constructor(private readonly admin:QuanTriService){}
 private async db(){const c=new Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true},connectionTimeoutMillis:5000,query_timeout:8000});await c.connect();return c;}
 private id(v:string){if(!UUID.test(v))throw new BadRequestException('ID không hợp lệ');}
 private input(body:unknown){if(!body||typeof body!=='object'||Array.isArray(body))throw new BadRequestException('Dữ liệu không hợp lệ');const x=body as Record<string,unknown>;
  if(Object.keys(x).some(k=>!['homestay_id','loai_phong_id','ma_phong','ten_phong','tang','trang_thai_van_hanh'].includes(k)))throw new BadRequestException('Trường không hợp lệ');
  const homestay_id=String(x.homestay_id??''),loai_phong_id=String(x.loai_phong_id??'');this.id(homestay_id);this.id(loai_phong_id);
  const ma_phong=typeof x.ma_phong==='string'?x.ma_phong.trim():'',ten_phong=typeof x.ten_phong==='string'?x.ten_phong.trim():'';
  if(!ma_phong||ma_phong.length>50||!ten_phong||ten_phong.length>150)throw new BadRequestException('Mã hoặc tên phòng không hợp lệ');
  const tang=x.tang===null||x.tang===''||x.tang===undefined?null:Number(x.tang);
  if(tang!==null&&(!Number.isInteger(tang)||tang< -20||tang>300))throw new BadRequestException('Tầng không hợp lệ');
  const trang_thai_van_hanh=x.trang_thai_van_hanh??'Trống';
  if(typeof trang_thai_van_hanh!=='string'||!STATES.includes(trang_thai_van_hanh))throw new BadRequestException('Trạng thái không hợp lệ');
  return {homestay_id,loai_phong_id,ma_phong,ten_phong,tang,trang_thai_van_hanh};
 }
 async options(uid:string){await this.admin.kiemTraQuanTri(uid);const c=await this.db();try{const [h,l]=await Promise.all([c.query('SELECT id,ten_homestay FROM public.homestay ORDER BY ten_homestay'),c.query('SELECT id,homestay_id,ten_loai FROM public.loai_phong ORDER BY ten_loai')]);return {chi_nhanh:h.rows,loai_phong:l.rows};}finally{await c.end();}}
 async list(uid:string,tim='',homestay='',state='',page=1,limit=10){await this.admin.kiemTraQuanTri(uid);if(tim.length>150||(homestay&&!UUID.test(homestay))||(state&&!STATES.includes(state))||!Number.isInteger(page)||page<1||!Number.isInteger(limit)||limit<1||limit>100)throw new BadRequestException('Bộ lọc không hợp lệ');const c=await this.db();try{
 const where="WHERE (p.ma_phong ILIKE $1 OR p.ten_phong ILIKE $1 OR h.ten_homestay ILIKE $1) AND ($2::uuid IS NULL OR p.homestay_id=$2) AND ($3::text IS NULL OR p.trang_thai_van_hanh=$3)";
 const args=['%'+tim.trim()+'%',homestay||null,state||null];
 const count=await c.query('SELECT count(*)::int AS total FROM public.phong p JOIN public.homestay h ON h.id=p.homestay_id '+where,args);
 const rows=await c.query('SELECT p.*,h.ten_homestay,l.ten_loai FROM public.phong p JOIN public.homestay h ON h.id=p.homestay_id JOIN public.loai_phong l ON l.id=p.loai_phong_id '+where+' ORDER BY h.ten_homestay,p.ma_phong LIMIT $4 OFFSET $5',[...args,limit,(page-1)*limit]);
 return {du_lieu:rows.rows,tong_so:count.rows[0].total,trang:page,gioi_han:limit};
 }finally{await c.end();}}
 async detail(uid:string,id:string){await this.admin.kiemTraQuanTri(uid);this.id(id);const c=await this.db();try{const r=await c.query('SELECT p.*,h.ten_homestay,l.ten_loai FROM public.phong p JOIN public.homestay h ON h.id=p.homestay_id JOIN public.loai_phong l ON l.id=p.loai_phong_id WHERE p.id=$1',[id]);if(!r.rowCount)throw new NotFoundException('Không tìm thấy phòng');return r.rows[0];}finally{await c.end();}}
 private failure(e:unknown):never{const code=(e as {code?:string})?.code;if(code==='23505')throw new ConflictException('Mã phòng đã tồn tại trong chi nhánh');if(code==='23503')throw new BadRequestException('Chi nhánh hoặc loại phòng không hợp lệ, hoặc phòng có dữ liệu liên quan');if(code==='23514')throw new BadRequestException('Dữ liệu không thỏa điều kiện');throw e;}
 async create(uid:string,body:unknown){await this.admin.kiemTraQuanTri(uid);const x=this.input(body),c=await this.db();try{const r=await c.query('INSERT INTO public.phong(homestay_id,loai_phong_id,ma_phong,ten_phong,tang,trang_thai_van_hanh) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',Object.values(x));return r.rows[0];}catch(e){this.failure(e);}finally{await c.end();}}
 async update(uid:string,id:string,body:unknown){await this.admin.kiemTraQuanTri(uid);this.id(id);const x=this.input(body),c=await this.db();try{const r=await c.query('UPDATE public.phong SET homestay_id=$2,loai_phong_id=$3,ma_phong=$4,ten_phong=$5,tang=$6,trang_thai_van_hanh=$7 WHERE id=$1 RETURNING *',[id,...Object.values(x)]);if(!r.rowCount)throw new NotFoundException('Không tìm thấy phòng');return r.rows[0];}catch(e){this.failure(e);}finally{await c.end();}}
 async images(uid:string,id:string){await this.admin.kiemTraQuanTri(uid);this.id(id);const c=await this.db();try{const r=await c.query('SELECT id,duong_dan,mo_ta,la_anh_dai_dien,thu_tu FROM public.hinh_anh_phong WHERE phong_id=$1 ORDER BY thu_tu,id',[id]);return r.rows;}finally{await c.end();}}
 async addImage(uid:string,id:string,body:unknown){await this.admin.kiemTraQuanTri(uid);this.id(id);const x=body as {duong_dan?:unknown}|null;const url=x?.duong_dan;if(typeof url!=='string'||url.length>2048||!/^https:\/\/[^\s]+$/i.test(url))throw new BadRequestException('Cần đường dẫn ảnh HTTPS hợp lệ');const c=await this.db();try{const r=await c.query('INSERT INTO public.hinh_anh_phong(phong_id,duong_dan,thu_tu) VALUES($1,$2,(SELECT count(*)::int FROM public.hinh_anh_phong WHERE phong_id=$1)) RETURNING *',[id,url]);return r.rows[0];}catch(e){this.failure(e);}finally{await c.end();}}
 async deleteImage(uid:string,id:string,imageId:string){await this.admin.kiemTraQuanTri(uid);this.id(id);this.id(imageId);const c=await this.db();try{const r=await c.query('DELETE FROM public.hinh_anh_phong WHERE id=$1 AND phong_id=$2 RETURNING id',[imageId,id]);if(!r.rowCount)throw new NotFoundException('Không tìm thấy ảnh');return {id:imageId};}finally{await c.end();}}
 async remove(uid:string,id:string){await this.admin.kiemTraQuanTri(uid);this.id(id);const c=await this.db();try{const r=await c.query('DELETE FROM public.phong WHERE id=$1 RETURNING id',[id]);if(!r.rowCount)throw new NotFoundException('Không tìm thấy phòng');return {id};}catch(e){this.failure(e);}finally{await c.end();}}
}

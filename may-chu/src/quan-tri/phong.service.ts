import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { QuanTriService } from './quan-tri.service.js';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATES=['Trống','Đang sử dụng','Cần dọn','Đang dọn','Chờ kiểm tra','Bảo trì','Bị khóa'];
@Injectable()
export class PhongService {
 constructor(private readonly admin:QuanTriService){}
 private async db(){const c=new Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true},connectionTimeoutMillis:5000,query_timeout:8000});await c.connect();return c;}
 private storage(){const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!url||!key)throw new BadRequestException('Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY cho tải ảnh');return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}}).storage.from('anh-phong');}
 private id(v:string){if(!UUID.test(v))throw new BadRequestException('ID không hợp lệ');}
 private input(body:unknown){if(!body||typeof body!=='object'||Array.isArray(body))throw new BadRequestException('Dữ liệu không hợp lệ');const x=body as Record<string,unknown>;
  if(Object.keys(x).some(k=>!['homestay_id','loai_phong_id','ma_phong','ten_phong','tang','trang_thai_van_hanh','gia_moi_dem'].includes(k)))throw new BadRequestException('Trường không hợp lệ');
  const homestay_id=String(x.homestay_id??''),loai_phong_id=String(x.loai_phong_id??'');this.id(homestay_id);this.id(loai_phong_id);
  const ma_phong=typeof x.ma_phong==='string'?x.ma_phong.trim():'',ten_phong=typeof x.ten_phong==='string'?x.ten_phong.trim():'';
  if(!ma_phong||ma_phong.length>50||!ten_phong||ten_phong.length>150)throw new BadRequestException('Mã hoặc tên phòng không hợp lệ');
  const tang=x.tang===null||x.tang===''||x.tang===undefined?null:Number(x.tang);
  if(tang!==null&&(!Number.isInteger(tang)||tang< -20||tang>300))throw new BadRequestException('Tầng không hợp lệ');
  const trang_thai_van_hanh=x.trang_thai_van_hanh??'Trống';
  if(typeof trang_thai_van_hanh!=='string'||!STATES.includes(trang_thai_van_hanh))throw new BadRequestException('Trạng thái không hợp lệ');
  const gia_moi_dem=Number(x.gia_moi_dem??0);if(!Number.isSafeInteger(gia_moi_dem)||gia_moi_dem<0||gia_moi_dem>99999999999999)throw new BadRequestException('Giá mỗi đêm không hợp lệ');
  return {homestay_id,loai_phong_id,ma_phong,ten_phong,tang,trang_thai_van_hanh,gia_moi_dem};
 }
 async options(uid:string){await this.admin.kiemTraQuanTri(uid);const c=await this.db();try{const [h,l]=await Promise.all([c.query('SELECT id,ten_homestay FROM public.homestay ORDER BY ten_homestay'),c.query('SELECT id,homestay_id,ten_loai FROM public.loai_phong ORDER BY ten_loai')]);return {chi_nhanh:h.rows,loai_phong:l.rows};}finally{await c.end();}}
 async list(uid:string,tim='',homestay='',state='',page=1,limit=10){await this.admin.kiemTraQuanTri(uid);if(tim.length>150||(homestay&&!UUID.test(homestay))||(state&&!STATES.includes(state))||!Number.isInteger(page)||page<1||!Number.isInteger(limit)||limit<1||limit>100)throw new BadRequestException('Bộ lọc không hợp lệ');const c=await this.db();try{
 const where="WHERE (p.ma_phong ILIKE $1 OR p.ten_phong ILIKE $1 OR h.ten_homestay ILIKE $1) AND ($2::uuid IS NULL OR p.homestay_id=$2) AND ($3::text IS NULL OR p.trang_thai_van_hanh=$3)";
 const args=['%'+tim.trim()+'%',homestay||null,state||null];
 const count=await c.query('SELECT count(*)::int AS total FROM public.phong p JOIN public.homestay h ON h.id=p.homestay_id '+where,args);
 const rows=await c.query('SELECT p.*,h.ten_homestay,l.ten_loai,(SELECT a.duong_dan FROM public.hinh_anh_phong a WHERE a.phong_id=p.id ORDER BY a.la_anh_dai_dien DESC,a.thu_tu LIMIT 1) AS anh_dai_dien FROM public.phong p JOIN public.homestay h ON h.id=p.homestay_id JOIN public.loai_phong l ON l.id=p.loai_phong_id '+where+' ORDER BY h.ten_homestay,p.ma_phong LIMIT $4 OFFSET $5',[...args,limit,(page-1)*limit]);
 const storage=this.storage();const du_lieu=await Promise.all(rows.rows.map(async row=>{const path=row.anh_dai_dien;if(!path)return {...row,anh_dai_dien:null};if(!String(path).startsWith('storage://'))return row;const {data,error}=await storage.createSignedUrl(String(path).slice(10),3600);return {...row,anh_dai_dien:error?null:data.signedUrl};}));
 return {du_lieu,tong_so:count.rows[0].total,trang:page,gioi_han:limit};
 }finally{await c.end();}}
 async detail(uid:string,id:string){await this.admin.kiemTraQuanTri(uid);this.id(id);const c=await this.db();try{const r=await c.query('SELECT p.*,h.ten_homestay,l.ten_loai FROM public.phong p JOIN public.homestay h ON h.id=p.homestay_id JOIN public.loai_phong l ON l.id=p.loai_phong_id WHERE p.id=$1',[id]);if(!r.rowCount)throw new NotFoundException('Không tìm thấy phòng');return r.rows[0];}finally{await c.end();}}
 private failure(e:unknown):never{const code=(e as {code?:string})?.code;if(code==='23505')throw new ConflictException('Mã phòng đã tồn tại trong chi nhánh');if(code==='23503')throw new BadRequestException('Chi nhánh hoặc loại phòng không hợp lệ, hoặc phòng có dữ liệu liên quan');if(code==='23514')throw new BadRequestException('Dữ liệu không thỏa điều kiện');throw e;}
 async create(uid:string,body:unknown){await this.admin.kiemTraQuanTri(uid);const x=this.input(body),c=await this.db();try{const r=await c.query('INSERT INTO public.phong(homestay_id,loai_phong_id,ma_phong,ten_phong,tang,trang_thai_van_hanh,gia_moi_dem) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',Object.values(x));return r.rows[0];}catch(e){this.failure(e);}finally{await c.end();}}
 async update(uid:string,id:string,body:unknown){await this.admin.kiemTraQuanTri(uid);this.id(id);const x=this.input(body),c=await this.db();try{const r=await c.query('UPDATE public.phong SET homestay_id=$2,loai_phong_id=$3,ma_phong=$4,ten_phong=$5,tang=$6,trang_thai_van_hanh=$7,gia_moi_dem=$8 WHERE id=$1 RETURNING *',[id,...Object.values(x)]);if(!r.rowCount)throw new NotFoundException('Không tìm thấy phòng');return r.rows[0];}catch(e){this.failure(e);}finally{await c.end();}}
 async images(uid:string,id:string){await this.admin.kiemTraQuanTri(uid);this.id(id);const c=await this.db();try{const r=await c.query('SELECT id,duong_dan,mo_ta,la_anh_dai_dien,thu_tu FROM public.hinh_anh_phong WHERE phong_id=$1 ORDER BY thu_tu,id',[id]);const storage=this.storage();return await Promise.all(r.rows.map(async row=>{if(!row.duong_dan.startsWith('storage://'))return {...row,url:row.duong_dan};const key=row.duong_dan.slice(10);const {data,error}=await storage.createSignedUrl(key,3600);return {...row,url:error?null:data.signedUrl};}));}finally{await c.end();}}
 async uploadImage(uid:string,id:string,file:{buffer:Buffer;size:number;mimetype:string;originalname:string}){await this.admin.kiemTraQuanTri(uid);this.id(id);
  if(!file||!Buffer.isBuffer(file.buffer)||file.size<1||file.size>5*1024*1024)throw new BadRequestException('Ảnh tối đa 5 MB');
  const types:{[key:string]:string}={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};const ext=types[file.mimetype];if(!ext)throw new BadRequestException('Chỉ chấp nhận JPG, PNG hoặc WebP');
  const b=file.buffer;const jpg=b.length>3&&b[0]===255&&b[1]===216&&b[2]===255;const png=b.length>8&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));const webp=b.length>12&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP';if(!(ext==='jpg'&&jpg||ext==='png'&&png||ext==='webp'&&webp))throw new BadRequestException('Nội dung file không đúng định dạng ảnh');
  const c=await this.db();try{const exists=await c.query('SELECT id FROM public.phong WHERE id=$1',[id]);if(!exists.rowCount)throw new NotFoundException('Không tìm thấy phòng');
    const key=id+'/'+randomUUID()+'.'+ext;const storage=this.storage();const {error}=await storage.upload(key,b,{contentType:file.mimetype,upsert:false});if(error)throw new BadRequestException('Không tải được ảnh lên Storage: '+error.message);
    try{const r=await c.query("INSERT INTO public.hinh_anh_phong(phong_id,duong_dan,thu_tu,la_anh_dai_dien) VALUES($1,$2,(SELECT count(*)::int FROM public.hinh_anh_phong WHERE phong_id=$1),NOT EXISTS(SELECT 1 FROM public.hinh_anh_phong WHERE phong_id=$1)) RETURNING *",[id,'storage://'+key]);return r.rows[0];}catch(e){await storage.remove([key]);throw e;}
  }finally{await c.end();}
 }
 async setCover(uid:string,id:string,imageId:string){await this.admin.kiemTraQuanTri(uid);this.id(id);this.id(imageId);const c=await this.db();try{await c.query('BEGIN');const found=await c.query('SELECT id FROM public.hinh_anh_phong WHERE phong_id=$1 AND id=$2',[id,imageId]);if(!found.rowCount)throw new NotFoundException('Không tìm thấy ảnh');await c.query('UPDATE public.hinh_anh_phong SET la_anh_dai_dien=false WHERE phong_id=$1',[id]);await c.query('UPDATE public.hinh_anh_phong SET la_anh_dai_dien=true WHERE id=$1',[imageId]);await c.query('COMMIT');return {id:imageId};}catch(e){await c.query('ROLLBACK');throw e;}finally{await c.end();}}
 async deleteImage(uid:string,id:string,imageId:string){await this.admin.kiemTraQuanTri(uid);this.id(id);this.id(imageId);const c=await this.db();try{const r=await c.query('SELECT duong_dan FROM public.hinh_anh_phong WHERE id=$1 AND phong_id=$2',[imageId,id]);if(!r.rowCount)throw new NotFoundException('Không tìm thấy ảnh');const path=String(r.rows[0].duong_dan);if(path.startsWith('storage://')){const {error}=await this.storage().remove([path.slice(10)]);if(error)throw new BadRequestException('Không xóa được ảnh trên Storage: '+error.message);}await c.query('DELETE FROM public.hinh_anh_phong WHERE id=$1 AND phong_id=$2',[imageId,id]);return {id:imageId};}finally{await c.end();}}
 async remove(uid:string,id:string){await this.admin.kiemTraQuanTri(uid);this.id(id);const c=await this.db();try{const r=await c.query('DELETE FROM public.phong WHERE id=$1 RETURNING id',[id]);if(!r.rowCount)throw new NotFoundException('Không tìm thấy phòng');return {id};}catch(e){this.failure(e);}finally{await c.end();}}
}

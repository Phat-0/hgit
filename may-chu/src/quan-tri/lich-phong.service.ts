import {COMBO_THEO_PHONG} from './combo.input.js';
import {BO_LOC_DON,DON_CO_SO,nhanTrangThaiDon} from './danh-sach-don.sql.js';
import { randomUUID } from 'node:crypto';
import {kiemTraCauHinhGio,kiemTraThoiGianDat,type HinhThucDat} from './khung-gio.js';
import {BadRequestException,ConflictException,Injectable,NotFoundException,ServiceUnavailableException} from '@nestjs/common';
import {Client} from 'pg';
import {QuanTriService} from './quan-tri.service.js';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
@Injectable()
export class LichPhongService{
 constructor(private readonly admin:QuanTriService){}
 private async db(){const c=new Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true},connectionTimeoutMillis:5000,query_timeout:8000});await c.connect();return c;}
 private validId(v:string){if(!UUID.test(v))throw new BadRequestException('ID không hợp lệ');}
 private dates(start:string,end:string){const a=new Date(start),b=new Date(end);if(!Number.isFinite(a.getTime())||!Number.isFinite(b.getTime())||a>=b||b.getTime()-a.getTime()>90*86400000)throw new BadRequestException('Khoảng thời gian không hợp lệ hoặc dài quá 90 ngày');return [a.toISOString(),b.toISOString()];}
 private failure(e:unknown):never{const code=(e as {code?:string})?.code;if(code==='42P01'||code==='42703')throw new ServiceUnavailableException('Database chưa đồng bộ phiên bản mới. Trong thư mục may-chu, chạy npm.cmd run db:dong-bo-dat-phong và npm.cmd run db:dong-bo-combo, sau đó khởi động lại backend. Nếu migration báo lỗi, cần xử lý lỗi đó trước khi mở Lịch hoặc Đơn đặt phòng.');if(code==='23P01'||code==='23505'||code==='P0001')throw new ConflictException('Khoảng thời gian đã có khóa hoặc đơn đặt phòng');throw e;}
 async calendar(uid:string,branch:string,start:string,end:string){await this.admin.kiemTraQuanTri(uid);if(branch)this.validId(branch);const [a,b]=this.dates(start,end);const c=await this.db();try{
 const rooms=await c.query('SELECT p.id,p.ma_phong,p.ten_phong,p.homestay_id,p.loai_phong_id,h.ten_homestay,p.gia_moi_dem,p.gia_moi_gio,p.gia_moi_ngay,p.gia_phu_thu_gio,p.trang_thai_van_hanh FROM public.phong p JOIN public.homestay h ON h.id=p.homestay_id WHERE ($1::uuid IS NULL OR p.homestay_id=$1) ORDER BY h.ten_homestay,p.ma_phong',[branch||null]);
 const ids=rooms.rows.map(x=>x.id);if(!ids.length)return {phong:[],khoa:[],dat_phong:[],gia:[]};
 const [locks,bookings,prices]=await (async()=>{
 const locks=await c.query("SELECT id,phong_id,bat_dau,ket_thuc,ly_do,loai_khoa,co_dinh,ghi_chu,ten_khach,so_dien_thoai,gia_ghi_nhan FROM public.chan_lich_phong WHERE phong_id=ANY($1::uuid[]) AND bat_dau<$3 AND ket_thuc>$2 ORDER BY bat_dau",[ids,a,b]).catch(async e=>{if((e as {code?:string}).code==='42703')return c.query("SELECT id,phong_id,bat_dau,ket_thuc,ly_do,'gio'::text AS loai_khoa,false AS co_dinh,NULL::text AS ghi_chu,NULL::text AS ten_khach,NULL::text AS so_dien_thoai,NULL::numeric AS gia_ghi_nhan FROM public.chan_lich_phong WHERE phong_id=ANY($1::uuid[]) AND bat_dau<$3 AND ket_thuc>$2 ORDER BY bat_dau",[ids,a,b]);throw e;});
 const bookings=await c.query("SELECT d.id,d.phong_id,d.nhan_phong_luc AS bat_dau,d.tra_phong_luc AS ket_thuc,d.trang_thai,d.hinh_thuc_dat,d.ten_don,d.ma_dat_phong,COALESCE(NULLIF(NULLIF(trim(d.ten_don),d.ma_dat_phong),''),NULLIF(trim(n.ho_ten),''),d.ma_dat_phong) AS ten_khach FROM public.dat_phong d LEFT JOIN public.nguoi_dung n ON n.id=d.nguoi_dung_id WHERE d.phong_id=ANY($1::uuid[]) AND d.nhan_phong_luc<$3 AND d.tra_phong_luc>$2 AND d.trang_thai IN ('Chờ thanh toán','Chờ xác nhận','Đã xác nhận','Đã nhận phòng')",[ids,a,b]);
 const prices=await c.query("SELECT id,phong_id,loai_gia,bat_dau,ket_thuc,gia,phu_thu_gio,ten,thu_trong_tuan,ngay_tao,muc_uu_tien FROM public.gia_lich_phong WHERE phong_id=ANY($1::uuid[]) AND bat_dau<$3 AND ket_thuc>$2 ORDER BY muc_uu_tien,ngay_tao,id",[ids,a,b]);return [locks,bookings,prices] as const;})();
 return {phong:rooms.rows,khoa:locks.rows,dat_phong:bookings.rows,gia:prices.rows};
 }catch(e){this.failure(e);}finally{await c.end();}}
 async bookingList(uid:string,status:string,search:string){
  await this.admin.kiemTraQuanTri(uid);
  if(!Object.hasOwn(BO_LOC_DON,status)||search.length>150)throw new BadRequestException('Bộ lọc đơn không hợp lệ');
  const c=await this.db();try{
   const result=await c.query(DON_CO_SO+' SELECT * FROM ket_qua WHERE '+BO_LOC_DON[status]+' ORDER BY ngay_tao DESC,id DESC LIMIT 300',[search.trim()]);
   return result.rows.map(x=>({...x,anh:null,trang_thai_hien_thi:nhanTrangThaiDon(x)}));
  }catch(e){this.failure(e);}finally{await c.end();}
 }
 async bookingCounts(uid:string,search:string){
  await this.admin.kiemTraQuanTri(uid);if(search.length>150)throw new BadRequestException('Từ khóa tối đa 150 ký tự');
  const c=await this.db();try{
   const columns=Object.entries(BO_LOC_DON).map(([key,condition])=>`count(*) FILTER (WHERE ${condition})::int AS "${key||'Tất cả'}"`);
   const result=await c.query(DON_CO_SO+' SELECT '+columns.join(',')+' FROM ket_qua',[search.trim()]);return result.rows[0];
  }catch(e){this.failure(e);}finally{await c.end();}
 }
 async hourSettings(uid:string){
  await this.admin.kiemTraQuanTri(uid);const c=await this.db();
  try{const r=await c.query('SELECT khung_gio FROM public.cau_hinh_gio_dat_phong WHERE id=1');if(!r.rowCount)throw new BadRequestException('Chưa có thiết lập giờ trong DB');return kiemTraCauHinhGio(r.rows[0].khung_gio);}catch(e){this.failure(e);}finally{await c.end();}
 }
 async saveHourSettings(uid:string,body:unknown){
  await this.admin.kiemTraQuanTri(uid);const config=kiemTraCauHinhGio(body),c=await this.db();
  try{await c.query('UPDATE public.cau_hinh_gio_dat_phong SET khung_gio=$1::jsonb,ngay_cap_nhat=now() WHERE id=1',[JSON.stringify(config)]);return config;}catch(e){this.failure(e);}finally{await c.end();}
 }
 async bookingOptions(uid:string){
  await this.admin.kiemTraQuanTri(uid);const c=await this.db();try{
   const rooms=await c.query("SELECT p.*,h.ten_homestay,lp.ten_loai,lp.suc_chua FROM public.phong p JOIN public.homestay h ON h.id=p.homestay_id JOIN public.loai_phong lp ON lp.id=p.loai_phong_id WHERE h.trang_thai='Đang hoạt động' AND p.trang_thai_van_hanh NOT IN ('Bảo trì','Bị khóa') ORDER BY h.ten_homestay,p.ma_phong LIMIT 500");
   const combos=await c.query("SELECT co.id,co.homestay_id,co.ten_combo,co.gia_combo,co.so_gio_bao_gom,co.pham_vi,co.bat_dau,co.ket_thuc,ARRAY(SELECT homestay_id FROM public.combo_chi_nhanh WHERE combo_id=co.id) AS chi_nhanh_ids,ARRAY(SELECT phong_id FROM public.combo_phong WHERE combo_id=co.id) AS phong_ids FROM public.combo co WHERE co.trang_thai='Đang bán' ORDER BY co.ten_combo");
   const config=await c.query('SELECT khung_gio FROM public.cau_hinh_gio_dat_phong WHERE id=1');
   return {rooms:rooms.rows,combos:combos.rows,cau_hinh_gio:kiemTraCauHinhGio(config.rows[0]?.khung_gio)};
  }catch(e){this.failure(e);}finally{await c.end();}
 }
 async createBooking(uid:string,body:unknown){
  await this.admin.kiemTraQuanTri(uid);
  if(!body||typeof body!=='object'||Array.isArray(body))throw new BadRequestException('Dữ liệu không hợp lệ');
  const x=body as Record<string,unknown>;
  const guestName=x.ten_khach??x.ten_don;
  const name=typeof guestName==='string'?guestName.trim():'';
  if(!name||name.length>150)throw new BadRequestException('Tên khách hàng phải có từ 1 đến 150 ký tự');
  const kind=String(x.hinh_thuc_dat||'') as HinhThucDat;
  if(!['Theo giờ','Theo ngày','Theo đêm'].includes(kind))throw new BadRequestException('Chọn Theo giờ, Theo ngày hoặc Qua đêm');
  const room=String(x.phong_id||''),comboId=String(x.combo_id||''),phone=String(x.so_dien_thoai||'').replace(/[\s().-]/g,'');
  const start=new Date(String(x.nhan_phong_luc||'')),end=new Date(String(x.tra_phong_luc||'')),guests=Number(x.so_khach),amount=Number(x.tien_phong);
  this.validId(room);if(comboId)this.validId(comboId);
  if(!/^\+?[0-9]{9,15}$/.test(phone))throw new BadRequestException('Số điện thoại khách phải có từ 9 đến 15 chữ số');
  if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime()))throw new BadRequestException('Ngày hoặc giờ nhận/trả phòng không hợp lệ');
  if(start>=end)throw new BadRequestException('Thời gian trả phòng phải sau thời gian nhận phòng');
  if(start.getTime()<Date.now()-60000)throw new BadRequestException('Giờ nhận phòng đã qua. Vui lòng chọn giờ sắp tới hoặc ngày khác');
  if(end.getTime()-start.getTime()>31*86400000)throw new BadRequestException('Mỗi đơn chỉ được đặt tối đa 31 ngày');
  if(!Number.isInteger(guests)||guests<1||guests>100)throw new BadRequestException('Số khách phải là số nguyên từ 1 đến 100');
  if(!Number.isSafeInteger(amount)||amount<0||amount>1e12)throw new BadRequestException('Tiền phòng phải là số nguyên VND từ 0 đến 1.000.000.000.000');
  // Đơn được tạo tại API quản trị luôn xác nhận, không tin trạng thái từ client.
  const state='Đã xác nhận',payment=String(x.trang_thai_thanh_toan||'Chưa thanh toán');
  if(!['Chưa thanh toán','Cọc','Đủ'].includes(payment))throw new BadRequestException('Trạng thái thanh toán không hợp lệ');
  const c=await this.db();try{
   await c.query('BEGIN');
   const selected=await c.query('SELECT p.*,l.suc_chua,h.trang_thai AS trang_thai_chi_nhanh FROM public.phong p JOIN public.loai_phong l ON l.id=p.loai_phong_id JOIN public.homestay h ON h.id=p.homestay_id WHERE p.id=$1 FOR UPDATE OF p',[room]);
   if(!selected.rowCount)throw new BadRequestException('Không tìm thấy phòng');
   const o=selected.rows[0],flag=kind==='Theo giờ'?'cho_dat_theo_gio':kind==='Theo ngày'?'cho_dat_theo_ngay':'cho_dat_theo_dem';
   if(!o[flag]||o.trang_thai_chi_nhanh!=='Đang hoạt động'||['Bảo trì','Bị khóa'].includes(o.trang_thai_van_hanh))throw new BadRequestException('Phòng không nhận đặt theo hình thức này');
   if(guests>o.suc_chua)throw new BadRequestException('Số khách vượt sức chứa loại phòng');
   const config=await c.query('SELECT khung_gio FROM public.cau_hinh_gio_dat_phong WHERE id=1 FOR SHARE');
   const hours=kiemTraCauHinhGio(config.rows[0]?.khung_gio);
   kiemTraThoiGianDat(kind,start,end,hours,Number(o.so_gio_toi_thieu));
   if(comboId){const combo=await c.query(COMBO_THEO_PHONG+" AND co.trang_thai='Đang bán' AND (co.bat_dau IS NULL OR co.bat_dau<=$4) AND (co.ket_thuc IS NULL OR co.ket_thuc>=$5) AND (co.so_gio_bao_gom IS NULL OR $6='Theo giờ') FOR SHARE OF co",[comboId,o.homestay_id,room,start.toISOString(),end.toISOString(),kind]);if(!combo.rowCount)throw new BadRequestException('Combo không áp dụng cho phòng, kiểu đặt hoặc thời gian đã chọn');}
   const customer=await c.query('SELECT id FROM public.nguoi_dung WHERE so_dien_thoai=$1 LIMIT 1',[phone]);
   const code='DP'+randomUUID().replace(/-/g,'').toUpperCase();
   const snapshot={so_gio_toi_thieu:o.so_gio_toi_thieu,gia_moi_gio:o.gia_moi_gio,gia_moi_ngay:o.gia_moi_ngay,gia_moi_dem:o.gia_moi_dem,gia_phu_thu_gio:o.gia_phu_thu_gio,khung_gio:hours,tien_phong_chot:amount,nguoi_tao_id:uid};
   const r=await c.query(`INSERT INTO public.dat_phong(ma_dat_phong,ten_don,nguoi_dung_id,homestay_id,phong_id,hinh_thuc_dat,nhan_phong_luc,tra_phong_luc,so_khach,trang_thai,tien_phong,het_han_giu_cho,ghi_chu,so_dien_thoai_dat,nguon_dat,can_xac_nhan_lai,trang_thai_thanh_toan,combo_id,cau_hinh_gia_chot)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NULL,$12,$13,'quan_tri',false,$14,$15,$16::jsonb) RETURNING id,ma_dat_phong,ten_don,hinh_thuc_dat`,
    [code,name,customer.rows[0]?.id??null,o.homestay_id,room,kind,start.toISOString(),end.toISOString(),guests,state,amount,String(x.ghi_chu||'').slice(0,2000),phone,payment,comboId||null,JSON.stringify(snapshot)]);
   await c.query('UPDATE public.dat_phong SET xac_nhan_luc=now(),nguoi_xac_nhan_id=$1 WHERE id=$2',[uid,r.rows[0].id]);
   await c.query('COMMIT');return r.rows[0];
  }catch(e){await c.query('ROLLBACK');this.failure(e);}finally{await c.end();}
 }
 async updateBooking(uid:string,id:string,body:unknown){await this.admin.kiemTraQuanTri(uid);this.validId(id);const x=body as Record<string,unknown>|null;const action=String(x?.hanh_dong||'');if(!['xac_nhan','khach_den','nhan_phong','tra_phong','huy','thanh_toan','doi_sdt'].includes(action))throw new BadRequestException('Thao tác không hợp lệ');const c=await this.db();try{await c.query('BEGIN');const old=await c.query('SELECT * FROM public.dat_phong WHERE id=$1 FOR UPDATE',[id]);if(!old.rowCount)throw new BadRequestException('Không tìm thấy đơn');const d=old.rows[0];if(d.nguon_dat==='khach'&&d.trang_thai==='Chờ xác nhận'&&d.het_han_giu_cho&&new Date(d.het_han_giu_cho).getTime()<=Date.now()&&['xac_nhan','khach_den','nhan_phong'].includes(action))throw new ConflictException('Đơn khách đã hết thời gian giữ phòng');let field='',value:unknown=null;if(action==='doi_sdt'){const phone=String(x?.so_dien_thoai||'').replace(/[\s().-]/g,'');if(!/^\+?[0-9]{9,15}$/.test(phone))throw new BadRequestException('Số điện thoại không hợp lệ');field='so_dien_thoai_dat';value=phone;await c.query('UPDATE public.dat_phong SET nguoi_dung_id=NULL WHERE id=$1',[id]);}else if(action==='thanh_toan'){const payment=String(x?.trang_thai_thanh_toan||'');if(!['Đủ','Cọc','Chưa thanh toán'].includes(payment))throw new BadRequestException('Trạng thái thanh toán không hợp lệ');field='trang_thai_thanh_toan';value=payment;}else{const transitions:Record<string,string[]>={xac_nhan:['Chờ xác nhận'],khach_den:['Chờ xác nhận','Đã xác nhận'],nhan_phong:['Đã xác nhận'],tra_phong:['Đã nhận phòng'],huy:['Chờ xác nhận','Đã xác nhận','Chờ thanh toán']};if(action==='huy')throw new BadRequestException('Chưa cấu hình chính sách hủy và hoàn tiền; chưa thể hủy đơn an toàn');if(!transitions[action]?.includes(d.trang_thai))throw new BadRequestException('Trạng thái đơn không cho phép thao tác này');if(action==='khach_den'){field='khach_xac_nhan_den_luc';value=new Date().toISOString();}else{field='trang_thai';value=({xac_nhan:'Đã xác nhận',nhan_phong:'Đã nhận phòng',tra_phong:'Đã trả phòng',huy:'Đã hủy'} as Record<string,string>)[action];}}await c.query('UPDATE public.dat_phong SET '+field+'=$1,ngay_cap_nhat=now() WHERE id=$2',[value,id]);if(action==='xac_nhan')await c.query('UPDATE public.dat_phong SET can_xac_nhan_lai=false,xac_nhan_luc=now(),nguoi_xac_nhan_id=$1 WHERE id=$2',[uid,id]);if(action==='nhan_phong')await c.query('UPDATE public.dat_phong SET da_nhan_phong_luc=now() WHERE id=$1',[id]);if(action==='tra_phong')await c.query('UPDATE public.dat_phong SET da_tra_phong_luc=now() WHERE id=$1',[id]);await c.query('INSERT INTO public.nhat_ky_don_dat_phong(dat_phong_id,nguoi_thuc_hien_id,hanh_dong,du_lieu_cu,du_lieu_moi) VALUES($1,$2,$3,$4,$5)',[id,uid,action,JSON.stringify({[field]:d[field]}),JSON.stringify({[field]:value})]);await c.query('COMMIT');return {ok:true};}catch(e){await c.query('ROLLBACK');throw e;}finally{await c.end();}}
 async findGuest(uid:string,phone:string){await this.admin.kiemTraQuanTri(uid);const normalized=phone.replace(/[\s().-]/g,'');if(!/^\+?[0-9]{9,15}$/.test(normalized))throw new BadRequestException('Số điện thoại không hợp lệ');const c=await this.db();try{const r=await c.query('SELECT id,ho_ten,so_dien_thoai FROM public.nguoi_dung WHERE so_dien_thoai=$1 LIMIT 1',[normalized]);return r.rowCount?{found:true,guest:r.rows[0]}:{found:false};}finally{await c.end();}}
 async block(uid:string,body:unknown){await this.admin.kiemTraQuanTri(uid);const x=body as Record<string,unknown>|null;const room=String(x?.phong_id||''),kind=String(x?.loai_khoa||''),reason=String(x?.ly_do||'Khóa lịch từ quản trị').trim();this.validId(room);if(!['ngay','gio','qua-dem'].includes(kind)||reason.length>500||!reason)throw new BadRequestException('Thông tin khóa không hợp lệ');const [a,b]=this.dates(String(x?.bat_dau||''),String(x?.ket_thuc||''));if(new Date(a).getTime()<new Date(new Date(Date.now()+7*3600000).toISOString().slice(0,10)+'T00:00:00+07:00').getTime())throw new BadRequestException('Không được khóa ngày trong quá khứ');const note=String(x?.ghi_chu||'').trim(),guest=String(x?.ten_khach||'').trim(),phone=String(x?.so_dien_thoai||'').replace(/[\s().-]/g,''),amount=Number(String(x?.gia_ghi_nhan??0).replace(/\./g,''));if(guest.length>150||phone.length>20||(phone&&!/^\+?[0-9]{9,15}$/.test(phone))||!Number.isSafeInteger(amount)||amount<0||amount>1e12)throw new BadRequestException('Thông tin khách hoặc giá không hợp lệ');if(note.length>1000)throw new BadRequestException('Ghi chú quá dài');const c=await this.db();try{const r=await c.query('INSERT INTO public.chan_lich_phong(phong_id,bat_dau,ket_thuc,ly_do,loai_khoa,co_dinh,ghi_chu,ten_khach,so_dien_thoai,gia_ghi_nhan) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',[room,a,b,reason,kind,kind==='ngay'&&x?.co_dinh===true,note,guest,phone,amount]);return r.rows[0];}catch(e){this.failure(e);}finally{await c.end();}}
 async editBlock(uid:string,id:string,body:unknown){await this.admin.kiemTraQuanTri(uid);this.validId(id);const x=body as Record<string,unknown>|null;const room=String(x?.phong_id||''),kind=String(x?.loai_khoa||''),reason=String(x?.ly_do||'').trim(),note=String(x?.ghi_chu||'').trim(),guest=String(x?.ten_khach||'').trim(),phone=String(x?.so_dien_thoai||'').trim(),amount=Number(x?.gia_ghi_nhan??0);this.validId(room);if(guest.length>150||phone.length>20||(phone&&!/^[+0-9 .()-]{8,20}$/.test(phone))||!Number.isSafeInteger(amount)||amount<0||amount>1e12)throw new BadRequestException('Thông tin khách hoặc giá không hợp lệ');if(!['ngay','gio','qua-dem'].includes(kind)||!reason||reason.length>500||note.length>1000)throw new BadRequestException('Dữ liệu khóa không hợp lệ');const [a,b]=this.dates(String(x?.bat_dau||''),String(x?.ket_thuc||''));const vnToday=new Date(Date.now()+7*3600000).toISOString().slice(0,10);if(a.slice(0,10)<vnToday&&new Date(a).getTime()<new Date(vnToday+'T00:00:00+07:00').getTime())throw new BadRequestException('Không được chọn ngày trong quá khứ');const c=await this.db();try{await c.query('BEGIN');const existing=await c.query('SELECT id FROM public.chan_lich_phong WHERE id=$1 FOR UPDATE',[id]);if(!existing.rowCount)throw new NotFoundException('Không tìm thấy lịch khóa');const booked=await c.query("SELECT id FROM public.dat_phong WHERE phong_id=$1 AND nhan_phong_luc<$3 AND tra_phong_luc>$2 AND trang_thai IN ('Chờ thanh toán','Chờ xác nhận','Đã xác nhận','Đã nhận phòng') LIMIT 1",[room,a,b]);const locked=await c.query('SELECT id FROM public.chan_lich_phong WHERE phong_id=$1 AND id<>$4 AND bat_dau<$3 AND ket_thuc>$2 LIMIT 1',[room,a,b,id]);if(booked.rowCount||locked.rowCount)throw new ConflictException('Phòng đã có lịch trong khoảng thời gian chọn');const result=await c.query('UPDATE public.chan_lich_phong SET phong_id=$2,bat_dau=$3,ket_thuc=$4,ly_do=$5,loai_khoa=$6,co_dinh=$7,ghi_chu=$8,ten_khach=$9,so_dien_thoai=$10,gia_ghi_nhan=$11 WHERE id=$1 RETURNING *',[id,room,a,b,reason,kind,kind==='ngay',note,guest,phone,amount]);await c.query('COMMIT');return result.rows[0];}catch(e){await c.query('ROLLBACK');this.failure(e);}finally{await c.end();}}
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

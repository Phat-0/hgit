import {BadRequestException,ConflictException,Injectable,NotFoundException} from '@nestjs/common';
import {Client} from 'pg';
import {QuanTriService} from './quan-tri.service.js';
import {kiemTraCauHinhGio,kiemTraThoiGianDat,type HinhThucDat} from './khung-gio.js';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
@Injectable()
export class DonLichService{
 constructor(private readonly admin:QuanTriService){}
 private async db(){const c=new Client({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true},connectionTimeoutMillis:5000,query_timeout:8000});await c.connect();return c;}
 private id(value:string){if(!UUID.test(value))throw new BadRequestException('Mã đơn hoặc phòng không hợp lệ');}
 private failure(e:unknown):never{const code=(e as {code?:string}).code;if(code==='23514')throw new BadRequestException('Giá hoặc thông tin đơn không thỏa điều kiện dữ liệu');if(['23P01','P0001','40P01'].includes(code||''))throw new ConflictException('Phòng đã có lịch trùng hoặc đang được cập nhật. Hãy tải lại và chọn thời gian khác');throw e;}
 async detail(uid:string,id:string){
  await this.admin.kiemTraQuanTri(uid);this.id(id);const c=await this.db();try{
   const result=await c.query(`SELECT d.*,p.ten_phong,p.ma_phong,h.ten_homestay,
    COALESCE(n.ho_ten,'Khách chưa có tài khoản') AS ten_khach,
    COALESCE(d.so_dien_thoai_dat,n.so_dien_thoai) AS so_dien_thoai,
    co.ten_combo FROM public.dat_phong d JOIN public.phong p ON p.id=d.phong_id
    JOIN public.homestay h ON h.id=d.homestay_id LEFT JOIN public.nguoi_dung n ON n.id=d.nguoi_dung_id
    LEFT JOIN public.combo co ON co.id=d.combo_id WHERE d.id=$1`,[id]);
   if(!result.rowCount)throw new NotFoundException('Không tìm thấy đơn');return result.rows[0];
  }finally{await c.end();}
 }
 async edit(uid:string,id:string,body:unknown){
  await this.admin.kiemTraQuanTri(uid);this.id(id);
  if(!body||typeof body!=='object'||Array.isArray(body))throw new BadRequestException('Dữ liệu đơn không hợp lệ');
  const x=body as Record<string,unknown>,allowed=['ten_don','phong_id','hinh_thuc_dat','nhan_phong_luc','tra_phong_luc','so_khach','tien_phong','so_dien_thoai','ghi_chu'];
  if(Object.keys(x).some(k=>!allowed.includes(k)))throw new BadRequestException('Trường dữ liệu không được phép');
  const name=typeof x.ten_don==='string'?x.ten_don.trim():'',room=String(x.phong_id||''),kind=String(x.hinh_thuc_dat||'') as HinhThucDat;
  this.id(room);if(!name||name.length>150)throw new BadRequestException('Tên đơn phải có từ 1 đến 150 ký tự');
  if(!['Theo giờ','Theo ngày','Theo đêm'].includes(kind))throw new BadRequestException('Hình thức đặt không hợp lệ');
  const start=new Date(String(x.nhan_phong_luc||'')),end=new Date(String(x.tra_phong_luc||'')),guests=Number(x.so_khach),amount=Number(x.tien_phong);
  const phone=String(x.so_dien_thoai||'').replace(/[\s().-]/g,''),note=String(x.ghi_chu||'').trim();
  if(!/^\+?[0-9]{9,15}$/.test(phone))throw new BadRequestException('Số điện thoại phải có 9–15 chữ số');
  if(note.length>2000)throw new BadRequestException('Ghi chú tối đa 2.000 ký tự');
  if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||start>=end||end.getTime()-start.getTime()>31*86400000)throw new BadRequestException('Khoảng thời gian không hợp lệ hoặc dài quá 31 ngày');
  if(!Number.isSafeInteger(amount)||amount<0||amount>1e12||!Number.isInteger(guests)||guests<1||guests>100)throw new BadRequestException('Giá phòng hoặc số khách không hợp lệ');
  const c=await this.db();try{
   await c.query('BEGIN');
   const old=await c.query('SELECT * FROM public.dat_phong WHERE id=$1 FOR UPDATE',[id]);
   if(!old.rowCount)throw new NotFoundException('Không tìm thấy đơn');const d=old.rows[0];
   if(!['Chờ thanh toán','Chờ xác nhận','Đã xác nhận'].includes(d.trang_thai))throw new ConflictException('Chỉ chỉnh sửa đơn chưa nhận phòng và chưa hủy');
   const changedSchedule=room!==d.phong_id||kind!==d.hinh_thuc_dat||start.getTime()!==new Date(d.nhan_phong_luc).getTime()||end.getTime()!==new Date(d.tra_phong_luc).getTime();
   if(changedSchedule&&start.getTime()<Date.now()-60000)throw new BadRequestException('Không chuyển đơn sang giờ nhận phòng đã qua');
   const rooms=await c.query('SELECT p.*,l.suc_chua,h.trang_thai AS trang_thai_chi_nhanh FROM public.phong p JOIN public.loai_phong l ON l.id=p.loai_phong_id JOIN public.homestay h ON h.id=p.homestay_id WHERE p.id=$1 FOR UPDATE OF p',[room]);
   if(!rooms.rowCount)throw new BadRequestException('Không tìm thấy phòng');const p=rooms.rows[0];
   if(guests>p.suc_chua)throw new BadRequestException('Số khách vượt sức chứa phòng');
   let savedHours=d.cau_hinh_gia_chot?.khung_gio;
   if(changedSchedule){
    const flag=kind==='Theo giờ'?'cho_dat_theo_gio':kind==='Theo ngày'?'cho_dat_theo_ngay':'cho_dat_theo_dem';
    if(!p[flag]||p.trang_thai_chi_nhanh!=='Đang hoạt động'||['Bảo trì','Bị khóa'].includes(p.trang_thai_van_hanh))throw new BadRequestException('Phòng không nhận đặt theo hình thức này');
    const config=await c.query('SELECT khung_gio FROM public.cau_hinh_gio_dat_phong WHERE id=1 FOR SHARE');
    savedHours=kiemTraCauHinhGio(config.rows[0]?.khung_gio);
    kiemTraThoiGianDat(kind,start,end,savedHours,Number(p.so_gio_toi_thieu));
   }
   if(d.combo_id){const combo=await c.query('SELECT id FROM public.combo WHERE id=$1 AND homestay_id=$2',[d.combo_id,p.homestay_id]);if(!combo.rowCount)throw new BadRequestException('Combo của đơn không thuộc chi nhánh mới');}
   const paid=await c.query("SELECT COALESCE(sum(so_tien),0) AS tong FROM public.thanh_toan WHERE dat_phong_id=$1 AND trang_thai='Đã xác nhận'",[id]);
   if(amount+Number(d.tien_dich_vu)-Number(d.tien_giam)<Math.max(Number(d.tien_da_thanh_toan),Number(paid.rows[0]?.tong||0)))throw new ConflictException('Tổng tiền mới thấp hơn tiền đã thu; cần xử lý thanh toán trước');
   const snapshot={...d.cau_hinh_gia_chot,tien_phong_chot:amount,nguoi_sua_id:uid,gia_moi_gio:p.gia_moi_gio,gia_moi_ngay:p.gia_moi_ngay,gia_moi_dem:p.gia_moi_dem,so_gio_toi_thieu:p.so_gio_toi_thieu,gia_phu_thu_gio:p.gia_phu_thu_gio,khung_gio:savedHours};
   await c.query(`UPDATE public.dat_phong SET ten_don=$2,phong_id=$3,homestay_id=$4,hinh_thuc_dat=$5,
    nhan_phong_luc=$6,tra_phong_luc=$7,so_khach=$8,tien_phong=$9,so_dien_thoai_dat=$10,
    nguoi_dung_id=CASE WHEN so_dien_thoai_dat IS DISTINCT FROM $10 THEN NULL ELSE nguoi_dung_id END,
    ghi_chu=$11,cau_hinh_gia_chot=$12::jsonb,goi_gia_id=NULL,ngay_cap_nhat=now() WHERE id=$1`,
    [id,name,room,p.homestay_id,kind,start.toISOString(),end.toISOString(),guests,amount,phone,note,JSON.stringify(snapshot)]);
   await c.query('INSERT INTO public.nhat_ky_don_dat_phong(dat_phong_id,nguoi_thuc_hien_id,hanh_dong,du_lieu_cu,du_lieu_moi) VALUES($1,$2,$3,$4::jsonb,$5::jsonb)',[id,uid,'sua_tu_lich',JSON.stringify({ten_don:d.ten_don,phong_id:d.phong_id,nhan_phong_luc:d.nhan_phong_luc,tra_phong_luc:d.tra_phong_luc,tien_phong:d.tien_phong}),JSON.stringify(x)]);
   await c.query('COMMIT');return {ok:true};
  }catch(e){await c.query('ROLLBACK');this.failure(e);}finally{await c.end();}
 }
 async remove(uid:string,id:string){
  await this.admin.kiemTraQuanTri(uid);this.id(id);const c=await this.db();try{
   await c.query('BEGIN');const r=await c.query('SELECT trang_thai FROM public.dat_phong WHERE id=$1 FOR UPDATE',[id]);
   if(!r.rowCount)throw new NotFoundException('Không tìm thấy đơn');const state=r.rows[0].trang_thai;
   if(!['Chờ thanh toán','Chờ xác nhận','Đã xác nhận'].includes(state))throw new ConflictException('Không xóa khỏi lịch đơn đã nhận/trả phòng hoặc đã hủy');
   // Xóa khỏi lịch bằng trạng thái hủy: giải phóng lịch, giữ chứng từ/tiền và lịch sử.
   await c.query("UPDATE public.dat_phong SET trang_thai='Đã hủy',can_xac_nhan_lai=false,ngay_cap_nhat=now() WHERE id=$1",[id]);
   await c.query('INSERT INTO public.nhat_ky_don_dat_phong(dat_phong_id,nguoi_thuc_hien_id,hanh_dong,du_lieu_cu,du_lieu_moi) VALUES($1,$2,$3,$4::jsonb,$5::jsonb)',[id,uid,'xoa_khoi_lich',JSON.stringify({trang_thai:state}),JSON.stringify({trang_thai:'Đã hủy'})]);
   await c.query('COMMIT');return {ok:true,trang_thai:'Đã hủy'};
  }catch(e){await c.query('ROLLBACK');this.failure(e);}finally{await c.end();}
 }
}

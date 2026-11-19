import assert from 'node:assert/strict';
import{randomUUID}from'node:crypto';
import fs from'node:fs';
export async function kiemTraDemVaTaiKhoan({db,root,service,connection,admin,branch,type}){
 await db.exec(fs.readFileSync(root+'/co-so-du-lieu/migrations/20261119081407_dem_30_phut_dat_phong.sql','utf8'));
 await db.exec(fs.readFileSync(root+'/co-so-du-lieu/migrations/20261119082342_dem_sau_checkout.sql','utf8'));
 const room=randomUUID(),date=new Date(Date.now()+90*86400000).toISOString().slice(0,10);
 await db.query("INSERT INTO public.phong(id,homestay_id,loai_phong_id,ma_phong,ten_phong,gia_moi_gio,gia_moi_ngay,gia_moi_dem,gia_phu_thu_gio,so_gio_toi_thieu) VALUES($1,$2,$3,$4,'Phòng đệm',100000,400000,300000,50000,1)",[room,branch,type,'DEM-'+room.slice(0,6)]);
 const base={phong_id:room,hinh_thuc_dat:'Theo giờ',ten_khach:'Khách kiểm thử đệm',so_dien_thoai:'0901234567',so_khach:1};
 const q=(a,b)=>({...base,bat_dau:date+'T'+a+':00+07:00',ket_thuc:date+'T'+b+':00+07:00',khoa_yeu_cau:randomUUID()});
 // A past uncleaned stay must not hide all future dates.
 await db.query("INSERT INTO public.dat_phong(ma_dat_phong,ten_don,homestay_id,phong_id,hinh_thuc_dat,nhan_phong_luc,tra_phong_luc,so_khach,trang_thai,tien_phong) VALUES($1,'Kiểm thử',$2,$3,'Theo giờ',now()-interval '4 hours',now()-interval '2 hours',1,'Đã trả phòng',100000)",['PAST-'+room,branch,room]);
 assert.ok((await service.quote(q('14:00','16:00'))).tong_tien>0);
 const first=await service.create(q('14:00','16:00'));
 await assert.rejects(()=>service.quote(q('16:00','17:00')),/30 phút/);
 await assert.rejects(()=>service.create(q('13:00','14:00')),/30 phút/);
 const after=await service.create(q('16:30','17:30'));
 const before=await service.create(q('12:30','13:30'));
 assert.ok(after.ma_dat_phong&&before.ma_dat_phong);
 // Enforced even when bypassing API, including 29 minute gap and edits.
 for(const [a,b] of [['17:59','19:00'],['11:00','12:01']])await assert.rejects(()=>db.query("INSERT INTO public.dat_phong(ma_dat_phong,ten_don,homestay_id,phong_id,hinh_thuc_dat,nhan_phong_luc,tra_phong_luc,so_khach,trang_thai,tien_phong) VALUES($1,'Kiểm thử',$2,$3,'Theo giờ',$4,$5,1,'Đã xác nhận',100000)",[randomUUID(),branch,room,date+'T'+a+':00+07:00',date+'T'+b+':00+07:00']),e=>e.code==='23P01');
 await assert.rejects(()=>db.query("UPDATE public.dat_phong SET tra_phong_luc=$2 WHERE ma_dat_phong=$1",[first.ma_dat_phong,date+'T16:30:00+07:00']),e=>e.code==='23P01');
 await db.query("UPDATE public.dat_phong SET trang_thai='Đã hủy' WHERE ma_dat_phong=$1",[first.ma_dat_phong]);
 assert.ok((await service.create(q('14:00','16:00'))).ma_dat_phong);
 // No standalone locks to leak or double the gap.
 assert.equal((await db.query('SELECT count(*)::int n FROM public.chan_lich_phong WHERE phong_id=$1',[room])).rows[0].n,0);
 const now=new Date(),out=now.toISOString(),soon=new Date(+now+29*60000).toISOString(),later=new Date(+now+30*60000).toISOString(),finish=new Date(+now+90*60000).toISOString();
 await db.query("INSERT INTO public.dat_phong(ma_dat_phong,ten_don,homestay_id,phong_id,hinh_thuc_dat,nhan_phong_luc,tra_phong_luc,da_tra_phong_luc,so_khach,trang_thai,tien_phong) VALUES($1,'Vừa trả',$2,$3,'Theo giờ',$4,$5,$5,1,'Đã trả phòng',100000)",['DONE-'+room,branch,room,new Date(+now-3600000).toISOString(),out]);
 const c=await connection();assert.equal(await service.free(c,room,new Date(soon),new Date(finish)),false);assert.equal(await service.free(c,room,new Date(later),new Date(finish)),true);await c.end();
 const raw=(start)=>db.query("INSERT INTO public.dat_phong(ma_dat_phong,ten_don,homestay_id,phong_id,hinh_thuc_dat,nhan_phong_luc,tra_phong_luc,so_khach,trang_thai,tien_phong) VALUES($1,'Sau trả',$2,$3,'Theo giờ',$4,$5,1,'Đã xác nhận',100000)",[randomUUID(),branch,room,start,finish]);
 await assert.rejects(()=>raw(soon),e=>e.code==='23P01');await raw(later);
 const {KhachHangQuanTriService}=await import(root+'/may-chu/dist/quan-tri/khach-hang.service.js');
 const api=new KhachHangQuanTriService({kiemTraQuanTri:async uid=>{if(uid!==admin)throw Error('Không có quyền')}});
 api.db=connection;let authCalls=0,authPayload;
 api.auth=()=>({createUser:async x=>{authCalls++;authPayload=x;const id=randomUUID();await db.query('INSERT INTO auth.users(id) VALUES($1)',[id]);return {data:{user:{id}},error:null}},deleteUser:async()=>({error:null})});
 const payload={ten_khach:'Khách tài khoản',so_dien_thoai:'0981234567',email:'customer@example.invalid',mat_khau:'Test-only-password-123!',vai_tro:'Quản trị hệ thống'};
 await assert.rejects(()=>api.createAccount(randomUUID(),payload));assert.equal(authCalls,0);
 await assert.rejects(()=>api.createAccount(admin,{...payload,mat_khau:'short'}));assert.equal(authCalls,0);
 const account=await api.createAccount(admin,payload);assert.equal(authCalls,1);assert.equal(authPayload.email_confirm,true);assert.ok(!authPayload.phone_confirm);
 const roles=(await db.query('SELECT v.ma_vai_tro FROM public.nguoi_dung_vai_tro nv JOIN public.vai_tro v ON v.id=nv.vai_tro_id WHERE nv.nguoi_dung_id=$1',[account.id])).rows;
 assert.deepEqual(roles.map(x=>x.ma_vai_tro),['Khách hàng']);
 assert.ok((await api.list(admin,{})).khach.some(x=>x.khach_khoa===account.khach_khoa));
 await assert.rejects(()=>api.createAccount(admin,payload),/đã có tài khoản/);assert.equal(authCalls,1);
 const logs=await db.query('SELECT du_lieu_thay_doi FROM public.nhat_ky_he_thong WHERE ban_ghi_id=$1',[account.id]);assert.ok(!JSON.stringify(logs.rows).includes(payload.mat_khau));
 console.log('PASS đệm 30 phút: tương lai khi đang dọn, tìm/đặt/sửa/cancel, đúng 30 được, 29 bị chặn trực tiếp DB, không khóa rời; tạo tài khoản khách đúng quyền/không lộ mật khẩu/không xác minh SĐT giả.');
}

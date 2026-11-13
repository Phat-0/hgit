import {describe,it,expect} from 'vitest';
import {LichPhongService} from './lich-phong.service.js';
import type {QuanTriService} from './quan-tri.service.js';
import {GIO_MAC_DINH} from './khung-gio.js';
const room='00000000-0000-4000-8000-000000000001';
const day=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
const valid={ten_don:'Đơn admin',phong_id:room,hinh_thuc_dat:'Theo ngày',so_dien_thoai:'0901234567',nhan_phong_luc:day+'T14:00:00+07:00',tra_phong_luc:new Date(new Date(day+'T12:00:00+07:00').getTime()+86400000).toISOString(),so_khach:1,tien_phong:250000};
function setup(state="Trống"){
 const service=new LichPhongService({kiemTraTrang:async()=>({duoc_phep:true})} as unknown as QuanTriService);
 const calls:{sql:string;params:unknown[]}[]=[];
 Object.assign(service,{db:async()=>({end:async()=>{},query:async(sql:string,params:unknown[]=[])=>{calls.push({sql,params});if(sql.startsWith('SELECT p.*'))return {rowCount:1,rows:[{homestay_id:room,suc_chua:2,cho_dat_theo_ngay:true,trang_thai_chi_nhanh:'Đang hoạt động',trang_thai_van_hanh:state,so_gio_toi_thieu:1}]};if(sql.includes('SELECT khung_gio'))return {rows:[{khung_gio:GIO_MAC_DINH}]};if(sql.startsWith('INSERT INTO public.dat_phong'))return {rows:[{id:room}]};return {rowCount:0,rows:[]};}})});
 return {service,calls};
}
describe('Tạo đơn tại trang quản trị',()=>{
 it.each(['Đang dọn','Cần dọn','Đang sử dụng','Bảo trì','Bị khóa','Chờ kiểm tra'])('không tạo đơn khi phòng %s',async state=>{const {service}=setup(state);await expect(service.createBooking(room,valid)).rejects.toThrow('Chỉ đặt được đơn khi phòng trống')});
 it('luôn xác nhận dù client gửi Chờ xác nhận và lưu người xác nhận',async()=>{
  const {service,calls}=setup();await service.createBooking(room,{...valid,trang_thai:'Chờ xác nhận'});
  const insert=calls.find(x=>x.sql.startsWith('INSERT INTO public.dat_phong'))!;
  expect(insert.params[9]).toBe('Đã xác nhận');
  expect(calls.some(x=>x.sql.includes('xac_nhan_luc=now()')&&x.params[0]===room)).toBe(true);
 });
 it('nhận tên khách qua trường ten_khach, giữ tương thích dữ liệu tên cũ',async()=>{const {service,calls}=setup();await service.createBooking(room,{...valid,ten_khach:'Nguyễn Văn An'});const insert=calls.find(x=>x.sql.startsWith('INSERT INTO public.dat_phong'))!;expect(insert.params[1]).toBe('Nguyễn Văn An');});
 it.each([
  [{so_dien_thoai:'abc'},'Số điện thoại'],
  [{nhan_phong_luc:'khong-phai-ngay'},'Ngày hoặc giờ'],
  [{nhan_phong_luc:'2020-01-01T08:00:00+07:00',tra_phong_luc:'2020-01-01T10:00:00+07:00'},'Giờ nhận phòng đã qua'],
  [{so_khach:0},'Số khách'],
  [{tien_phong:-1},'Tiền phòng'],
 ])('chỉ rõ trường bị sai: %j',async(patch,message)=>{
  const {service,calls}=setup();await expect(service.createBooking(room,{...valid,...patch})).rejects.toThrow(message);expect(calls).toHaveLength(0);
 });
});

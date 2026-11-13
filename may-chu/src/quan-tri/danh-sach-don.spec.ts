import {describe,it,expect} from 'vitest';
import {BO_LOC_DON,nhanTrangThaiDon} from './danh-sach-don.sql.js';
import {LichPhongService} from './lich-phong.service.js';
import type {QuanTriService} from './quan-tri.service.js';
describe('Danh sách và số đơn trên tab',()=>{
 it('hiển thị trạng thái theo nghiệp vụ, không đổi giá trị lưu trong DB',()=>{
  expect(nhanTrangThaiDon({trang_thai:'Đã xác nhận'})).toBe('Chờ nhận phòng');
  expect(nhanTrangThaiDon({trang_thai:'Đã trả phòng'})).toBe('Hoàn thành');
  expect(nhanTrangThaiDon({trang_thai:'Đã xác nhận',khong_nhan_phong:true})).toBe('Không nhận phòng');
  expect(nhanTrangThaiDon({trang_thai:'Đã xác nhận',can_xac_nhan_lai:true})).toBe('Chờ xác nhận');
  expect(BO_LOC_DON['Đã xác nhận']).toContain('NOT can_xac_nhan_lai');
 });
 it('thống kê bằng DB trên toàn bộ dữ liệu thay vì số dòng đang hiển thị',async()=>{
  const service=new LichPhongService({kiemTraTrang:async()=>({duoc_phep:true})} as unknown as QuanTriService);
  let sql='',params:unknown[]=[];
  Object.assign(service,{db:async()=>({query:async(q:string,p:unknown[])=>{sql=q;params=p;return {rows:[{'Tất cả':325,'Đã xác nhận':200}]};},end:async()=>{}})});
  const result=await service.bookingCounts('uid','  Nguyễn  ');
  expect(result['Tất cả']).toBe(325);expect(params).toEqual(['Nguyễn']);
  expect(sql).toContain('count(*) FILTER');expect(sql).not.toContain('LIMIT 300');
 });
 it('từ chối bộ lọc lạ trước khi truy cập DB',async()=>{
  const service=new LichPhongService({kiemTraTrang:async()=>({duoc_phep:true})} as unknown as QuanTriService);
  Object.assign(service,{db:async()=>{throw Error('Không được truy cập DB');}});
  await expect(service.bookingList('uid','khong-hop-le','')).rejects.toThrow('Bộ lọc đơn không hợp lệ');
 });
});

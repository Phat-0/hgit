import {describe,it,expect} from 'vitest';
import {ConflictException} from '@nestjs/common';
import type {QuanTriService} from './quan-tri.service.js';
import {DonLichService} from './don-lich.service.js';
const id='00000000-0000-4000-8000-000000000001';
function service(state:string){
 const calls:{sql:string;args:unknown[]}[]=[];
 const s=new DonLichService({kiemTraQuanTri:async()=>({duoc_phep:true})} as unknown as QuanTriService);
 Object.assign(s,{db:async()=>({query:async(sql:string,args:unknown[]=[])=>{calls.push({sql,args});return sql.startsWith('SELECT trang_thai')?{rowCount:1,rows:[{trang_thai:state}]}:{rowCount:1,rows:[]};},end:async()=>{}})});
 return {s,calls};
}
describe('Xóa đơn từ lịch',()=>{
 it('giải phóng lịch bằng hủy, ghi người thực hiện và giữ chứng từ',async()=>{
  const {s,calls}=service('Đã xác nhận');await s.remove(id,id);
  expect(calls.some(c=>c.sql.includes("trang_thai='Đã hủy'"))).toBe(true);
  expect(calls.some(c=>c.sql.startsWith('INSERT INTO public.nhat_ky')&&c.args[1]===id)).toBe(true);
  expect(calls.some(c=>c.sql.startsWith('DELETE'))).toBe(false);
  expect(calls.at(-1)?.sql).toBe('COMMIT');
 });
 it.each(['Đã nhận phòng','Đã trả phòng','Đã hủy'])('không xóa đơn %s',async state=>{
  const {s,calls}=service(state);await expect(s.remove(id,id)).rejects.toBeInstanceOf(ConflictException);
  expect(calls.at(-1)?.sql).toBe('ROLLBACK');
  expect(calls.some(c=>c.sql.startsWith('UPDATE'))).toBe(false);
 });
 it('kiểm tra quyền trước khi truy cập đơn',async()=>{
  const s=new DonLichService({kiemTraQuanTri:async()=>{throw Error('Không có quyền');}} as unknown as QuanTriService);
  Object.assign(s,{db:async()=>{throw Error('Không được gọi DB');}});
  await expect(s.remove(id,id)).rejects.toThrow('Không có quyền');
 });
});

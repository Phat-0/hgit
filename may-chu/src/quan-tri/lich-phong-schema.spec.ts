import {describe,it,expect} from 'vitest';
import {ServiceUnavailableException} from '@nestjs/common';
import {LichPhongService} from './lich-phong.service.js';
import type {QuanTriService} from './quan-tri.service.js';

describe('Thiếu migration lịch và đơn đặt phòng',()=>{
 it.each(['42P01','42703'])('trả HTTP 503 và đúng lệnh migration cho lỗi %s',async code=>{
  const service=new LichPhongService({kiemTraQuanTri:async()=>({duoc_phep:true})} as unknown as QuanTriService);
  let closed=false;
  Object.assign(service,{db:async()=>({query:async()=>{throw Object.assign(new Error('schema chưa cập nhật'),{code});},end:async()=>{closed=true;}})});
  for(const run of [()=>service.hourSettings('uid'),()=>service.calendar('uid','','2026-11-06','2026-11-07'),()=>service.bookingOptions('uid'),()=>service.bookingList('uid','','')]){
   await expect(run()).rejects.toBeInstanceOf(ServiceUnavailableException);
   await expect(run()).rejects.toThrow('npm.cmd run db:dong-bo-dat-phong');
  }
  expect(closed).toBe(true);
 });
});

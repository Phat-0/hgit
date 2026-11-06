import {describe,it,expect} from 'vitest';
import {GIO_MAC_DINH,kiemTraCauHinhGio,kiemTraThoiGianDat} from './khung-gio.js';
const date=(s:string)=>new Date(s+'+07:00');
describe('Khung giờ đặt phòng dùng chung',()=>{
 it('chấp nhận đầy đủ cấu hình và từ chối giờ sai/bị thiếu',()=>{
  expect(kiemTraCauHinhGio(GIO_MAC_DINH)).toEqual(GIO_MAC_DINH);
  expect(()=>kiemTraCauHinhGio({...GIO_MAC_DINH,gio_tu:'25:00'})).toThrow();
  expect(()=>kiemTraCauHinhGio({...GIO_MAC_DINH,gio_tu:'08:15'})).toThrow();
  expect(()=>kiemTraCauHinhGio({gio_tu:'08:00'})).toThrow();
 });
 it.each([
  ['Theo giờ','2026-11-08T08:00:00','2026-11-08T10:00:00'],
  ['Theo ngày','2026-11-08T14:00:00','2026-11-09T12:00:00'],
  ['Theo ngày','2026-11-08T14:00:00','2026-11-11T12:00:00'],
  ['Theo đêm','2026-11-08T20:00:00','2026-11-09T08:00:00'],
 ] as const)('chấp nhận %s theo thiết lập', (kind,a,b)=>{
  expect(()=>kiemTraThoiGianDat(kind,date(a),date(b),GIO_MAC_DINH,2)).not.toThrow();
 });
 it('từ chối giờ tối thiểu, giờ ngoài khung, vượt qua giờ đóng cửa và giây lẻ',()=>{
  for(const [a,b] of [
   ['2026-11-08T08:00:00','2026-11-08T09:00:00'],
   ['2026-11-08T07:00:00','2026-11-08T10:00:00'],
   ['2026-11-08T20:00:00','2026-11-09T10:00:00'],
   ['2026-11-08T08:00:01','2026-11-08T10:00:00'],
  ])expect(()=>kiemTraThoiGianDat('Theo giờ',date(a),date(b),GIO_MAC_DINH,2)).toThrow();
 });
 it('từ chối khung cũ sau khi thiết lập thay đổi',()=>{
  expect(()=>kiemTraThoiGianDat('Theo ngày',date('2026-11-08T14:00:00'),date('2026-11-09T12:00:00'),{...GIO_MAC_DINH,ngay_tu:'15:00'},1)).toThrow();
 });
 it('hỗ trợ khung giờ hoạt động qua nửa đêm và khung 24 giờ',()=>{
  const config={...GIO_MAC_DINH,gio_tu:'20:00',gio_den:'08:00'};
  expect(()=>kiemTraThoiGianDat('Theo giờ',date('2026-11-08T23:00:00'),date('2026-11-09T02:00:00'),config,2)).not.toThrow();
  expect(()=>kiemTraThoiGianDat('Theo giờ',date('2026-11-09T02:00:00'),date('2026-11-09T05:00:00'),config,2)).not.toThrow();
  expect(()=>kiemTraThoiGianDat('Theo giờ',date('2026-11-08T23:00:00'),date('2026-11-09T09:00:00'),config,2)).toThrow();
  expect(()=>kiemTraThoiGianDat('Theo giờ',date('2026-11-08T08:00:00'),date('2026-11-09T08:00:00'),{...config,gio_den:'20:00'},2)).not.toThrow();
 });
});

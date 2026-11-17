import {describe,it,expect,vi} from 'vitest';
import {TrangKhachService} from './trang-khach.service.js';
describe('Nội dung giới thiệu public',()=>{
 it('tách khỏi lịch phòng trống và chỉ lấy đánh giá công khai, chi nhánh hoạt động',async()=>{
  const calls:string[]=[],end=vi.fn();const query=vi.fn(async(sql:string)=>{calls.push(sql);if(sql.includes('FROM public.phong p JOIN'))return {rows:[{id:'p',ten_phong:'Phòng thật',gia_moi_ngay:700000}]};if(sql.includes('FROM public.combo WHERE'))return {rows:[{id:'c',ten_combo:'Combo thật',gia_combo:100000,anh_combo:[],anh_dai_dien:null,ghi_chu_noi_bo:'Không công khai'}]};return {rows:[]};});
  const service=new TrangKhachService({db:async()=>({query,end})} as any);const result=await service.catalog();expect(result.phong[0].tien_phong).toBe(700000);expect(result.combo[0]).not.toHaveProperty('ghi_chu_noi_bo');expect(result.danh_gia).toEqual([]);expect(result.chi_nhanh).toEqual([]);
  expect(calls.find(s=>s.includes('FROM public.danh_gia'))).toContain("dg.trang_thai='Hiển thị'");expect(calls.find(s=>s.includes('FROM public.danh_gia'))).not.toMatch(/so_dien_tho|email|nguoi_dung_id AS/);expect(calls.find(s=>s.includes('FROM public.phong p JOIN'))).not.toContain("='Trống'");expect(calls.find(s=>s.includes('FROM public.homestay WHERE'))).toContain("trang_thai='Đang hoạt động'");expect(end).toHaveBeenCalledOnce();
 });
});

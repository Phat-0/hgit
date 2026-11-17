import {describe,it,expect,vi} from 'vitest';
import {TrangKhachService} from './trang-khach.service.js';
describe('Combo nổi bật cho khách',()=>{
  it('lọc thời gian, loại đặt, chi nhánh bằng tham số và chỉ trả trường public',async()=>{
    const query=vi.fn().mockResolvedValue({rows:[{id:'c',ten_combo:'Combo',gia_combo:150000,mo_ta:'Dịch vụ',so_gio_bao_gom:null,pham_vi:'toan_he_thong',chi_nhanh_ids:[],phong_ids:[],anh_combo:[],ghi_chu_noi_bo:'không công khai'}]}),end=vi.fn();
    const service=new TrangKhachService({db:async()=>({query,end}),id:(s:string)=>s} as any);
    const start=new Date(Date.now()+86400000),finish=new Date(+start+7200000);
    const rows=await service.featuredCombos({bat_dau:start.toISOString(),ket_thuc:finish.toISOString(),hinh_thuc_dat:'Theo giờ',chi_nhanh_id:'branch-id'});
    expect(query.mock.calls[0][1]).toEqual([start.toISOString(),finish.toISOString(),'Theo giờ','branch-id']);expect(query.mock.calls[0][0]).toContain("co.trang_thai='Đang bán'");expect(rows[0]).not.toHaveProperty('ghi_chu_noi_bo');expect(rows[0].anh).toEqual([]);expect(end).toHaveBeenCalledOnce();
  });
});

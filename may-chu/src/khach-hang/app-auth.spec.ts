import {it,expect,vi} from 'vitest';
import {TrangKhachService} from './trang-khach.service.js';
it('không cho tạo đơn app khi không có phiên đăng nhập hợp lệ',async()=>{
 const db=vi.fn();
 const service=new TrangKhachService({identity:vi.fn().mockResolvedValue(null),id:(s:string)=>s,db} as any);
 await expect(service.create({ten_khach:'Khách test',so_dien_thoai:'0901234567',so_khach:1,khoa_yeu_cau:'abc'},undefined,true)).rejects.toThrow();
 expect(db).not.toHaveBeenCalled();
});

import {describe,it,expect} from 'vitest';
import {tinhGiam} from './voucher.sql.js';
import {anBiMat} from './lich-su.service.js';
import {ngay} from './van-hanh.db.js';
import {khoaKhach} from './khach-hang.service.js';
describe('Voucher và lịch sử',()=>{
 it('chặn mức tối thiểu, giới hạn giảm và không âm tổng',()=>{expect(tinhGiam({loai_giam:'Phần trăm',gia_tri:25,giam_toi_da:30000,don_toi_thieu:100000},200000)).toBe(30000);expect(tinhGiam({loai_giam:'Số tiền',gia_tri:500000,giam_toi_da:null,don_toi_thieu:0},100000)).toBe(100000);expect(()=>tinhGiam({loai_giam:'Số tiền',gia_tri:10,giam_toi_da:null,don_toi_thieu:100},50)).toThrow();});
 it('không lộ token và mật khẩu trong lịch sử lồng nhau',()=>{expect(anBiMat({action:'sửa',sau:{access_token:'x',mat_khau:'y',ho_ten:'A'},items:[{api_key:'z'}]})).toEqual({action:'sửa',sau:{ho_ten:'A'},items:[{}]});});
 it('từ chối ngày không thật và khóa khách giả',()=>{expect(()=>ngay('2026-02-30','')).toThrow();expect(()=>ngay('2026-99-99','')).toThrow();expect(()=>khoaKhach("p:1' OR true")).toThrow();expect(khoaKhach('p:0901234567')).toBe('p:0901234567');});
});

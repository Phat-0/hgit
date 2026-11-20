import {describe,it,expect} from 'vitest';
import {docSoLuongCombo} from './so-luong-combo.js';
describe('Số lượng combo',()=>{
 it('giữ tương thích đơn cũ',()=>expect(docSoLuongCombo(undefined,['a'])).toEqual({a:1}));
 it('đọc số lượng theo combo',()=>expect(docSoLuongCombo({a:3},['a','b'])).toEqual({a:3,b:1}));
 it.each([0,-1,1.5,21,'2',null])('từ chối %s',n=>expect(()=>docSoLuongCombo({a:n},['a'])).toThrow());
 it('không nhận combo ngoài danh sách',()=>expect(()=>docSoLuongCombo({b:2},['a'])).toThrow());
});

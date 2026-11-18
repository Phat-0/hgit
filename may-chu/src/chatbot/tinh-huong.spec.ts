import {describe,it,expect} from 'vitest';
import {matchSituations,parseCondition} from './tinh-huong.js';
const row=(name:string,rule:unknown)=>({tieu_de:name,noi_dung:'Hướng dẫn',dieu_kien:rule});
describe('Chọn bộ trả lời theo câu hỏi và từ khóa',()=>{
 it('khớp cụm từ không phân biệt dấu và hoa/thường',()=>{expect(matchSituations([row('Giá',{tu_khoa:['giá phòng']})],'CHO MINH HOI GIA PHONG?')[0].row.tieu_de).toBe('Giá');});
 it('không khớp một đoạn nằm trong từ khác',()=>{expect(matchSituations([row('Hủy',{tu_khoa:['huy']})],'Khuyến mãi gì?')).toHaveLength(0);});
 it('đủ tất cả từ khóa mới chọn',()=>{const r=row('Đêm',{tu_khoa:['phòng','đêm'],kieu_khop:'tat_ca'});expect(matchSituations([r],'phòng trống')).toHaveLength(0);expect(matchSituations([r],'có phòng qua đêm không')).toHaveLength(1);});
 it('chọn khi khớp một từ khóa trong danh sách',()=>{expect(matchSituations([row('Giá',{tu_khoa:['giá phòng','phụ thu']})],'phụ thu thế nào?')).toHaveLength(1);});
 it('nhận câu hỏi mẫu và cách hỏi có thêm từ',()=>{const r=row('Giá',{cau_hoi_mau:['Phòng này bao nhiêu tiền?']});expect(matchSituations([r],'cho tôi hỏi phòng này bao nhiêu tiền với ạ')).toHaveLength(1);});
 it('không chọn câu mẫu quá khác chủ đề',()=>{expect(matchSituations([row('Giá',{cau_hoi_mau:['Phòng này bao nhiêu tiền?']})],'Chỗ gửi xe ở đâu')).toHaveLength(0);});
 it('ưu tiên số lớn, tối đa 3 tình huống',()=>{const rows=Array.from({length:5},(_,i)=>row(String(i),{tu_khoa:['phòng'],uu_tien:i}));expect(matchSituations(rows,'phòng').map(x=>x.row.tieu_de)).toEqual(['4','3','2']);});
 it('hướng dẫn chung chỉ làm fallback khi không có điều kiện khớp',()=>{const rows=[row('Chung',{}),row('Giá',{tu_khoa:['giá phòng']})];expect(matchSituations(rows,'giá phòng').map(x=>x.row.tieu_de)).toEqual(['Giá']);expect(matchSituations(rows,'xin chào')[0].row.tieu_de).toBe('Chung');});
 it('không tự chọn tình huống có điều kiện khác câu hỏi',()=>{expect(matchSituations([row('Giá',{tu_khoa:['giá phòng']})],'giờ nhận phòng')).toHaveLength(0);});
 it('từ chối điều kiện giả, quá dài và ưu tiên ngoài giới hạn',()=>{for(const x of [null,[],{uu_tien:101},{kieu_khop:'SQL'},{tu_khoa:['']},{tu_khoa:['a'.repeat(81)]},{cau_hoi_mau:Array(21).fill('phòng')},{sql:'DROP'}])expect(()=>parseCondition(x)).toThrow();});
 it('một nhóm có nhiều câu hỏi và chọn đúng câu trả lời riêng',()=>{
  const group=row('Nhận trả phòng',{cac_tra_loi:[{cau_hoi_mau:['Nhận phòng lúc nào?','Mấy giờ check in?'],tu_khoa:['nhận phòng'],tra_loi:'NHAN_PHONG'},{cau_hoi_mau:['Có trả phòng trễ không?'],tu_khoa:['trả muộn'],tra_loi:'TRA_MUON'}]});
  const a=matchSituations([group],'cho mình hỏi nhận phòng lúc nào');expect(a[0].row.noi_dung).toContain('NHAN_PHONG');expect(a[0].row.noi_dung).not.toContain('TRA_MUON');
  const b=matchSituations([group],'mình muốn trả muộn');expect(b[0].row.noi_dung).toContain('TRA_MUON');expect(b[0].row.noi_dung).not.toContain('NHAN_PHONG');
 });
 it('nhận cách nói liên quan chi phí/giá và check-in/nhận phòng',()=>{expect(matchSituations([row('Giá',{tu_khoa:['giá phòng']})],'chi phí phòng bao nhiêu')).toHaveLength(1);expect(matchSituations([row('Nhận',{tu_khoa:['nhận phòng']})],'check in thế nào')).toHaveLength(1);});
 it('không nhận mục trả lời riêng thiếu điều kiện, rỗng hoặc vượt số lượng',()=>{for(const x of [{cac_tra_loi:[{cau_hoi_mau:[],tu_khoa:[],tra_loi:'a'}]},{cac_tra_loi:[{tu_khoa:['a'],tra_loi:''}]},{cac_tra_loi:Array(11).fill({tu_khoa:['phòng'],tra_loi:'a'})}])expect(()=>parseCondition(x)).toThrow();});

 it('mục riêng đã khớp thay thế hướng dẫn cha trong cùng nhóm',()=>{const group=row('Giá',{cau_hoi_mau:['Giá phòng bao nhiêu?'],cac_tra_loi:[{cau_hoi_mau:['Giá phòng bao nhiêu?'],tu_khoa:['giá phòng'],tra_loi:'Tra báo giá cụ thể'}]});const result=matchSituations([group],'Giá phòng bao nhiêu?');expect(result).toHaveLength(1);expect(result[0].row.tieu_de).toContain('Cách trả lời 1');});

 it('cặp độc lập không trộn câu trả lời chính với cặp con',()=>{const group=row('Hỏi đáp',{hoi_dap_doc_lap:true,cac_tra_loi:[{cau_hoi_mau:['Giờ nhận phòng?'],tu_khoa:['nhận phòng'],tra_loi:'Chỉ câu trả lời nhận phòng'}]});group.noi_dung='Câu trả lời khác';const result=matchSituations([group],'nhận phòng');expect(result[0].row.noi_dung).toBe('Chỉ câu trả lời nhận phòng');});

});

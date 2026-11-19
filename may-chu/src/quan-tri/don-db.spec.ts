import { describe, it, expect } from 'vitest';
import { bamNoiDung } from './khoa-yeu-cau.sql.js';
import { moTaLichSu } from './lich-su.service.js';
describe('Khóa yêu cầu', () => {
  it('chuẩn hóa thứ tự khóa, giữ thứ tự danh sách và phát hiện thay đổi dữ liệu', () => {
    expect(bamNoiDung({ b: [1, 2], a: { y: 2, x: 1 } })).toBe(
      bamNoiDung({ a: { x: 1, y: 2 }, b: [1, 2] }),
    );
    expect(bamNoiDung({ b: [1, 2] })).not.toBe(bamNoiDung({ b: [2, 1] }));
  });
});
describe('Lịch sử rõ đối tượng', () => {
  it('giữ tên phòng sau xóa và diễn giải thay đổi', () => {
    const r = moTaLichSu({
      nhom: 'Hệ thống',
      hanh_dong: 'Xóa phòng',
      ten_bang: 'phong',
      doi_tuong_id: 'abc',
      du_lieu: {
        truoc: { ma_phong: 'P101', gia_moi_gio: 100000 },
        sau: {},
        token: 'không được lộ',
      },
    });
    expect(r.thao_tac).toBe('Xóa phòng');
    expect(r.doi_tuong).toBe('Phòng · P101');
    expect(r.du_lieu).not.toHaveProperty('token');
    expect(r.thay_doi).toContainEqual({
      truong: 'Giá giờ',
      truoc: 100000,
      sau: null,
      truoc_hien:'100.000 ₫',
      sau_hien:'—',
    });
  });
  it('diễn giải AI và trạng thái đơn thay vì mã nội bộ', () => {
    expect(
      moTaLichSu({
        nhom: 'AI',
        hanh_dong: 'xong',
        ten_bang: 'cuoc_tro_chuyen',
        ten_doi_tuong: 'Khách An',
      }).thao_tac,
    ).toBe('AI đã trả lời');
    const r = moTaLichSu({
      nhom: 'Trạng thái đơn',
      hanh_dong: 'Đã trả phòng',
      ten_bang: 'dat_phong',
      ten_doi_tuong: 'DP001',
      du_lieu: { truoc: 'Đã nhận phòng', sau: 'Đã trả phòng' },
    });
    expect(r.doi_tuong).toBe('Đơn · DP001');
    expect(r.thay_doi[0]).toEqual({
      truong: 'Trạng thái',
      truoc: 'Đã nhận phòng',
      sau: 'Đã trả phòng',
      truoc_hien:'Đã nhận phòng',
      sau_hien:'Đã trả phòng',
    });
  });
});

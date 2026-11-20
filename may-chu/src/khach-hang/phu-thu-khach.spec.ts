import { describe, it, expect } from 'vitest';
import { docGioPhuThu, tinhTienPhuThu } from './phu-thu-khach.js';
const start = new Date('2027-01-01T13:30:00+07:00'),
  end = new Date('2027-01-02T13:00:00+07:00');
describe('Giờ phụ thu ngày/đêm của khách', () => {
  it('tách lịch chuẩn, giữ nguyên khoảng thực tế cho kiểm tra trùng', () => {
    const r = docGioPhuThu(
      { gio_nhan_som: 1, gio_tra_muon: 1 },
      'Theo ngày',
      start,
      end,
    );
    expect(r.coreStart.toISOString()).toBe('2027-01-01T07:30:00.000Z');
    expect(r.coreEnd.toISOString()).toBe('2027-01-02T05:00:00.000Z');
  });
  it.each([-1, 0.5, 0.25, 12.5, NaN, Infinity, '1', true])(
    'từ chối giờ phụ thu %s',
    (v) =>
      expect(() =>
        docGioPhuThu({ gio_nhan_som: v }, 'Theo đêm', start, end),
      ).toThrow(),
  );
  it('không áp dụng cho loại theo giờ', () =>
    expect(() =>
      docGioPhuThu({ gio_tra_muon: 1 }, 'Theo giờ', start, end),
    ).toThrow());
  it('làm tròn tổng giờ lẻ một lần', () => {
    expect(tinhTienPhuThu(0.5, 0.5, 50000)).toBe(50000);
    expect(tinhTienPhuThu(0.5, 1, 50000)).toBe(100000);
  });
  it('không chấp nhận giá lỗi', () =>
    expect(() => tinhTienPhuThu(1, 0, 'abc')).toThrow());
});

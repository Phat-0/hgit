import { describe, it, expect } from 'vitest';
import { chuanHoaSoDienThoai, tinhGiaKhach } from './tien-phong.js';
const room = {
  so_gio_toi_thieu: 2,
  gia_moi_gio: 200000,
  gia_moi_ngay: 600000,
  gia_moi_dem: 400000,
  gia_phu_thu_gio: 50000,
};
const start = new Date('2027-01-01T08:00:00+07:00'),
  end = new Date('2027-01-01T11:00:00+07:00');
describe('Đặt phòng công khai', () => {
  it.each(['0901234567', '+84901234567', '84901234567', '090 123 4567'])(
    'chuẩn hóa %s trước đối chiếu quyền sở hữu',
    (v) => expect(chuanHoaSoDienThoai(v)).toBe('+84901234567'),
  );
  it.each(['', '012', 'abc', null])('từ chối số điện thoại %s', (v) =>
    expect(() => chuanHoaSoDienThoai(v)).toThrow(),
  );
  it('giá giờ đầu + phụ thu giờ', () =>
    expect(tinhGiaKhach(room, start, end, 'Theo giờ', [])).toBe(250000));
  it('combo giờ thay giá giờ đầu', () =>
    expect(
      tinhGiaKhach(room, start, end, 'Theo giờ', [], {
        gia_combo: 150000,
        so_gio_bao_gom: 2,
      }),
    ).toBe(200000));
  it('combo dịch vụ cộng vào giá phòng', () =>
    expect(
      tinhGiaKhach(room, start, end, 'Theo giờ', [], {
        gia_combo: 30000,
        so_gio_bao_gom: null,
      }),
    ).toBe(280000));
  it('áp dụng giá lịch và phụ thu có ưu tiên', () =>
    expect(
      tinhGiaKhach(room, start, end, 'Theo giờ', [
        {
          bat_dau: '2027-01-01T00:00:00+07:00',
          ket_thuc: '2027-01-02T00:00:00+07:00',
          loai_gia: 'gio',
          thu_trong_tuan: null,
          gia: 250000,
          phu_thu_gio: 70000,
        },
      ]),
    ).toBe(320000));
  it('không dùng giá lịch khác kiểu đặt', () =>
    expect(
      tinhGiaKhach(room, start, end, 'Theo giờ', [
        {
          bat_dau: '2027-01-01T00:00:00+07:00',
          ket_thuc: '2027-01-02T00:00:00+07:00',
          loai_gia: 'ngay',
          thu_trong_tuan: null,
          gia: 1,
          phu_thu_gio: 1,
        },
      ]),
    ).toBe(250000));
  it('hai đêm tính hai khung', () =>
    expect(
      tinhGiaKhach(
        room,
        new Date('2027-01-01T20:00+07:00'),
        new Date('2027-01-03T08:00+07:00'),
        'Theo đêm',
        [],
      ),
    ).toBe(800000));
});

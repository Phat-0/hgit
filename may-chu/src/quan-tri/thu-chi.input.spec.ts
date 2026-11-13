import { describe, it, expect } from 'vitest';
import { dongThuChi, ngayThuChi } from './thu-chi.input.js';
const valid = {
  ngay: '2026-11-13',
  ten: 'Mua vật tư',
  so_tien: 250000,
  loai: 'Chi',
};
describe('Sổ thu chi', () => {
  it('chọn Chi đưa về âm, chọn Thu đưa về dương', () => {
    expect(dongThuChi(valid).so_tien).toBe(-250000);
    expect(
      dongThuChi({ ...valid, loai: 'Thu', so_tien: -250000 }).so_tien,
    ).toBe(250000);
  });
  it.each([0, 1.5, NaN, Infinity, 1000000000001])('chặn số tiền sai %s', (n) =>
    expect(() => dongThuChi({ ...valid, so_tien: n })).toThrow(),
  );
  it.each(['2026-02-30', '2026-13-01', 'foo'])('chặn ngày sai %s', (d) =>
    expect(() => ngayThuChi(d)).toThrow(),
  );
  it('chặn màu CSS không hợp lệ', () =>
    expect(() => dongThuChi({ ...valid, mau: 'url(x)' })).toThrow());
});

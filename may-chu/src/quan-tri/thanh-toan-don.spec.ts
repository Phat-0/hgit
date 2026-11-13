import { describe, it, expect } from 'vitest';
import { soTienDaGhiNhan } from './thanh-toan-don.js';
describe('Tiền đã ghi nhận của đơn', () => {
  it('ghi đủ tổng khi chủ động chọn đã thanh toán', () =>
    expect(soTienDaGhiNhan('Đủ', undefined, 200000)).toBe(200000));
  it('nhận cọc hợp lệ', () =>
    expect(soTienDaGhiNhan('Cọc', 50000, 200000)).toBe(50000));
  it.each([
    ['Cọc', 0],
    ['Cọc', 200000],
    ['Cọc', undefined],
    ['Đủ', 100000],
    ['Chưa thanh toán', 1],
    ['Cọc', 1.5],
    ['Cọc', -1],
    ['Khác', 0],
  ])('từ chối trạng thái và số tiền không khớp %s/%s', (state, amount) =>
    expect(() => soTienDaGhiNhan(String(state), amount, 200000)).toThrow(),
  );
});

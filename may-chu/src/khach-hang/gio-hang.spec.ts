import { describe, it, expect, vi } from 'vitest';
import { TrangKhachService } from './trang-khach.service.js';
describe('Số đơn chưa hoàn thành của khách', () => {
  it('bắt buộc đăng nhập trước khi truy vấn', async () => {
    const db = vi.fn();
    const service = new TrangKhachService({
      identity: async () => null,
      db,
    } as any);
    await expect(service.cartCount()).rejects.toThrow();
    expect(db).not.toHaveBeenCalled();
  });
  it('chỉ đếm đơn thuộc tài khoản và loại trạng thái kết thúc, giữ chỗ hết hạn', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ so_don: 3 }] }),
      end = vi.fn();
    const service = new TrangKhachService({
      identity: async () => ({ id: 'khach-a' }),
      db: async () => ({ query, end }),
    } as any);
    expect(await service.cartCount('Bearer token')).toEqual({ so_don: 3 });
    expect(query.mock.calls[0][1]).toEqual(['khach-a']);
    const sql = query.mock.calls[0][0];
    expect(sql).toContain('nguoi_dung_id=$1');
    expect(sql).toContain("'Đã nhận phòng'");
    expect(sql).not.toContain("'Đã trả phòng'");
    expect(sql).toContain('het_han_giu_cho>now()');
    expect(sql).not.toContain('LIMIT');
    expect(end).toHaveBeenCalledOnce();
  });
  it('đóng kết nối cả khi truy vấn thất bại', async () => {
    const end = vi.fn();
    const service = new TrangKhachService({
      identity: async () => ({ id: 'khach-a' }),
      db: async () => ({
        query: async () => {
          throw Error('db');
        },
        end,
      }),
    } as any);
    await expect(service.cartCount('Bearer token')).rejects.toThrow('db');
    expect(end).toHaveBeenCalledOnce();
  });
});

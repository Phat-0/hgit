import { describe, it, expect } from 'vitest';
import { XacThucService } from '../xac-thuc/xac-thuc.service.js';
import { ChatService } from './chat.service.js';
import { TrangKhachService } from './trang-khach.service.js';
import type { KetNoiKhachService } from './ket-noi.service.js';
describe('Quyền khách công khai', () => {
  it('không tin phone_verified trong user_metadata', async () => {
    const service = Object.create(XacThucService.prototype) as XacThucService;
    Object.assign(service, {
      supabase: {
        auth: {
          getUser: async () => ({
            data: {
              user: {
                id: 'u',
                phone: '84901234567',
                phone_confirmed_at: null,
                user_metadata: { phone_verified: true },
              },
            },
            error: null,
          }),
        },
      },
    });
    expect((await service.xacMinhToken('jwt')).phone_verified).toBe(false);
  });
  it('chỉ tin thời điểm xác minh từ Supabase Auth', async () => {
    const service = Object.create(XacThucService.prototype) as XacThucService;
    Object.assign(service, {
      supabase: {
        auth: {
          getUser: async () => ({
            data: {
              user: {
                id: 'u',
                phone: '84901234567',
                phone_confirmed_at: '2026-01-01T00:00:00Z',
              },
            },
            error: null,
          }),
        },
      },
    });
    expect((await service.xacMinhToken('jwt')).phone_verified).toBe(true);
  });
  it('không trả lịch sử nếu chưa đăng nhập', async () => {
    const s = new TrangKhachService({
      identity: async () => null,
      db: () => {
        throw Error('Không được đọc DB');
      },
    } as unknown as KetNoiKhachService);
    await expect(s.history()).rejects.toThrow();
  });
  it('khách không được mở chat trực tiếp', async () => {
    const calls: string[] = [];
    const s = new ChatService({
      identity: async () => null,
      db: async () => ({
        query: async (sql: string) => {
          calls.push(sql);
          return { rows: [] };
        },
        end: async () => {},
      }),
    } as unknown as KetNoiKhachService);
    await expect(s.start({ nguoi_nhan_id: 'u' })).rejects.toThrow();
    expect(calls).toEqual(['BEGIN', 'ROLLBACK']);
  });
  it('tin nhắn rỗng bị chặn trước khi đọc hội thoại', async () => {
    const s = new ChatService({
      identity: async () => {
        throw Error('Không được gọi');
      },
    } as unknown as KetNoiKhachService);
    await expect(s.send('id', { noi_dung: '   ' })).rejects.toThrow(
      'Tin nhắn cần',
    );
  });
});

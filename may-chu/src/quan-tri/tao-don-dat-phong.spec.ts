import { describe, it, expect, vi } from 'vitest';
import { LichPhongService } from './lich-phong.service.js';
import type { QuanTriService } from './quan-tri.service.js';
import { GIO_MAC_DINH } from './gia-dat-phong.js';
const roomId = '00000000-0000-4000-8000-000000000002';
const body = {
  phong_id: roomId,
  hinh_thuc_dat: 'Theo giờ',
  so_dien_thoai: '0901234567',
  nhan_phong_luc: '2030-01-04T09:00:00+07:00',
  tra_phong_luc: '2030-01-04T11:00:00+07:00',
  so_khach: 1,
  gia_goc_du_kien: 200000,
};
function setup(failure?: string) {
  const admin = { kiemTraQuanTri: vi.fn().mockResolvedValue(undefined) };
  const room = {
    id: roomId,
    homestay_id: roomId,
    trang_thai_van_hanh: 'Trống',
    gia_moi_gio: 200000,
    gia_moi_ngay: 800000,
    gia_moi_dem: 500000,
    gia_phu_thu_gio: 50000,
    so_gio_toi_thieu: 2,
    mo_ban_theo_gio: true,
    mo_ban_theo_ngay: true,
    mo_ban_theo_dem: true,
  };
  const query = vi.fn(async (sql: string, _values?: unknown[]) => {
    if (sql.includes('FROM public.phong')) return { rows: [room], rowCount: 1 };
    if (sql.includes('FROM public.thiet_lap_gio'))
      return { rows: [GIO_MAC_DINH], rowCount: 1 };
    if (sql.includes('INSERT INTO public.dat_phong')) {
      if (failure)
        throw Object.assign(new Error('conflict'), { code: failure });
      return { rows: [{ id: 'new', ma_dat_phong: 'DP123' }], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  });
  const end = vi.fn();
  const service = new LichPhongService(admin as unknown as QuanTriService);
  Object.defineProperty(service, 'db', {
    value: vi.fn(async () => ({ query, end })),
  });
  return { service, admin, query, end };
}
describe('Tao don khong phu thuoc goi gia', () => {
  it('luu truc tiep hinh thuc, gia server va snapshot; khong JOIN goi', async () => {
    const { service, query, end } = setup();
    expect(await service.createBooking('admin', body)).toMatchObject({
      id: 'new',
    });
    const insert = query.mock.calls.find(([sql]) =>
      sql.startsWith('INSERT INTO public.dat_phong'),
    )!;
    expect(insert[0]).not.toContain('goi_gia');
    expect(insert[1]?.[4]).toBe('Theo giờ');
    expect(insert[1]?.[9]).toBe(200000);
    expect(JSON.parse(String(insert[1]?.[14]))).toMatchObject({
      gia_goc: 200000,
      gia_chot: 200000,
      nguoi_tao_id: 'admin',
    });
    expect(query.mock.calls.some(([sql]) => sql.includes('FOR UPDATE'))).toBe(
      true,
    );
    expect(query.mock.calls.some(([sql]) => sql === 'COMMIT')).toBe(true);
    expect(end).toHaveBeenCalled();
  });
  it('gia client cu bi tu choi truoc INSERT va rollback', async () => {
    const { service, query } = setup();
    await expect(
      service.createBooking('admin', { ...body, gia_goc_du_kien: 1 }),
    ).rejects.toThrow('Giá đã thay đổi');
    expect(query.mock.calls.some(([sql]) => sql.startsWith('INSERT'))).toBe(
      false,
    );
    expect(query.mock.calls.some(([sql]) => sql === 'ROLLBACK')).toBe(true);
  });
  it.each(['23P01', 'P0001'])('trung don/khoa bi tu choi %s', async (code) => {
    const { service, query } = setup(code);
    await expect(service.createBooking('admin', body)).rejects.toThrow(
      'đã có khóa hoặc đơn',
    );
    expect(query.mock.calls.some(([sql]) => sql === 'ROLLBACK')).toBe(true);
  });
  it('kiem tra quyen truoc khi doc/ghi du lieu', async () => {
    const { service, admin, query } = setup();
    admin.kiemTraQuanTri.mockRejectedValue(new Error('Không có quyền'));
    await expect(service.createBooking('user', body)).rejects.toThrow(
      'Không có quyền',
    );
    expect(query).not.toHaveBeenCalled();
  });
});

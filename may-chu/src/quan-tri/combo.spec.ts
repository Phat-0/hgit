import { describe, it, expect, vi } from 'vitest';
import { docCombo } from './combo.input.js';
import { ComboService } from './combo.service.js';
import type { QuanTriService } from './quan-tri.service.js';
const id = '00000000-0000-4000-8000-000000000001';
const valid = {
  ten_combo: ' Combo A ',
  gia_combo: 250000,
  mo_ta: 'Chi tiết',
  so_gio_bao_gom: 2,
  bat_dau: '2027-01-01T00:00:00+07:00',
  ket_thuc: '2027-02-01T00:00:00+07:00',
  pham_vi: 'chi_nhanh',
  chi_nhanh_ids: [id],
  phong_ids: [],
  trang_thai: 'Đang bán',
};
const png = {
  buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]),
  size: 9,
  mimetype: 'image/png',
  originalname: 'anh.png',
};
function setup(failInsert = false) {
  const s = new ComboService({
    kiemTraTrang: async () => {},
  } as unknown as QuanTriService);
  const calls: string[] = [];
  const remove = vi.fn(async (_keys?: string[]) => ({ error: null })),
    upload = vi.fn(async () => ({ error: null }));
  Object.assign(s, {
    storage: () => ({ remove, upload }),
    db: async () => ({
      end: async () => {},
      query: async (sql: string) => {
        calls.push(sql);
        if (sql.startsWith('SELECT dv.homestay_id'))
          return { rowCount: 0, rows: [] };
        if (sql.startsWith('INSERT INTO public.combo(') && failInsert)
          throw Error('Lỗi ghi DB');
        return {
          rowCount: 1,
          rows: sql.startsWith('SELECT anh_dai_dien')
            ? [{ anh_dai_dien: null }]
            : [{ id }],
        };
      },
    }),
  });
  return { s, calls, remove, upload };
}
describe('Combo: dữ liệu và quyền', () => {
  it('chuẩn hóa tên, giờ và thời gian Việt Nam', () => {
    const x = docCombo(valid);
    expect(x.name).toBe('Combo A');
    expect(x.price).toBe(250000);
    expect(x.start).toBe('2026-12-31T17:00:00.000Z');
  });
  it.each([
    { gia_combo: -1 },
    { gia_combo: '' },
    { so_gio_bao_gom: 0 },
    { so_gio_bao_gom: 1.5 },
    { ket_thuc: '2020-01-01' },
    { pham_vi: 'phong', phong_ids: [] },
    { chi_nhanh_ids: ['sai-id'] },
    { anh_dai_dien: 'https://khong-cho-nhap-url' },
  ])('từ chối đầu vào %j', (patch) =>
    expect(() => docCombo({ ...valid, ...patch })).toThrow(),
  );
  it('toàn hệ thống không giữ lựa chọn phòng/chi nhánh ẩn', () => {
    const x = docCombo({ ...valid, pham_vi: 'toan_he_thong', phong_ids: [id] });
    expect(x.rooms).toEqual([]);
    expect(x.branches).toEqual([]);
  });
  it('không truy cập DB nếu thiếu quyền', async () => {
    const s = new ComboService({
      kiemTraTrang: async () => {
        throw Error('Không có quyền');
      },
    } as unknown as QuanTriService);
    const db = vi.fn();
    Object.assign(s, { db });
    await expect(s.list(id)).rejects.toThrow('Không có quyền');
    expect(db).not.toHaveBeenCalled();
  });
  it('tạo mới bắt buộc tệp ảnh', async () => {
    const { s, calls } = setup();
    await expect(s.save(id, null, valid)).rejects.toThrow('chọn ảnh');
    expect(calls).toEqual([]);
  });
  it('không tin MIME nếu bytes ảnh giả', async () => {
    const { s, upload } = setup();
    await expect(
      s.save(id, null, valid, { ...png, buffer: Buffer.from('fakeimage') }),
    ).rejects.toThrow('định dạng ảnh');
    expect(upload).not.toHaveBeenCalled();
  });
  it('ghi ảnh và phạm vi trong một lần lưu', async () => {
    const { s, calls, upload } = setup();
    await s.save(id, null, valid, png);
    expect(upload).toHaveBeenCalledOnce();
    expect(calls.at(-1)).toBe('COMMIT');
    expect(
      calls.some((sql) => sql.startsWith('INSERT INTO public.combo_chi_nhanh')),
    ).toBe(true);
  });
  it('rollback và dọn tệp vừa upload khi ghi DB thất bại', async () => {
    const { s, calls, remove } = setup(true);
    await expect(s.save(id, null, valid, png)).rejects.toThrow('Lỗi ghi DB');
    expect(calls.at(-1)).toBe('ROLLBACK');
    expect(remove).toHaveBeenCalledOnce();
  });
});

describe('Combo nhiều ảnh', () => {
  it('tạo nhiều tệp trong một transaction', async () => {
    const { s, upload, calls } = setup();
    await s.save(id, null, valid, [png, png, png]);
    expect(upload).toHaveBeenCalledTimes(3);
    expect(calls.at(-1)).toBe('COMMIT');
  });
  it('không upload nếu vượt giới hạn tám ảnh', async () => {
    const { s, upload } = setup();
    await expect(s.save(id, null, valid, Array(9).fill(png))).rejects.toThrow(
      'tối đa 8',
    );
    expect(upload).not.toHaveBeenCalled();
  });
  it('không nhận khóa ảnh từ combo khác', async () => {
    const { s, upload, calls } = setup();
    await expect(
      s.save(id, id, { ...valid, giu_anh: ['combo-khac/anh.png'] }, [png]),
    ).rejects.toThrow('không thuộc combo');
    expect(upload).not.toHaveBeenCalled();
    expect(calls.at(-1)).toBe('ROLLBACK');
  });
  it('dọn các ảnh đã upload khi tệp tiếp theo tải thất bại', async () => {
    const { s, upload, remove, calls } = setup();
    upload.mockResolvedValueOnce({ error: null });
    upload.mockResolvedValueOnce({
      error: { message: 'Tải ảnh lỗi' },
    } as never);
    await expect(s.save(id, null, valid, [png, png])).rejects.toThrow(
      'Tải ảnh lỗi',
    );
    expect(remove).toHaveBeenCalledOnce();
    expect(remove.mock.calls[0][0]).toHaveLength(1);
    expect(calls.at(-1)).toBe('ROLLBACK');
  });
  it('giữ ảnh cũ khi chỉ sửa thông tin, không cần tải lại tệp', async () => {
    const { s, upload, calls } = setup();
    const keys = [id + '/a.png', id + '/b.png'];
    Object.assign(s, {
      db: async () => ({
        end: async () => {},
        query: async (sql: string) => {
          calls.push(sql);
          if (sql.startsWith('SELECT dv.homestay_id'))
            return { rowCount: 0, rows: [] };
          return {
            rowCount: 1,
            rows: sql.startsWith('SELECT anh_dai_dien')
              ? [{ anh_dai_dien: keys[0], anh_combo: keys }]
              : [{ id }],
          };
        },
      }),
    });
    await s.save(id, id, valid);
    expect(upload).not.toHaveBeenCalled();
    expect(calls.at(-1)).toBe('COMMIT');
  });
});

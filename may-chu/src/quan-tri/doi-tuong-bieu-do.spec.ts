import { describe, it, expect } from 'vitest';
import { docDoiTuong } from './doi-tuong-bieu-do.js';
const id = '11111111-1111-4111-8111-111111111111';
const obj = {
  id,
  ten: 'Nhóm chi nhánh',
  mau: '#abcdef',
  loai: 'chi_nhanh',
  ids: [id],
  tu_khoa: '',
};
describe('Nhóm so sánh thu chi', () => {
  it('chấp nhận và gộp mã phạm vi trùng', () =>
    expect(docDoiTuong([{ ...obj, ids: [id, id] }])[0].ids).toEqual([id]));
  it('chấp nhận khoản chung theo từ khóa', () =>
    expect(
      docDoiTuong([
        { ...obj, loai: 'khoan_khac', ids: [], tu_khoa: 'Điện nước' },
      ])[0].loai,
    ).toBe('khoan_khac'));
  it.each([
    { mau: 'url(x)' },
    { ids: [] },
    { loai: 'sai' },
    { ten: '' },
    { tu_khoa: 'a'.repeat(101) },
    { loai: 'khoan_khac', ids: [id] },
  ])('chặn dữ liệu sai %j', (patch) =>
    expect(() => docDoiTuong([{ ...obj, ...patch }])).toThrow(),
  );
  it('chặn đối tượng trùng và vượt giới hạn', () => {
    expect(() => docDoiTuong([obj, obj])).toThrow();
    expect(() => docDoiTuong(Array(21).fill(obj))).toThrow();
  });
});

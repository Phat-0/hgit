import { BadRequestException } from '@nestjs/common';
import { UUID_THU_CHI } from './thu-chi.input.js';
export type DoiTuongBieuDo = {
  id: string;
  ten: string;
  mau: string;
  loai: 'chi_nhanh' | 'phong' | 'khoan_khac';
  ids: string[];
  tu_khoa: string;
};
export function docDoiTuong(value: unknown): DoiTuongBieuDo[] {
  if (!Array.isArray(value) || value.length > 20)
    throw new BadRequestException('Tối đa 20 đối tượng so sánh');
  const seen = new Set<string>();
  return value.map((v) => {
    if (!v || typeof v !== 'object' || Array.isArray(v))
      throw new BadRequestException('Đối tượng không hợp lệ');
    const x = v as Record<string, unknown>,
      id = String(x.id || ''),
      ten = String(x.ten || '').trim(),
      mau = String(x.mau || ''),
      loai = String(x.loai || ''),
      keyword = String(x.tu_khoa || '').trim();
    if (
      !UUID_THU_CHI.test(id) ||
      seen.has(id) ||
      !ten ||
      ten.length > 80 ||
      !/^#[0-9a-f]{6}$/i.test(mau) ||
      !['chi_nhanh', 'phong', 'khoan_khac'].includes(loai) ||
      !Array.isArray(x.ids) ||
      x.ids.length > 200 ||
      x.ids.some((i) => typeof i !== 'string' || !UUID_THU_CHI.test(i)) ||
      keyword.length > 100
    )
      throw new BadRequestException(
        'Tên, màu hoặc phạm vi đối tượng không hợp lệ',
      );
    const ids = [...new Set(x.ids as string[])];
    if (loai !== 'khoan_khac' && !ids.length)
      throw new BadRequestException('Chọn ít nhất một chi nhánh hoặc phòng');
    if (loai === 'khoan_khac' && ids.length)
      throw new BadRequestException('Khoản khác không nhận mã phòng/chi nhánh');
    seen.add(id);
    return {
      id,
      ten,
      mau,
      loai: loai as DoiTuongBieuDo['loai'],
      ids,
      tu_khoa: keyword,
    };
  });
}

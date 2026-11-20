import { BadRequestException } from '@nestjs/common';
import type { HinhThucDat } from '../quan-tri/khung-gio.js';
/** The public interval includes the extra hours so availability checks lock the whole stay. */
export function docGioPhuThu(
  x: Record<string, unknown>,
  kind: HinhThucDat,
  start: Date,
  end: Date,
) {
  const read = (key: string) => {
    const raw = x[key] ?? 0;
    if (
      typeof raw !== 'number' ||
      !Number.isFinite(raw) ||
      raw < 0 ||
      raw > 12 ||
      !Number.isInteger(raw)
    )
      throw new BadRequestException(
        'Giờ phụ thu phải là số nguyên, tối đa 12 giờ mỗi phía',
      );
    return raw;
  };
  const early = read('gio_nhan_som'),
    late = read('gio_tra_muon');
  if (kind === 'Theo giờ' && (early || late))
    throw new BadRequestException(
      'Đặt theo giờ không dùng giờ phụ thu ngày/đêm',
    );
  const coreStart = new Date(+start + early * 3600000),
    coreEnd = new Date(+end - late * 3600000);
  if (+coreEnd <= +coreStart)
    throw new BadRequestException('Khoảng lưu trú không hợp lệ');
  return { early, late, coreStart, coreEnd };
}
export function tinhTienPhuThu(early: number, late: number, rate: unknown) {
  if (!early && !late) return 0;
  const value = Math.ceil(early + late) * Number(rate);
  if (!Number.isSafeInteger(value) || value < 0 || value > 1e12)
    throw new BadRequestException('Giá phụ thu chưa hợp lệ');
  return value;
}

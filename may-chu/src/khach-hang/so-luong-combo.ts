import { BadRequestException } from '@nestjs/common';
export function docSoLuongCombo(raw: unknown, ids: string[]) {
  if (raw === undefined) return Object.fromEntries(ids.map(id => [id, 1]));
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new BadRequestException('Số lượng combo không hợp lệ');
  const result: Record<string, number> = {};
  for (const [id, quantity] of Object.entries(raw)) {
    if (!ids.includes(id) || typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > 20)
      throw new BadRequestException('Mỗi combo cần số lượng nguyên từ 1 đến 20');
    result[id] = quantity;
  }
  return Object.fromEntries(ids.map(id => [id, result[id] ?? 1]));
}

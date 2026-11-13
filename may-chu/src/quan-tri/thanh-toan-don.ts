import { BadRequestException } from '@nestjs/common';
export function soTienDaGhiNhan(state: string, value: unknown, total: number) {
  if (!['Chưa thanh toán', 'Cọc', 'Đủ'].includes(state))
    throw new BadRequestException('Trạng thái thanh toán không hợp lệ');
  const amount =
    value === undefined ? (state === 'Đủ' ? total : 0) : Number(value);
  if (
    !Number.isSafeInteger(amount) ||
    amount < 0 ||
    amount > total ||
    (state === 'Chưa thanh toán' && amount !== 0) ||
    (state === 'Đủ' && amount !== total) ||
    (state === 'Cọc' && (amount <= 0 || amount >= total))
  )
    throw new BadRequestException(
      'Số tiền đã thanh toán phải khớp trạng thái: chưa thanh toán = 0; cọc lớn hơn 0 và nhỏ hơn tổng; đã thanh toán bằng tổng',
    );
  return amount;
}

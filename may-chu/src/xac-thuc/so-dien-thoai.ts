import { BadRequestException } from '@nestjs/common';
export function chuanHoaSoDienThoai(raw: unknown) {
  if (typeof raw !== 'string')
    throw new BadRequestException('Số điện thoại không hợp lệ');
  let v = raw.replace(/[\s().-]/g, '');
  if (/^0\d{9}$/.test(v)) v = '+84' + v.slice(1);
  else if (/^84\d{9}$/.test(v)) v = '+' + v;
  if (!/^\+[1-9]\d{8,14}$/.test(v))
    throw new BadRequestException(
      'Nhập số điện thoại hợp lệ, ví dụ 0901234567',
    );
  return v;
}

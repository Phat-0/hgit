import { BadRequestException } from '@nestjs/common';
export const UUID_THU_CHI =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function ngayThuChi(s: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(s) ||
    !Number.isFinite(Date.parse(s)) ||
    new Date(s).toISOString().slice(0, 10) !== s
  )
    throw new BadRequestException('Ngày không hợp lệ');
  return s;
}
export function dongThuChi(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new BadRequestException('Dữ liệu không hợp lệ');
  const x = body as Record<string, unknown>,
    ten = String(x.ten || '').trim(),
    ngay = ngayThuChi(String(x.ngay || '')),
    loai = String(x.loai || ''),
    amount = Number(x.so_tien),
    note = String(x.ghi_chu || ''),
    color = String(x.mau || '#ffffff'),
    branch = x.homestay_id ? String(x.homestay_id) : null,
    room = x.phong_id ? String(x.phong_id) : null;
  if (
    !ten ||
    ten.length > 200 ||
    !['Thu', 'Chi'].includes(loai) ||
    !Number.isSafeInteger(amount) ||
    !amount ||
    Math.abs(amount) > 1e12 ||
    note.length > 2000 ||
    !/^#[0-9a-f]{6}$/i.test(color) ||
    (branch && !UUID_THU_CHI.test(branch)) ||
    (room && !UUID_THU_CHI.test(room))
  )
    throw new BadRequestException(
      'Tên, tiền, loại thu/chi hoặc phạm vi không hợp lệ',
    );
  return {
    ten,
    ngay,
    loai,
    so_tien: (loai === 'Thu' ? 1 : -1) * Math.abs(amount),
    ghi_chu: note,
    mau: color,
    homestay_id: branch,
    phong_id: room,
  };
}

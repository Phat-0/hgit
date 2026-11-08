import { BadRequestException } from '@nestjs/common';
export { chuanHoaSoDienThoai } from '../xac-thuc/so-dien-thoai.js';
type Rule = {
  bat_dau: string;
  ket_thuc: string;
  loai_gia: string;
  thu_trong_tuan: number[] | null;
  gia: string | number;
  phu_thu_gio: string | number | null;
  muc_uu_tien?: number;
  ngay_tao?: string;
  id?: string;
};
type Room = {
  so_gio_toi_thieu: number;
  gia_moi_gio: string | number;
  gia_moi_ngay: string | number;
  gia_moi_dem: string | number;
  gia_phu_thu_gio: string | number;
};
export function tinhGiaKhach(
  room: Room,
  start: Date,
  end: Date,
  kind: string,
  rules: Rule[],
  combo?: { gia_combo: string | number; so_gio_bao_gom: number | null },
) {
  const hours = (+end - +start) / 3600000;
  if (!(hours > 0 && hours <= 744))
    throw new BadRequestException('Khoảng đặt tối đa 31 ngày');
  const selected = (time: number) =>
    rules
      .filter(
        (r) =>
          r.loai_gia ===
            (kind === 'Theo giờ'
              ? 'gio'
              : kind === 'Theo ngày'
                ? 'ngay'
                : 'qua-dem') &&
          +new Date(r.bat_dau) <= time &&
          +new Date(r.ket_thuc) > time &&
          (!r.thu_trong_tuan ||
            r.thu_trong_tuan.includes(
              new Date(time + 7 * 3600000).getUTCDay(),
            )),
      )
      .sort(
        (a, b) =>
          Number(b.muc_uu_tien || 0) - Number(a.muc_uu_tien || 0) ||
          +new Date(b.ngay_tao || 0) - +new Date(a.ngay_tao || 0) ||
          String(b.id).localeCompare(String(a.id)),
      )[0];
  let total = 0;
  if (kind === 'Theo giờ') {
    const initial = combo?.so_gio_bao_gom || Number(room.so_gio_toi_thieu);
    const first = selected(+start);
    total = combo?.so_gio_bao_gom
      ? Number(combo.gia_combo)
      : Number(first?.gia ?? room.gia_moi_gio);
    for (let h = initial; h < Math.ceil(hours); h++) {
      const r = selected(+start + h * 3600000);
      total += Number(r?.phu_thu_gio ?? room.gia_phu_thu_gio);
    }
    if (combo && !combo.so_gio_bao_gom) total += Number(combo.gia_combo);
  } else {
    for (let d = 0; d < Math.ceil(hours / 24); d++)
      total += Number(
        selected(+start + d * 86400000)?.gia ??
          (kind === 'Theo ngày' ? room.gia_moi_ngay : room.gia_moi_dem),
      );
    if (combo) total += Number(combo.gia_combo);
  }
  if (!Number.isSafeInteger(total) || total < 0 || total > 1e12)
    throw new BadRequestException('Giá phòng chưa được cấu hình hợp lệ');
  return total;
}

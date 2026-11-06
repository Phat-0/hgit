import { BadRequestException } from '@nestjs/common';

export const GIO_MAC_DINH = {
  ngay_tu: '14:00', ngay_den: '12:00', gio_tu: '08:00',
  gio_den: '22:00', dem_tu: '20:00', dem_den: '08:00',
};
export type KhungGio = typeof GIO_MAC_DINH;
export type HinhThucDat = 'Theo giờ' | 'Theo ngày' | 'Theo đêm';
export function kiemTraCauHinhGio(raw: unknown): KhungGio {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new BadRequestException('Khung giờ không hợp lệ');
  const x = raw as Record<string, unknown>;
  const keys = Object.keys(GIO_MAC_DINH);
  if (Object.keys(x).length !== keys.length || keys.some(k => typeof x[k] !== 'string' || !/^([01]\d|2[0-3]):[03]0$/.test(x[k] as string))) {
    throw new BadRequestException('Cần đủ sáu mốc giờ, theo bước 30 phút');
  }
  return Object.fromEntries(keys.map(k => [k, x[k]])) as KhungGio;
}
export function kiemTraThoiGianDat(kind: HinhThucDat, start: Date, end: Date, config: KhungGio, minimum: number) {
  if (!['Theo giờ', 'Theo ngày', 'Theo đêm'].includes(kind)) throw new BadRequestException('Hình thức đặt không hợp lệ');
  const a = new Date(start.getTime() + 7 * 3600000).toISOString();
  const b = new Date(end.getTime() + 7 * 3600000).toISOString();
  const st = a.slice(11, 16), et = b.slice(11, 16);
  if (a.slice(17, 23) !== '00.000' || b.slice(17, 23) !== '00.000' || !['00','30'].includes(st.slice(3)) || !['00','30'].includes(et.slice(3))) {
    throw new BadRequestException('Thời gian phải theo bước 30 phút');
  }
  if (kind === 'Theo giờ') {
    if (end.getTime() - start.getTime() < minimum * 3600000) throw new BadRequestException('Thời gian chưa đạt số giờ tối thiểu của phòng');
    const open = config.gio_tu, close = config.gio_den;
    if (open === close) return; // Khung 24 giờ.
    const openingDate = open > close && st < close
      ? new Date(start.getTime() - 86400000 + 7 * 3600000).toISOString().slice(0, 10)
      : a.slice(0, 10);
    const opening = new Date(openingDate + 'T' + open + ':00+07:00');
    const closing = new Date(openingDate + 'T' + close + ':00+07:00');
    if (open > close) closing.setTime(closing.getTime() + 86400000);
    if (start < opening || end > closing) throw new BadRequestException('Khoảng đặt phải nằm trong khung Theo giờ đã lưu ở trang Lịch');
  } else {
    const prefix = kind === 'Theo ngày' ? 'ngay' : 'dem';
    if (st !== config[`${prefix}_tu`] || et !== config[`${prefix}_den`]) throw new BadRequestException('Giờ nhận/trả không khớp thiết lập Lịch. Hãy tải lại biểu mẫu');
    // Chỉ nhận nguyên các khung liên tiếp do cùng RangePicker tạo ra.
    const hours = (end.getTime() - start.getTime()) / 3600000;
    const clock = (s: string) => Number(s.slice(0,2)) + Number(s.slice(3))/60;
    const base = (clock(config[`${prefix}_den`]) - clock(config[`${prefix}_tu`]) + 24) % 24 || 24;
    if (hours < base || Math.abs((hours - base) / 24 - Math.round((hours - base) / 24)) > 1e-8) throw new BadRequestException('Khoảng ngày không khớp khung giờ đã thiết lập');
  }
}

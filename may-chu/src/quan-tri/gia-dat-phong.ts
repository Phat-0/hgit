import { BadRequestException } from '@nestjs/common';
export type HinhThuc = 'Theo giờ' | 'Theo ngày' | 'Theo đêm';
export type GioDat = {
  gio_tu: string;
  gio_den: string;
  ngay_tu: string;
  ngay_den: string;
  dem_tu: string;
  dem_den: string;
};
export type GiaPhong = {
  gia_moi_gio: string | number;
  gia_moi_ngay: string | number;
  gia_moi_dem: string | number;
  gia_phu_thu_gio: string | number;
  so_gio_toi_thieu: number | null;
  mo_ban_theo_gio: boolean;
  mo_ban_theo_ngay: boolean;
  mo_ban_theo_dem: boolean;
  trang_thai_van_hanh: string;
};
export type GiaLich = {
  id: string;
  loai_gia: string;
  bat_dau: Date | string;
  ket_thuc: Date | string;
  gia: string | number;
  phu_thu_gio: string | number | null;
  thu_trong_tuan: number[] | null;
};
export const GIO_MAC_DINH: GioDat = {
  gio_tu: '08:00',
  gio_den: '22:00',
  ngay_tu: '14:00',
  ngay_den: '12:00',
  dem_tu: '20:00',
  dem_den: '08:00',
};
const DAY = 86400000,
  HOUR = 3600000;
export function kiemTraGio(x: Record<string, unknown>): GioDat {
  const keys = Object.keys(GIO_MAC_DINH) as (keyof GioDat)[];
  if (
    Object.keys(x).some((k) => !keys.includes(k as keyof GioDat)) ||
    keys.some(
      (k) =>
        typeof x[k] !== 'string' ||
        !/^([01]\d|2[0-3]):(00|30)$/.test(x[k] as string),
    )
  )
    throw new BadRequestException(
      'Khung giờ phải có đủ sáu mốc, theo bước 30 phút',
    );
  return Object.fromEntries(keys.map((k) => [k, x[k]])) as GioDat;
}
export const gioVN = (d: Date) =>
  new Date(d.getTime() + 7 * HOUR).toISOString().slice(11, 16);
const ngayVN = (d: Date) =>
  new Date(d.getTime() + 7 * HOUR).toISOString().slice(0, 10);
const minutes = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
export function kiemTraKhoang(
  kind: HinhThuc,
  start: Date,
  end: Date,
  c: GioDat,
) {
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    start >= end ||
    end.getTime() - start.getTime() > 31 * DAY
  )
    throw new BadRequestException(
      'Khoảng đặt không hợp lệ hoặc dài quá 31 ngày',
    );
  if (
    start.getUTCSeconds() ||
    start.getUTCMilliseconds() ||
    end.getUTCSeconds() ||
    end.getUTCMilliseconds() ||
    start.getUTCMinutes() % 30 ||
    end.getUTCMinutes() % 30
  )
    throw new BadRequestException('Thời gian phải theo bước 30 phút');
  const a = gioVN(start),
    b = gioVN(end);
  if (kind === 'Theo giờ') {
    const open = minutes(c.gio_tu),
      close = minutes(c.gio_den),
      span = (close - open + 1440) % 1440 || 1440;
    const offset = (minutes(a) - open + 1440) % 1440;
    if (
      span !== 1440 &&
      (offset >= span ||
        offset + (end.getTime() - start.getTime()) / 60000 > span)
    )
      throw new BadRequestException(
        'Khoảng đặt vượt khung Theo giờ trong thiết lập Lịch',
      );
  } else {
    const key = kind === 'Theo ngày' ? 'ngay' : 'dem';
    if (
      a !== c[(key + '_tu') as keyof GioDat] ||
      b !== c[(key + '_den') as keyof GioDat]
    )
      throw new BadRequestException('Giờ nhận/trả phải đúng thiết lập Lịch');
  }
}
// Rules must be ordered by priority DESC, created DESC, id DESC by the caller.
export function tinhGia(
  phong: GiaPhong,
  kind: HinhThuc,
  start: Date,
  end: Date,
  c: GioDat,
  rules: GiaLich[],
  combo?: {
    id: string;
    gia_combo: string | number;
    so_gio_bao_gom: number | null;
  },
) {
  kiemTraKhoang(kind, start, end, c);
  const enabled =
    kind === 'Theo giờ'
      ? phong.mo_ban_theo_gio
      : kind === 'Theo ngày'
        ? phong.mo_ban_theo_ngay
        : phong.mo_ban_theo_dem;
  if (!enabled)
    throw new BadRequestException('Phòng chưa mở bán hình thức đã chọn');
  if (['Bảo trì', 'Bị khóa'].includes(phong.trang_thai_van_hanh))
    throw new BadRequestException('Phòng đang bảo trì hoặc bị khóa');
  const minimum = Number(phong.so_gio_toi_thieu);
  const hours = (end.getTime() - start.getTime()) / HOUR;
  if (
    kind === 'Theo giờ' &&
    (!Number.isInteger(minimum) || minimum < 1 || hours < minimum)
  )
    throw new BadRequestException('Chưa đạt số giờ tối thiểu của phòng');
  if (combo?.so_gio_bao_gom && kind !== 'Theo giờ')
    throw new BadRequestException('Combo bao gồm giờ chỉ áp dụng đặt theo giờ');
  const key =
    kind === 'Theo giờ' ? 'gio' : kind === 'Theo ngày' ? 'ngay' : 'qua-dem';
  const applied: {
    thoi_diem: string;
    gia: number;
    phu_thu_gio: number;
    quy_tac_id: string | null;
  }[] = [];
  function at(d: Date) {
    const weekday = new Date(ngayVN(d) + 'T12:00:00+07:00').getUTCDay();
    const rule = rules.find(
      (r) =>
        r.loai_gia === key &&
        new Date(r.bat_dau) <= d &&
        new Date(r.ket_thuc) > d &&
        (!r.thu_trong_tuan?.length || r.thu_trong_tuan.includes(weekday)),
    );
    const rate = Number(
        rule?.gia ??
          (kind === 'Theo giờ'
            ? phong.gia_moi_gio
            : kind === 'Theo ngày'
              ? phong.gia_moi_ngay
              : phong.gia_moi_dem),
      ),
      extra = Number(rule?.phu_thu_gio ?? phong.gia_phu_thu_gio);
    if (
      !Number.isFinite(rate) ||
      rate < 0 ||
      !Number.isFinite(extra) ||
      extra < 0
    )
      throw new BadRequestException('Cấu hình giá phòng không hợp lệ');
    applied.push({
      thoi_diem: d.toISOString(),
      gia: rate,
      phu_thu_gio: extra,
      quy_tac_id: rule?.id ?? null,
    });
    return { rate, extra };
  }
  let total = 0;
  if (kind === 'Theo giờ') {
    const { rate, extra } = at(start);
    total = combo?.so_gio_bao_gom
      ? Number(combo.gia_combo) +
        Math.max(0, Math.ceil(hours) - combo.so_gio_bao_gom) * extra
      : rate + Math.max(0, Math.ceil(hours) - minimum) * extra;
  } else {
    const lastDay = ngayVN(end),
      firstDay = ngayVN(start);
    const dayDiff = Math.round(
      (Date.parse(lastDay) - Date.parse(firstDay)) / DAY,
    );
    const k = kind === 'Theo ngày' ? 'ngay' : 'dem';
    const rollover =
      c[(k + '_den') as keyof GioDat] <= c[(k + '_tu') as keyof GioDat] ? 1 : 0;
    const blocks = dayDiff + 1 - rollover;
    for (let i = 0; i < blocks; i++)
      total += at(new Date(start.getTime() + i * DAY)).rate;
  }
  if (combo && !combo.so_gio_bao_gom) total += Number(combo.gia_combo);
  if (!Number.isFinite(total) || total < 0 || total > 1e12)
    throw new BadRequestException('Tổng tiền không hợp lệ');
  return {
    gia_goc: total,
    snapshot: {
      phien_ban: 1,
      hinh_thuc_dat: kind,
      so_gio_toi_thieu: phong.so_gio_toi_thieu,
      so_gio: hours,
      khung_gio: c,
      bang_gia: applied,
      combo: combo ?? null,
      gia_goc: total,
    },
  };
}

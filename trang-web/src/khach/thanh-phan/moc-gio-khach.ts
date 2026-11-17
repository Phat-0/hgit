export type MocGio = { ngay: string; gio: string; time: number };
const HALF = 1800000,
  DAY = 86400000;
const clock = (time: number) =>
  new Date(time + 7 * 3600000).toISOString().slice(11, 16);
const day = (time: number) =>
  new Date(time + 7 * 3600000).toISOString().slice(0, 10);
const at = (date: string, time: string) =>
  Date.parse(date + "T" + time + ":00+07:00");
export function mocNhanPhong(
  date: string,
  config: Record<string, string>,
  now = Date.now(),
): MocGio[] {
  const open = config.gio_tu,
    close = config.gio_den,
    midnight = at(date, "00:00");
  if (!Number.isFinite(midnight)) return [];
  return Array.from({ length: 48 }, (_, i) => midnight + i * HALF)
    .filter((t) => t >= Math.ceil(now / HALF) * HALF)
    .map((t) => ({ ngay: date, gio: clock(t), time: t }))
    .filter(
      (s) =>
        open === close ||
        (open < close
          ? s.gio >= open && s.gio < close
          : s.gio >= open || s.gio < close),
    );
}
export function mocTraPhong(
  date: string,
  start: string,
  endDate: string,
  config: Record<string, string>,
): MocGio[] {
  const begin = at(date, start),
    open = config.gio_tu,
    close = config.gio_den;
  if (!Number.isFinite(begin)) return [];
  const openingDay = open > close && start < close ? day(begin - DAY) : date;
  const closing =
    open === close
      ? begin + 31 * DAY
      : at(openingDay, close) + (open > close ? DAY : 0);
  const candidates: MocGio[] = [];
  for (
    let t = begin + HALF;
    t <= closing && t <= at(endDate, "00:00") + 2 * DAY;
    t += HALF
  ) {
    const d = day(t);
    if (
      d === endDate ||
      (open > close && endDate === date && d === day(at(date, "00:00") + DAY))
    )
      candidates.push({ ngay: d, gio: clock(t), time: t });
  }
  return candidates;
}

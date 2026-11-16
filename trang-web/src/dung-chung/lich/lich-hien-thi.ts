export type KhoangHienThi = { tu: string; den: string };
export function chuKhoangNgay(
  r: KhoangHienThi,
  nam = new Date().getFullYear(),
) {
  const parts = (d: string) => d.split("-");
  const [ya, ma, da] = parts(r.tu),
    [yb, mb, db] = parts(r.den);
  if (!ya || !yb) return "";
  const year = (y: string) => (Number(y) === nam ? "" : "/" + y);
  if (r.tu === r.den) return `${da}/${ma}${year(ya)}`;
  if (ya === yb && ma === mb) return `${da}–${db}/${mb}${year(yb)}`;
  if (ya === yb) return `${da}/${ma}–${db}/${mb}${year(yb)}`;
  return `${da}/${ma}/${ya}–${db}/${mb}/${yb}`;
}
export const chuCacKhoang = (ranges: KhoangHienThi[]) =>
  ranges.map((r) => chuKhoangNgay(r)).join(" · ");

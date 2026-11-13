export type DongThuChi = {
  id: string;
  ngay: string;
  ten: string;
  so_tien: string | number;
  loai: "Thu" | "Chi";
  homestay_id: string | null;
  phong_id: string | null;
  ghi_chu: string;
  mau: string;
  phien_ban: number;
  so_chung_tu?: number;
  chung_tu?:{id:string;ten_tep:string}[];
};
export type OChon = { row: number; col: number };
export function tongVung(rows: DongThuChi[], a: OChon | null, b: OChon | null) {
  if (!a || !b || Math.min(a.col, b.col) > 2 || Math.max(a.col, b.col) < 2)
    return 0;
  return rows
    .slice(Math.min(a.row, b.row), Math.max(a.row, b.row) + 1)
    .reduce((s, r) => s + Number(r.so_tien), 0);
}
export function doiLoaiTien(n: number, kind: "Thu" | "Chi") {
  return (kind === "Thu" ? 1 : -1) * Math.abs(n);
}
export function ngayCuoiThang(month: string) {
  return new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
  )
    .toISOString()
    .slice(0, 10);
}

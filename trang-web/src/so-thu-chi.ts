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
  chung_tu?: { id: string; ten_tep: string }[];
};
export function tongDong(rows: DongThuChi[]) {
  return rows.reduce(
    (s, r) => {
      const n = Number(r.so_tien);
      s.tong += n;
      if (n > 0) s.thu += n;
      else s.chi += n;
      return s;
    },
    { tong: 0, thu: 0, chi: 0 },
  );
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

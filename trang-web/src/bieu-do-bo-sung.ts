import {
  nhomNgay,
  tinhGiaTri,
  CHI_SO,
  type CotThongKe,
  type DuLieuThongKe,
  type PhamVi,
} from "./thong-ke-thu-chi";
export type PhamViBieuDo = PhamVi & { branch?: string };
export type KhungBieuDo = {
  id: string;
  type: "bar" | "pie";
  columns: CotThongKe[];
  scopes: PhamViBieuDo[];
  bins: { columnId: string; key: string; ten: string; ngay: string[] }[];
  ranges: { tu: string; den: string }[];
  group: string;
  metricId: string;
  customCalendar: boolean;
};
export function gopNgayThanhKhoang(days: string[]) {
  const out: { tu: string; den: string }[] = [];
  for (const d of [...new Set(days)].sort()) {
    const last = out.at(-1);
    if (last && Date.parse(d) - Date.parse(last.den) === 86400000) last.den = d;
    else out.push({ tu: d, den: d });
  }
  return out;
}
export function phamViBiTrung(scopes: PhamViBieuDo[]) {
  return (
    scopes.length > 1 &&
    (scopes.some((p) => p.loai === "tong" || p.loai === "tong_phong") ||
      scopes.some(
        (p) =>
          p.loai === "chi_nhanh" &&
          scopes.some((r) => r.loai === "phong" && r.branch === p.id),
      ))
  );
}
export function diemBoSung(spec: KhungBieuDo, data: DuLieuThongKe) {
  const cols =
    spec.type === "pie"
      ? [
          spec.columns.find((c) => c.id === spec.metricId) || spec.columns[0],
        ].filter(Boolean)
      : spec.columns;
  return cols.flatMap((c) => {
    const groups =
      spec.group === "cau_hinh" && !spec.customCalendar
        ? spec.bins.filter((b) => b.columnId === c.id)
        : nhomNgay(
            {
              ...c,
              chia: spec.group === "cau_hinh" ? c.chia : spec.group,
              lichRieng: true,
              khoang: spec.ranges,
              tu: spec.ranges[0]?.tu || "",
              den: spec.ranges.at(-1)?.den || "",
            },
            "",
            "",
          );
    return groups.flatMap((b) =>
      spec.type === "bar"
        ? spec.scopes.map((p) => ({
            id: c.id + ":" + b.key + ":" + p.id,
            ten:
              p.ten +
              " · " +
              (CHI_SO.find((m) => m[0] === c.chiSo)?.[1] || "") +
              " · " +
              b.ten,
            value: tinhGiaTri(data, p, c, b.ngay),
            unit: CHI_SO.find((m) => m[0] === c.chiSo)?.[2] || "",
            calc:
              c.cachTinh === "tb_ngay"
                ? "Trung bình ngày"
                : c.cachTinh === "tb_tuan"
                  ? "Trung bình tuần"
                  : "Tổng",
            category:
              p.loai === "phong"
                ? "Phòng"
                : p.loai === "chi_nhanh"
                  ? "Chi nhánh"
                  : "Tổng",
          }))
        : [
            {
              id: c.id + ":" + b.key,
              ten: b.ten,
              value: spec.scopes.reduce(
                (n, p) => n + (tinhGiaTri(data, p, c, b.ngay) || 0),
                0,
              ),
              unit: CHI_SO.find((m) => m[0] === c.chiSo)?.[2] || "",
              calc: "Tổng",
              category: "Thời gian",
            },
          ],
    );
  });
}

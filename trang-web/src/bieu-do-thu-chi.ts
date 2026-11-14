import type { DongThuChi } from "./so-thu-chi";
export type TuyChonBieuDo = {
  id: string;
  homestay_id?: string;
  ten_homestay?: string;
  ten_phong?: string;
};
export type DoiTuongBieuDo = {
  id: string;
  ten: string;
  mau: string;
  loai: "chi_nhanh" | "phong" | "khoan_khac";
  ids: string[];
  tu_khoa: string;
};
export type NhomThuChi = {
  key: string;
  label: string;
  mau: string;
  thu: number;
  chi: number;
  rows: DongThuChi[];
};
export const mauNhom = [
  "#8c67bd",
  "#3fa88b",
  "#d88c51",
  "#5c92cd",
  "#c56f98",
  "#9ca14d",
  "#4ca8b4",
  "#be765a",
];
export function khopDoiTuong(row: DongThuChi, o: DoiTuongBieuDo) {
  return (
    (o.loai === "chi_nhanh"
      ? o.ids.includes(row.homestay_id || "")
      : o.loai === "phong"
        ? o.ids.includes(row.phong_id || "")
        : !row.phong_id && !row.homestay_id) &&
    (!o.tu_khoa ||
      (row.ten + " " + row.ghi_chu)
        .toLocaleLowerCase("vi")
        .includes(o.tu_khoa.toLocaleLowerCase("vi")))
  );
}
export function nhomThuChi(
  rows: DongThuChi[],
  mode: string,
  branches: TuyChonBieuDo[],
  rooms: TuyChonBieuDo[],
  objects: DoiTuongBieuDo[],
): NhomThuChi[] {
  const names =
    mode === "tong"
      ? [{ key: "tong", label: "Tổng", mau: mauNhom[0] }]
      : mode === "doi_tuong"
        ? objects.map((o) => ({ key: o.id, label: o.ten, mau: o.mau }))
        : mode === "chi_nhanh"
          ? [
              ...branches.map((b, i) => ({
                key: b.id,
                label: b.ten_homestay || "Chi nhánh",
                mau: mauNhom[i % mauNhom.length],
              })),
              { key: "chung", label: "Khoản chung", mau: "#89919e" },
            ]
          : [
              ...rooms.map((p, i) => ({
                key: p.id,
                label:
                  (branches.find((b) => b.id === p.homestay_id)?.ten_homestay ||
                    "") +
                  " · " +
                  p.ten_phong,
                mau: mauNhom[i % mauNhom.length],
              })),
              { key: "chung", label: "Chưa gán phòng", mau: "#89919e" },
            ];
  return names
    .map((n) => {
      const chosen = rows.filter((r) =>
        mode === "tong" || mode === "doi_tuong"
          ? mode === "tong" ||
            khopDoiTuong(
              r,
              objects.find((o) => o.id === n.key)!,
            )
          : (mode === "chi_nhanh"
              ? r.homestay_id || "chung"
              : r.phong_id || "chung") === n.key,
      );
      return {
        ...n,
        thu: chosen.reduce((s, r) => s + Math.max(0, Number(r.so_tien)), 0),
        chi: chosen.reduce((s, r) => s + Math.max(0, -Number(r.so_tien)), 0),
        rows: chosen,
      };
    })
    .filter((n) => n.key !== "chung" || n.rows.length > 0);
}
export function cacNgay(a: string, b: string) {
  const start = Date.parse(a + "T00:00:00Z"),
    end = Date.parse(b + "T00:00:00Z");
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start > end ||
    end - start > 366 * 86400000
  )
    return [];
  return Array.from(
    { length: Math.round((end - start) / 86400000) + 1 },
    (_, i) => new Date(start + i * 86400000).toISOString().slice(0, 10),
  );
}

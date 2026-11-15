import { cacNgay } from "./bieu-do-thu-chi";
export type PhamVi = {
  id: string;
  ten: string;
  loai: "tong" | "chi_nhanh" | "phong";
};
export type CotThongKe = {
  id: string;
  chiSo: string;
  cachTinh: string;
  chia: string;
  lichRieng: boolean;
  tu: string;
  den: string;
  thu: number[];
  loaiDat: string[];
  gio: number[];
};
export type DuLieuThongKe = {
  chi_nhanh: { id: string; ten_homestay: string }[];
  phong: { id: string; homestay_id: string; ten_phong: string }[];
  dong: {
    ngay: string;
    homestay_id: string | null;
    phong_id: string | null;
    thu: string | number;
    chi: string | number;
  }[];
  don: {
    ngay: string;
    homestay_id: string;
    phong_id: string;
    hinh_thuc_dat: string;
    gio: number;
    dat: number;
    huy: number;
    gia: string | number;
    gio_o: string | number;
  }[];
  tien_ton: { thang: string; so_tien: string | number }[];
  truoc_thang: {
    homestay_id: string | null;
    phong_id: string | null;
    so_tien: string | number;
  }[];
};
export const CHI_SO = [
  ["thu", "Thu", "đ"],
  ["chi", "Chi", "đ"],
  ["so_du", "Số dư lũy kế", "đ"],
  ["dat", "Số lượt phòng đặt", "lượt"],
  ["huy", "Số lượt hủy", "lượt"],
  ["gia_don", "Giá đơn", "đ"],
  ["thoi_gian", "Thời gian lưu trú", "giờ"],
  ["loai_dat", "Lượt theo loại đặt", "lượt"],
  ["khung_gio", "Lượt theo khung giờ", "lượt"],
] as const;
export const THU = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
export const thuCuaNgay = (d: string) =>
  (new Date(d + "T00:00:00Z").getUTCDay() + 6) % 7;
export const ngayNgan = (d: string) => d.slice(8, 10) + "/" + d.slice(5, 7);
const congNgay = (d: string, n: number) =>
  new Date(Date.parse(d + "T00:00:00Z") + n * 86400000)
    .toISOString()
    .slice(0, 10);
export const dauTuan = (d: string) => congNgay(d, -thuCuaNgay(d));
export function ngayCuaCot(c: CotThongKe, tu: string, den: string) {
  return cacNgay(c.lichRieng ? c.tu : tu, c.lichRieng ? c.den : den).filter(
    (d) => c.thu.includes(thuCuaNgay(d)),
  );
}
export function nhomNgay(c: CotThongKe, tu: string, den: string) {
  const days = ngayCuaCot(c, tu, den),
    groups = new Map<string, { key: string; ten: string; ngay: string[] }>();
  for (const d of days) {
    const k =
      c.chia === "ngay"
        ? d
        : c.chia === "thu"
          ? String(thuCuaNgay(d))
          : c.chia === "tuan"
            ? dauTuan(d)
            : "chung";
    if (!groups.has(k))
      groups.set(k, {
        key: k,
        ten:
          c.chia === "ngay"
            ? ngayNgan(d)
            : c.chia === "thu"
              ? THU[thuCuaNgay(d)]
              : c.chia === "tuan"
                ? "Tuần " + ngayNgan(k) + "–" + ngayNgan(congNgay(k, 6))
                : "Cả kỳ",
        ngay: [],
      });
    groups.get(k)!.ngay.push(d);
  }
  return [...groups.values()].sort((a, b) => a.key.localeCompare(b.key));
}
function khop(
  r: { homestay_id: string | null; phong_id: string | null },
  p: PhamVi,
) {
  return (
    p.loai === "tong" ||
    (p.loai === "chi_nhanh" ? r.homestay_id : r.phong_id) === p.id
  );
}
export function tinhGiaTri(
  data: DuLieuThongKe,
  p: PhamVi,
  c: CotThongKe,
  days: string[],
): number | null {
  if (!days.length) return null;
  const dates = new Set(days),
    flows = data.dong.filter((r) => khop(r, p)),
    orders = data.don.filter(
      (r) =>
        khop(r, p) &&
        dates.has(r.ngay) &&
        (!c.loaiDat.length || c.loaiDat.includes(r.hinh_thuc_dat)) &&
        (!c.gio.length || c.gio.includes(Number(r.gio))),
    );
  if (c.chiSo === "so_du") {
    const closing = (d: string) => {
      const month = d.slice(0, 7);
      if (p.loai === "tong")
        return (
          Number(
            data.tien_ton.find((r) => r.thang.slice(0, 7) === month)?.so_tien ||
              0,
          ) +
          flows
            .filter((r) => r.ngay.slice(0, 7) === month && r.ngay <= d)
            .reduce((s, r) => s + Number(r.thu) - Number(r.chi), 0)
        );
      return (
        data.truoc_thang
          .filter((r) => khop(r, p))
          .reduce((s, r) => s + Number(r.so_tien), 0) +
        flows
          .filter((r) => r.ngay <= d)
          .reduce((s, r) => s + Number(r.thu) - Number(r.chi), 0)
      );
    };
    if (c.cachTinh === "tb_ngay")
      return days.reduce((s, d) => s + closing(d), 0) / days.length;
    if (c.cachTinh === "tb_tuan") {
      const last = new Map<string, string>();
      for (const d of days) last.set(dauTuan(d), d);
      return [...last.values()].reduce((s, d) => s + closing(d), 0) / last.size;
    }
    return closing(days[days.length - 1]);
  }
  let total = 0;
  if (c.chiSo === "thu" || c.chiSo === "chi")
    total = flows
      .filter((r) => dates.has(r.ngay))
      .reduce((s, r) => s + Number(r[c.chiSo as "thu" | "chi"]), 0);
  else
    total = orders.reduce(
      (s, r) =>
        s +
        Number(
          c.chiSo === "huy"
            ? r.huy
            : c.chiSo === "gia_don"
              ? r.gia
              : c.chiSo === "thoi_gian"
                ? r.gio_o
                : r.dat,
        ),
      0,
    );
  const divisor =
    c.cachTinh === "tb_ngay"
      ? days.length
      : c.cachTinh === "tb_tuan"
        ? new Set(days.map(dauTuan)).size
        : c.cachTinh === "tb_don"
          ? orders.reduce((s, r) => s + Number(r.dat), 0)
          : 1;
  return divisor ? total / divisor : null;
}
export function tenCot(c: CotThongKe) {
  const name = CHI_SO.find((m) => m[0] === c.chiSo)?.[1] || c.chiSo;
  return (
    name +
    " · " +
    (c.cachTinh === "tb_ngay"
      ? "TB/ngày"
      : c.cachTinh === "tb_tuan"
        ? "TB/tuần"
        : c.cachTinh === "tb_don"
          ? "TB/đơn"
          : c.chiSo === "so_du"
            ? "Cuối kỳ"
            : "Tổng")
  );
}
export const hienSo = (n: number | null) =>
  n === null ? "—" : n.toLocaleString("vi-VN", { maximumFractionDigits: 2 });

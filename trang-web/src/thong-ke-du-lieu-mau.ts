import type { DuLieuThongKe } from "./thong-ke-thu-chi";
export function taoDuLieuMauThongKe(year: number): DuLieuThongKe {
  const chi_nhanh = [1, 2].map((i) => ({
    id: "mau-cn-" + i,
    ten_homestay: "Chi nhánh mẫu " + i,
  }));
  const phong = Array.from({ length: 10 }, (_, i) => ({
    id: "mau-phong-" + i,
    homestay_id: chi_nhanh[Math.floor(i / 5)].id,
    ma_phong: "P" + (Math.floor(i / 5) + 1) + "0" + ((i % 5) + 1),
    ten_phong: "Phòng mẫu " + (i + 1),
  }));
  return {
    chi_nhanh,
    phong,
    dong: phong.flatMap((p, i) =>
      [10, 11].map((month) => ({
        ngay: `${year}-${month}-` + String(5 + i).padStart(2, "0"),
        homestay_id: p.homestay_id,
        phong_id: p.id,
        thu: 300000 + i * 70000 + (month - 10) * 50000,
        chi: 50000 + i * 7000 + (month - 10) * 10000,
      })),
    ),
    don: phong.flatMap((p, i) =>
      [10, 11].map((month) => ({
        ngay: `${year}-${month}-` + String(5 + i).padStart(2, "0"),
        homestay_id: p.homestay_id,
        phong_id: p.id,
        hinh_thuc_dat:
          i % 3 === 0 ? "Theo giờ" : i % 3 === 1 ? "Theo ngày" : "Theo đêm",
        gio: 8 + i,
        dat: 2 + (i % 4),
        huy: i % 3,
        gia: 400000 + i * 90000,
        gio_o: 6 + i * 2,
      })),
    ),
    tien_ton: [10, 11].map((m) => ({
      thang: `${year}-${m}-01`,
      so_tien: 1000000,
    })),
    truoc_thang: [],
  };
}

export async function quanTriApi<T>(
  token: string,
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const r = await fetch("/api/quan-tri/" + path, {
    method,
    headers: {
      Authorization: "Bearer " + token,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json();
  if (!r.ok)
    throw Error(
      Array.isArray(j.message)
        ? j.message.join("; ")
        : j.message || "Không tải được dữ liệu",
    );
  return j;
}
export const vnd = (n: unknown) =>
  Number(n || 0).toLocaleString("vi-VN") + " đ";
export const ngayVN = () =>
  new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
export const lucVN = (s: string) =>
  new Date(s).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour12: false,
  });
export type Daily = {
  ngay: string;
  so_don: number;
  so_huy: number;
  doanh_thu: string;
  tien_phong: string;
  tien_dich_vu: string;
  tien_giam: string;
};
export type Group = {
  ten: string;
  so_don: number;
  so_huy: number;
  doanh_thu: string;
};
export type RecentOrder = {
  id: string;
  ma_dat_phong: string;
  ten_khach: string;
  ten_phong: string;
  ten_loai: string;
  ten_homestay: string;
  hinh_thuc_dat: string;
  ngay_tao: string;
  nhan_phong_luc: string;
  tra_phong_luc: string;
  tong_tien: string;
  trang_thai: string;
};
export type Report = {
  tong_quan: {
    tong_homestay: number;
    tong_phong: number;
    tong_nguoi_dung: number;
    nguoi_dung_moi: number;
  };
  danh_gia_theo_sao: { sao: number; so_luong: number }[];
  theo_phong: (Group & {phong_id?:string;so_luot_hop_le?:number;tan_suat_ngay?:string})[];
  theo_thanh_toan: Group[];
  theo_ngay: Daily[];
  theo_kieu: Group[];
  theo_chi_nhanh: Group[];
  theo_trang_thai: Group[];
  don: RecentOrder[];
  da_thu: string;
  chi_nhanh: { id: string; ten_homestay: string }[];
};
export type Review = {
  id: string;
  dat_phong_id: string;
  so_sao: number;
  noi_dung: string;
  ngay_tao: string;
  ho_ten: string;
  ten_phong: string;
  ten_homestay?: string;
  ma_dat_phong?: string;
  trang_thai?: string;
};
export type Overview = Report & {
  tong_homestay: number;
  tong_phong: number;
  tong_dat_phong: number;
  tong_nguoi_dung: number;
  tong_danh_gia: number;
  danh_gia_tuan: number;
  chenh_lech_hom_qua: string;
  danh_gia_moi: Review[];
};
export type Go = (
  page: string,
  filter?: { tu_ngay?: string; den_ngay?: string; don_id?: string },
) => void;

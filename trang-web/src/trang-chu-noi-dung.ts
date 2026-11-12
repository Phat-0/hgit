export type Khoi = {
  hien: boolean;
  tieu_de: string;
  noi_dung: string;
  anh: string;
};
export type NoiDungTrangChu = {
  hero: Khoi | null;
  gioi_thieu: Khoi | null;
  the: Khoi[];
  hien_phong: boolean;
  chan_trang: Khoi | null;
};
export const macDinh: NoiDungTrangChu = {
  hero: {
    hien: true,
    tieu_de: "Đổi không gian. Chạm cảm hứng.",
    noi_dung:
      "Một buổi hẹn, một đêm nghỉ, một chuyến đi. Chọn thời gian của bạn, tìm căn phòng vừa ý.",
    anh: "",
  },
  gioi_thieu: null,
  the: [],
  hien_phong: true,
  chan_trang: {
    hien: true,
    tieu_de: "HomeStay",
    noi_dung: "Đặt phòng theo giờ, theo ngày hoặc qua đêm.",
    anh: "",
  },
};

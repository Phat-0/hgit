export type GiaoDienTrangChu={ten_web:string;khau_hieu:string;tieu_de_phong:string;mau_nen:string;mau_nhan:string;so_cot:number;anh_ben_trai:boolean};
export const giaoDienMacDinh:GiaoDienTrangChu={ten_web:'HomeStay',khau_hieu:'MỘT KHOẢNG RIÊNG DÀNH CHO BẠN',tieu_de_phong:'Khám phá không gian',mau_nen:'#4d2078',mau_nhan:'#7135a3',so_cot:4,anh_ben_trai:false};
export type Khoi = {
  hien: boolean;
  tieu_de: string;
  noi_dung: string;
  anh: string;
};
export type NoiDungTrangChu = {
  giao_dien?:GiaoDienTrangChu;
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

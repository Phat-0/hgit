export type GiaoDienTrangChu={ten_web:string;khau_hieu:string;tieu_de_phong:string;tieu_de_combo?:string;mau_nen:string;anh_nen_chung?:string;font_chu?:string;phong_noi_bat?:string[];combo_noi_bat?:string[];hien_danh_gia?:boolean;hien_ban_do?:boolean;mau_nhan:string;so_cot:number;anh_ben_trai:boolean};
export const giaoDienMacDinh:GiaoDienTrangChu={ten_web:'HomeStay',khau_hieu:'Một khoảng riêng dành cho bạn',tieu_de_phong:'Phòng & không gian lưu trú',tieu_de_combo:'Combo & trải nghiệm',mau_nen:'#1e1813',mau_nhan:'#e9bd80',so_cot:3,anh_ben_trai:false};
export function layGiaoDien(value?:GiaoDienTrangChu) {
  const ui={...giaoDienMacDinh,...value};
  if(['#4d2078','#39205f','#6b329b'].includes(ui.mau_nen))ui.mau_nen=giaoDienMacDinh.mau_nen;
  if(ui.mau_nhan==='#7135a3')ui.mau_nhan=giaoDienMacDinh.mau_nhan;
  return ui;
}
export type Khoi = {
  hien: boolean;
  tieu_de: string;
  noi_dung: string;
  anh: string;
  anh_nen?: string;
  album?: string[];
  dia_chi?: string;
  dien_thoai?: string;
  email?: string;
};
export type NoiDungTrangChu = {
  giao_dien?:GiaoDienTrangChu;
  hero: Khoi | null;
  gioi_thieu: Khoi | null;
  the: Khoi[];
  hien_phong: boolean;
  hien_combo?: boolean;
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

export type GiaoDienTrangChu={nhan_dat_don?:string;toc_do_mo_dat_don?:number;tieu_de_thong_ke?:string;tieu_de_danh_gia?:string;hien_thong_ke?:boolean;hien_hoat_anh?:boolean;ten_web:string;khau_hieu:string;tieu_de_phong:string;tieu_de_combo?:string;mau_nen:string;anh_nen_chung?:string;font_chu?:string;phong_noi_bat?:string[];combo_noi_bat?:string[];hien_danh_gia?:boolean;hien_ban_do?:boolean;mau_nhan:string;so_cot:number;anh_ben_trai:boolean};
export const giaoDienMacDinh:GiaoDienTrangChu={ten_web:'HomeStay',khau_hieu:'Một khoảng riêng dành cho bạn',tieu_de_phong:'Phòng & không gian lưu trú',tieu_de_combo:'Combo & trải nghiệm',mau_nen:'#2b1e17',mau_nhan:'#e9bd80',so_cot:3,anh_ben_trai:false};
export function layGiaoDien(value?:GiaoDienTrangChu) {
  const ui={...giaoDienMacDinh,...value};
  if(['#4d2078','#39205f','#6b329b','#1e1813','#292018','#191817','#172c30'].includes(ui.mau_nen))ui.mau_nen=giaoDienMacDinh.mau_nen;
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
  bo_anh?: ({url:string}|{phong_id:string;anh_id:string})[];
  tieu_de_lien_ket?: string;
  tieu_de_ket_noi?: string;
  noi_dung_ket_noi?: string;
  nhan_nut?: string;
  zalo?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  chinh_sach?: string;
  bao_mat?: string;
  faq?: string;
  ban_quyen?: string;
  loi_ich_1?: string;
  loi_ich_2?: string;
  loi_ich_3?: string;
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

// Cùng điều kiện cho dữ liệu và số đơn trên tab; không đếm từ 300 dòng đã tải.
export const BO_LOC_DON:Record<string,string>={
 '':'TRUE',
 'Đã xác nhận':"trang_thai='Đã xác nhận' AND NOT khong_nhan_phong AND NOT can_xac_nhan_lai",
 'Đã nhận phòng':"trang_thai='Đã nhận phòng'",
 'Đã trả phòng':"trang_thai='Đã trả phòng'",
 'Đã hủy':"trang_thai='Đã hủy'",
 'Chờ xác nhận':"(trang_thai='Chờ xác nhận' OR (can_xac_nhan_lai AND trang_thai='Đã xác nhận')) AND NOT khong_nhan_phong",
 'Chưa nhận phòng':'khong_nhan_phong',
 'Chờ thanh toán':"trang_thai='Chờ thanh toán'",
 'Thanh toán':"trang_thai_thanh_toan IN ('Cọc','Chưa thanh toán') AND trang_thai NOT IN ('Đã hủy','Hết hạn')",
 'Chưa thanh toán':"trang_thai_thanh_toan IN ('Cọc','Chưa thanh toán') AND trang_thai NOT IN ('Đã hủy','Hết hạn')",
 'Đã thanh toán':"trang_thai_thanh_toan='Đủ'",
};
export const DON_CO_SO=`WITH danh_sach AS (
 SELECT d.id,d.ten_don,d.ma_dat_phong,d.hinh_thuc_dat,d.nhan_phong_luc,d.tra_phong_luc,
 d.trang_thai,d.tong_tien,d.tien_dich_vu,d.ghi_chu,d.ngay_tao,d.so_dien_thoai_dat,
 d.trang_thai_thanh_toan,d.tien_da_thanh_toan,d.khach_xac_nhan_den_luc,
 d.da_nhan_phong_luc,d.da_tra_phong_luc,d.can_xac_nhan_lai,
 COALESCE(NULLIF(NULLIF(btrim(d.ten_don),d.ma_dat_phong),''),NULLIF(btrim(n.ho_ten),''),'Chưa có tên khách') AS ho_ten,
 COALESCE(d.so_dien_thoai_dat,n.so_dien_thoai) AS so_dien_thoai,
 p.ten_phong,p.ma_phong,p.trang_thai_van_hanh AS tinh_trang_phong_hien_tai,
 l.ten_loai AS ten_loai_phong,h.ten_homestay,co.ten_combo AS combo,km.ten_khuyen_mai,
 (d.trang_thai IN ('Chờ xác nhận','Đã xác nhận')
  AND d.tra_phong_luc+interval '30 minutes'<=now()
  AND d.khach_xac_nhan_den_luc IS NULL AND d.da_nhan_phong_luc IS NULL) AS khong_nhan_phong
 FROM public.dat_phong d
 LEFT JOIN public.nguoi_dung n ON n.id=d.nguoi_dung_id
 LEFT JOIN public.phong p ON p.id=d.phong_id
 LEFT JOIN public.loai_phong l ON l.id=p.loai_phong_id
 LEFT JOIN public.homestay h ON h.id=d.homestay_id
 LEFT JOIN public.combo co ON co.id=d.combo_id
 LEFT JOIN public.su_dung_khuyen_mai sk ON sk.dat_phong_id=d.id
 LEFT JOIN public.khuyen_mai km ON km.id=sk.khuyen_mai_id
), ket_qua AS (
 SELECT *,ho_ten AS ten_khach FROM danh_sach WHERE ($1::text='' OR ma_dat_phong ILIKE '%'||$1||'%'
 OR ho_ten ILIKE '%'||$1||'%' OR COALESCE(so_dien_thoai,'') ILIKE '%'||$1||'%')
)`;
export function nhanTrangThaiDon(row:{trang_thai:string;khong_nhan_phong?:boolean;can_xac_nhan_lai?:boolean}){
 if(row.khong_nhan_phong)return 'Không nhận phòng';
 if(row.trang_thai==='Đã xác nhận'&&row.can_xac_nhan_lai)return 'Chờ xác nhận';
 return ({'Đã xác nhận':'Chờ nhận phòng','Đã trả phòng':'Hoàn thành'} as Record<string,string>)[row.trang_thai]||row.trang_thai;
}

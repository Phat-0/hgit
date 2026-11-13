// Doanh thu đặt phòng = giá trị đơn đã xác nhận/nhận/trả, theo ngày tạo đơn (giờ Việt Nam).
// Tách tiền đã thu khỏi doanh thu, không coi nhãn thanh toán là giao dịch thực thu.
export const DON_BAO_CAO = `WITH don AS (
 SELECT d.*, (d.ngay_tao AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS ngay,
 p.ten_phong,p.ma_phong,h.ten_homestay,l.ten_loai,
 COALESCE(NULLIF(d.ten_don,''),n.ho_ten,'Khách chưa đăng ký') AS ten_khach
 FROM public.dat_phong d JOIN public.phong p ON p.id=d.phong_id
 JOIN public.homestay h ON h.id=d.homestay_id JOIN public.loai_phong l ON l.id=p.loai_phong_id
 LEFT JOIN public.nguoi_dung n ON n.id=d.nguoi_dung_id
 WHERE d.ngay_tao >= $1::date AT TIME ZONE 'Asia/Ho_Chi_Minh'
 AND d.ngay_tao < ($2::date+1) AT TIME ZONE 'Asia/Ho_Chi_Minh'
 AND ($3::uuid IS NULL OR d.homestay_id=$3)
)`;
export const DOANH_THU = `coalesce(sum(tong_tien) FILTER(WHERE trang_thai IN ('Đã xác nhận','Đã nhận phòng','Đã trả phòng')),0)`;
export const THEO_NGAY =
  DON_BAO_CAO +
  ` SELECT s::date::text AS ngay,
 count(d.id)::int AS so_don,count(d.id) FILTER(WHERE trang_thai='Đã hủy')::int AS so_huy,
 ${DOANH_THU} AS doanh_thu,
 coalesce(sum(tien_phong) FILTER(WHERE trang_thai IN ('Đã xác nhận','Đã nhận phòng','Đã trả phòng')),0) AS tien_phong,
 coalesce(sum(tien_dich_vu) FILTER(WHERE trang_thai IN ('Đã xác nhận','Đã nhận phòng','Đã trả phòng')),0) AS tien_dich_vu,
 coalesce(sum(tien_giam) FILTER(WHERE trang_thai IN ('Đã xác nhận','Đã nhận phòng','Đã trả phòng')),0) AS tien_giam
 FROM generate_series($1::date,$2::date,'1 day') s LEFT JOIN don d ON d.ngay=s::date
 GROUP BY s ORDER BY s`;
export const THEO_NHOM = (
  key:
    'hinh_thuc_dat' | 'ten_homestay' | 'trang_thai' | 'trang_thai_thanh_toan',
) =>
  DON_BAO_CAO +
  ` SELECT ${key} AS ten,count(*)::int AS so_don,count(*) FILTER(WHERE trang_thai='Đã hủy')::int AS so_huy,
 ${DOANH_THU} AS doanh_thu FROM don GROUP BY ${key} ORDER BY so_don DESC,ten`;

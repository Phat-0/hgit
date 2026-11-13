// Hiển thị theo thời gian thực, không đổi trạng thái bằng một API GET.
export const TRANG_THAI_PHONG = `(CASE
 WHEN p.trang_thai_van_hanh IN ('Bảo trì','Bị khóa') THEN p.trang_thai_van_hanh
 WHEN EXISTS(SELECT 1 FROM public.dat_phong d WHERE d.phong_id=p.id AND d.trang_thai IN ('Đã xác nhận','Đã nhận phòng') AND (d.nhan_phong_luc<=now() OR d.da_nhan_phong_luc<=now()) AND d.tra_phong_luc>now()) THEN 'Đang sử dụng'
 WHEN EXISTS(SELECT 1 FROM public.chan_lich_phong k WHERE k.phong_id=p.id AND k.bat_dau<=now() AND k.ket_thuc>now()) THEN (SELECT k.trang_thai_phong FROM public.chan_lich_phong k WHERE k.phong_id=p.id AND k.bat_dau<=now() AND k.ket_thuc>now() ORDER BY k.bat_dau DESC LIMIT 1)
 WHEN EXISTS(SELECT 1 FROM public.dat_phong d WHERE d.phong_id=p.id AND d.trang_thai IN ('Đã xác nhận','Đã nhận phòng','Đã trả phòng') AND COALESCE(d.da_tra_phong_luc,d.tra_phong_luc)<=now() AND COALESCE(d.da_tra_phong_luc,d.tra_phong_luc)>COALESCE(p.trang_thai_cap_nhat_luc,'-infinity'::timestamptz)) THEN 'Đang dọn'
 ELSE p.trang_thai_van_hanh END)`;

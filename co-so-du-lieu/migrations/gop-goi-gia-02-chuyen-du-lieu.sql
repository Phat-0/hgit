-- PHA 2, CHUA CHAY. Chi chay sau khi lap/duyet doi_chieu_gop_goi_gia.
-- Vi du mapping phai ghi gia_phong_truoc dung voi gia phong hien tai de chan ghi de ngoai y muon.
-- Theo ngay khong co nguon ro rang: cau hinh truc tiep tren Phong sau trien khai; khong doi nhan don dem cu.
BEGIN;
LOCK TABLE public.phong,public.goi_gia,public.quy_tac_gia,public.doi_chieu_gop_goi_gia IN SHARE ROW EXCLUSIVE MODE;
DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.doi_chieu_gop_goi_gia) THEN
  RAISE EXCEPTION 'Chua co mapping; khong chuyen du lieu';
 END IF;
 IF EXISTS(SELECT 1 FROM public.doi_chieu_gop_goi_gia m
 JOIN public.phong p ON p.id=m.phong_id JOIN public.goi_gia g ON g.id=m.goi_gia_id
 WHERE NOT m.da_duyet OR trim(m.ghi_chu)='' OR p.loai_phong_id<>g.loai_phong_id
 OR m.hinh_thuc_dat<>g.hinh_thuc_dat OR g.gia_co_ban<>trunc(g.gia_co_ban)
 OR m.gia_phong_truoc IS DISTINCT FROM CASE m.hinh_thuc_dat WHEN 'Theo giờ' THEN p.gia_moi_gio WHEN 'Theo ngày' THEN p.gia_moi_ngay ELSE p.gia_moi_dem END
 OR (m.hinh_thuc_dat='Theo giờ' AND (m.so_gio_toi_thieu IS NULL OR (g.so_gio_toi_thieu IS NOT NULL AND m.so_gio_toi_thieu<>g.so_gio_toi_thieu))))
 THEN RAISE EXCEPTION 'Mapping chua duyet, khac gia, khac loai/hinh thuc, gia le hoac thieu so gio'; END IF;
 -- Moi phong co goi dang ban phai duoc doi chieu; nhieu goi can chon ro nguon trong mapping.
 IF EXISTS(SELECT 1 FROM public.phong p JOIN public.goi_gia g ON g.loai_phong_id=p.loai_phong_id AND g.hieu_luc
 WHERE NOT EXISTS(SELECT 1 FROM public.doi_chieu_gop_goi_gia m WHERE m.phong_id=p.id AND m.hinh_thuc_dat=g.hinh_thuc_dat))
 THEN RAISE EXCEPTION 'Con phong/hinh thuc dang ban chua co mapping'; END IF;
 IF EXISTS(SELECT 1 FROM public.quy_tac_gia q JOIN public.doi_chieu_gop_goi_gia m ON m.goi_gia_id=q.goi_gia_id
 WHERE q.gia_ap_dung<>trunc(q.gia_ap_dung)) THEN RAISE EXCEPTION 'Quy tac co gia le, can doi chieu'; END IF;
END $$;
-- Luu toan bo gia tri Phong truoc backfill de doi chieu/rollback thu cong cung backup.
CREATE TABLE public.sao_luu_phong_truoc_gop_gia AS SELECT p.* FROM public.phong p
WHERE EXISTS(SELECT 1 FROM public.doi_chieu_gop_goi_gia m WHERE m.phong_id=p.id);
ALTER TABLE public.sao_luu_phong_truoc_gop_gia ENABLE ROW LEVEL SECURITY;
UPDATE public.phong p SET gia_moi_gio=g.gia_co_ban,so_gio_toi_thieu=m.so_gio_toi_thieu,mo_ban_theo_gio=g.hieu_luc
FROM public.doi_chieu_gop_goi_gia m JOIN public.goi_gia g ON g.id=m.goi_gia_id WHERE p.id=m.phong_id AND m.hinh_thuc_dat='Theo giờ';
UPDATE public.phong p SET gia_moi_ngay=g.gia_co_ban,mo_ban_theo_ngay=g.hieu_luc
FROM public.doi_chieu_gop_goi_gia m JOIN public.goi_gia g ON g.id=m.goi_gia_id WHERE p.id=m.phong_id AND m.hinh_thuc_dat='Theo ngày';
UPDATE public.phong p SET gia_moi_dem=g.gia_co_ban,mo_ban_theo_dem=g.hieu_luc
FROM public.doi_chieu_gop_goi_gia m JOIN public.goi_gia g ON g.id=m.goi_gia_id WHERE p.id=m.phong_id AND m.hinh_thuc_dat='Theo đêm';
INSERT INTO public.gia_lich_phong(phong_id,loai_gia,bat_dau,ket_thuc,gia,ten,muc_uu_tien,nguon_quy_tac_id)
SELECT m.phong_id,CASE m.hinh_thuc_dat WHEN 'Theo giờ' THEN 'gio' WHEN 'Theo ngày' THEN 'ngay' ELSE 'qua-dem' END,
 q.bat_dau,q.ket_thuc,q.gia_ap_dung,q.ten_quy_tac,q.muc_uu_tien,q.id
FROM public.doi_chieu_gop_goi_gia m JOIN public.quy_tac_gia q ON q.goi_gia_id=m.goi_gia_id;
-- INSERT khong ON CONFLICT: chay lai se dung thay vi tao/ghi de gia am tham.
COMMIT;

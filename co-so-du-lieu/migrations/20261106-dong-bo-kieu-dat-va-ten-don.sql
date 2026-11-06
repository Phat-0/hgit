-- Đồng bộ đơn đặt phòng và giá theo phòng. Áp dụng SAU các migration hiện hữu.
-- Không xóa đơn, phòng, gói hoặc quy tắc cũ. Chạy một lần bằng role postgres.
-- Giá phòng đang có khác 0 được giữ nguyên; chỉ bổ sung từ gói khi chưa có giá.
BEGIN;
LOCK TABLE public.phong,public.goi_gia,public.dat_phong,public.quy_tac_gia IN SHARE ROW EXCLUSIVE MODE;

-- Dừng toàn bộ transaction nếu không thể chọn cấu hình giờ cơ bản duy nhất.
DO $$ BEGIN
 IF EXISTS (
  SELECT 1 FROM public.goi_gia WHERE hieu_luc AND hinh_thuc_dat='Theo giờ'
  GROUP BY loai_phong_id HAVING count(DISTINCT (gia_co_ban,so_gio_toi_thieu))>1
 ) THEN RAISE EXCEPTION 'Có nhiều cấu hình gói giờ đang bán trên một loại phòng; cần mapping trước khi chuyển'; END IF;
 IF EXISTS (SELECT 1 FROM public.goi_gia WHERE hinh_thuc_dat='Theo giờ' AND hieu_luc AND (so_gio_toi_thieu IS NULL OR so_gio_toi_thieu<1 OR so_gio_toi_thieu>744))
 THEN RAISE EXCEPTION 'Gói giờ đang bán thiếu số giờ tối thiểu hợp lệ'; END IF;
 IF EXISTS (SELECT 1 FROM public.goi_gia WHERE hieu_luc AND hinh_thuc_dat='Theo đêm'
  GROUP BY loai_phong_id HAVING count(DISTINCT gia_co_ban)>1)
 THEN RAISE EXCEPTION 'Có nhiều giá đêm đang bán trên một loại phòng; cần mapping trước khi chuyển'; END IF;
END $$;

ALTER TABLE public.phong
 ADD COLUMN IF NOT EXISTS gia_moi_gio numeric(14,0) NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS gia_moi_ngay numeric(14,0) NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS gia_moi_dem numeric(14,0) NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS gia_phu_thu_gio numeric(14,0) NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS so_gio_toi_thieu integer NOT NULL DEFAULT 1,
 ADD COLUMN IF NOT EXISTS cho_dat_theo_gio boolean NOT NULL DEFAULT true,
 ADD COLUMN IF NOT EXISTS cho_dat_theo_ngay boolean NOT NULL DEFAULT true,
 ADD COLUMN IF NOT EXISTS cho_dat_theo_dem boolean NOT NULL DEFAULT true;
ALTER TABLE public.phong ADD CONSTRAINT phong_so_gio_toi_thieu_check CHECK(so_gio_toi_thieu BETWEEN 1 AND 744);

UPDATE public.phong p SET
 gia_moi_gio=CASE WHEN p.gia_moi_gio=0 AND g.gia IS NOT NULL THEN g.gia ELSE p.gia_moi_gio END,
 so_gio_toi_thieu=COALESCE(g.so_gio,p.so_gio_toi_thieu),
 cho_dat_theo_gio=g.dang_ban
FROM (SELECT loai_phong_id,bool_or(hieu_luc) AS dang_ban,
 min(gia_co_ban) FILTER(WHERE hieu_luc) AS gia,
 min(so_gio_toi_thieu) FILTER(WHERE hieu_luc) AS so_gio
 FROM public.goi_gia WHERE hinh_thuc_dat='Theo giờ' GROUP BY loai_phong_id) g
WHERE p.loai_phong_id=g.loai_phong_id;
UPDATE public.phong p SET
 gia_moi_dem=CASE WHEN p.gia_moi_dem=0 AND g.gia IS NOT NULL THEN g.gia ELSE p.gia_moi_dem END,
 cho_dat_theo_dem=g.dang_ban
FROM (SELECT loai_phong_id,bool_or(hieu_luc) AS dang_ban,
 min(gia_co_ban) FILTER(WHERE hieu_luc) AS gia
 FROM public.goi_gia WHERE hinh_thuc_dat='Theo đêm' GROUP BY loai_phong_id) g
WHERE p.loai_phong_id=g.loai_phong_id;
-- Không suy diễn gói Theo ngày từ tên gói cũ; giá ngày hiện hữu trên phòng được giữ.
ALTER TABLE public.phong ADD CONSTRAINT phong_gia_khong_am_check CHECK(gia_moi_gio>=0 AND gia_moi_ngay>=0 AND gia_moi_dem>=0 AND gia_phu_thu_gio>=0);
COMMENT ON COLUMN public.phong.gia_moi_gio IS 'Giá trọn so_gio_toi_thieu giờ đầu, VND';
COMMENT ON COLUMN public.phong.cho_dat_theo_gio IS 'Bật/tắt nhận đặt Theo giờ, riêng với trạng thái vận hành';

DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='nguoi_dung' AND column_name='so_dien_tho')
 AND NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='nguoi_dung' AND column_name='so_dien_thoai') THEN
 ALTER TABLE public.nguoi_dung RENAME COLUMN so_dien_tho TO so_dien_thoai;
 END IF;
END $$;

ALTER TABLE public.dat_phong
 ADD COLUMN IF NOT EXISTS ten_don text,
 ADD COLUMN IF NOT EXISTS cau_hinh_gia_chot jsonb;
UPDATE public.dat_phong SET ten_don=ma_dat_phong WHERE ten_don IS NULL OR btrim(ten_don)='';
ALTER TABLE public.dat_phong ALTER COLUMN ten_don SET NOT NULL;
ALTER TABLE public.dat_phong ADD CONSTRAINT dat_phong_ten_don_check CHECK(length(btrim(ten_don)) BETWEEN 1 AND 150);
-- Giữ FK cũ để đọc lịch sử; đơn mới không còn cần gói giá.
ALTER TABLE public.dat_phong ALTER COLUMN goi_gia_id DROP NOT NULL;
ALTER TABLE public.dat_phong DROP CONSTRAINT IF EXISTS dat_phong_hinh_thuc_dat_check;
ALTER TABLE public.dat_phong ADD CONSTRAINT dat_phong_hinh_thuc_dat_check CHECK(hinh_thuc_dat IN ('Theo giờ','Theo ngày','Theo đêm'));
-- Snapshot lịch sử chỉ sao lưu thực tế đã lưu; không gán giá hiện tại thành giá quá khứ.
UPDATE public.dat_phong d SET cau_hinh_gia_chot=jsonb_build_object(
 'nguon','du_lieu_cu','goi_gia_cu_id',d.goi_gia_id,'hinh_thuc_dat',d.hinh_thuc_dat,
 'tien_phong_chot',d.tien_phong,'tong_tien_chot',d.tong_tien)
WHERE cau_hinh_gia_chot IS NULL;

CREATE TABLE public.cau_hinh_gio_dat_phong (
 id smallint PRIMARY KEY DEFAULT 1 CHECK(id=1),
 khung_gio jsonb NOT NULL CHECK(jsonb_typeof(khung_gio)='object'),
 ngay_cap_nhat timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.cau_hinh_gio_dat_phong(id,khung_gio) VALUES(1,
 '{"ngay_tu":"14:00","ngay_den":"12:00","gio_tu":"08:00","gio_den":"22:00","dem_tu":"20:00","dem_den":"08:00"}');
ALTER TABLE public.cau_hinh_gio_dat_phong ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cau_hinh_gio_dat_phong FROM anon,authenticated;

-- Chuyển quy tắc cũ theo phòng, giữ dấu vết và thứ tự ưu tiên.
ALTER TABLE public.gia_lich_phong
 ADD COLUMN IF NOT EXISTS muc_uu_tien integer NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS quy_tac_gia_cu_id uuid;
CREATE UNIQUE INDEX gia_lich_quy_tac_cu_phong ON public.gia_lich_phong(phong_id,quy_tac_gia_cu_id) WHERE quy_tac_gia_cu_id IS NOT NULL;
INSERT INTO public.gia_lich_phong(phong_id,loai_gia,bat_dau,ket_thuc,gia,ten,muc_uu_tien,quy_tac_gia_cu_id)
SELECT p.id,CASE g.hinh_thuc_dat WHEN 'Theo giờ' THEN 'gio' ELSE 'qua-dem' END,
 q.bat_dau,q.ket_thuc,q.gia_ap_dung,q.ten_quy_tac,q.muc_uu_tien,q.id
FROM public.quy_tac_gia q JOIN public.goi_gia g ON g.id=q.goi_gia_id
JOIN public.phong p ON p.loai_phong_id=g.loai_phong_id
WHERE g.hieu_luc;

-- Giữ nguyên exclusion constraints và trigger khóa phòng chống đặt trùng.
-- goi_gia/quy_tac_gia cũ còn nguyên để bảo toàn lịch sử/FK ngoài repo.
-- Runtime mới không đọc chúng. Không DROP CASCADE hay xóa dữ liệu.
COMMIT;

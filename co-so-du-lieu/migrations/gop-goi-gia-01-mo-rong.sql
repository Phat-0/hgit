-- PHA 1, CHUA CHAY SUPABASE. Can backup va audit truoc khi ap dung.
-- Khong xoa bang, khong chuyen gia tu dong, khong sua tien don cu.
BEGIN;
ALTER TABLE public.phong
 ADD COLUMN IF NOT EXISTS so_gio_toi_thieu integer,
 ADD COLUMN IF NOT EXISTS mo_ban_theo_gio boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS mo_ban_theo_ngay boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS mo_ban_theo_dem boolean NOT NULL DEFAULT false;
ALTER TABLE public.phong ADD CONSTRAINT phong_gio_toi_thieu_hop_le
 CHECK (so_gio_toi_thieu IS NULL OR so_gio_toi_thieu BETWEEN 1 AND 744);
ALTER TABLE public.phong ADD CONSTRAINT phong_mo_ban_gio_can_cau_hinh
 CHECK (NOT mo_ban_theo_gio OR so_gio_toi_thieu IS NOT NULL);
COMMENT ON COLUMN public.phong.gia_moi_gio IS 'Gia tron so_gio_toi_thieu gio dau; vuot gio dung gia_phu_thu_gio.';
ALTER TABLE public.dat_phong ALTER COLUMN goi_gia_id DROP NOT NULL;
-- Chi thay CHECK da biet trong schema nguon; constraint bat ngo se lam migration dung.
ALTER TABLE public.dat_phong DROP CONSTRAINT dat_phong_hinh_thuc_dat_check;
ALTER TABLE public.dat_phong ADD CONSTRAINT dat_phong_hinh_thuc_dat_check
 CHECK (hinh_thuc_dat IN ('Theo giờ','Theo ngày','Theo đêm'));
ALTER TABLE public.dat_phong ADD COLUMN IF NOT EXISTS cau_hinh_gia_ap_dung jsonb;
-- Don cu giu nguyen goi_gia_id va tien; khong tao snapshot gia moi cho don cu.
ALTER TABLE public.combo ADD COLUMN IF NOT EXISTS so_gio_bao_gom integer
 CHECK (so_gio_bao_gom IS NULL OR so_gio_bao_gom BETWEEN 1 AND 744);
ALTER TABLE public.dat_phong ADD COLUMN IF NOT EXISTS combo_id uuid REFERENCES public.combo(id) ON DELETE RESTRICT;
ALTER TABLE public.gia_lich_phong ADD COLUMN IF NOT EXISTS muc_uu_tien integer NOT NULL DEFAULT 0;
ALTER TABLE public.gia_lich_phong ADD COLUMN IF NOT EXISTS nguon_quy_tac_id uuid REFERENCES public.quy_tac_gia(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_gia_lich_nguon_quy_tac ON public.gia_lich_phong(phong_id,loai_gia,nguon_quy_tac_id);

CREATE TABLE public.thiet_lap_gio_dat_phong (
 id boolean PRIMARY KEY DEFAULT true CHECK(id),
 ngay_tu text NOT NULL DEFAULT '14:00',ngay_den text NOT NULL DEFAULT '12:00',
 gio_tu text NOT NULL DEFAULT '08:00',gio_den text NOT NULL DEFAULT '22:00',
 dem_tu text NOT NULL DEFAULT '20:00',dem_den text NOT NULL DEFAULT '08:00',
 CHECK (ngay_tu ~ '^([01][0-9]|2[0-3]):(00|30)$' AND ngay_den ~ '^([01][0-9]|2[0-3]):(00|30)$'
 AND gio_tu ~ '^([01][0-9]|2[0-3]):(00|30)$' AND gio_den ~ '^([01][0-9]|2[0-3]):(00|30)$'
 AND dem_tu ~ '^([01][0-9]|2[0-3]):(00|30)$' AND dem_den ~ '^([01][0-9]|2[0-3]):(00|30)$')
);
INSERT INTO public.thiet_lap_gio_dat_phong(id) VALUES(true);
ALTER TABLE public.thiet_lap_gio_dat_phong ENABLE ROW LEVEL SECURITY;
-- Chi backend quan tri truy cap; khong mo policy cong khai.
CREATE TABLE public.doi_chieu_gop_goi_gia (
 phong_id uuid NOT NULL REFERENCES public.phong(id) ON DELETE RESTRICT,
 hinh_thuc_dat text NOT NULL CHECK(hinh_thuc_dat IN ('Theo giờ','Theo ngày','Theo đêm')),
 goi_gia_id uuid NOT NULL REFERENCES public.goi_gia(id) ON DELETE RESTRICT,
 so_gio_toi_thieu integer CHECK(so_gio_toi_thieu BETWEEN 1 AND 744),
 gia_phong_truoc numeric NOT NULL CHECK(gia_phong_truoc>=0),
 da_duyet boolean NOT NULL DEFAULT false, ghi_chu text NOT NULL,
 PRIMARY KEY(phong_id,hinh_thuc_dat)
);
ALTER TABLE public.doi_chieu_gop_goi_gia ENABLE ROW LEVEL SECURITY;
-- Khong tu tao mapping: phai doi chieu gia, NULL so gio, hieu_luc va nhieu goi.
COMMIT;

BEGIN;
-- Giữ nguyên combo cũ, giá chốt và mọi khóa ngoại của đơn đặt phòng.
LOCK TABLE public.combo IN SHARE ROW EXCLUSIVE MODE;
ALTER TABLE public.dat_phong ADD COLUMN IF NOT EXISTS combo_id uuid REFERENCES public.combo(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_dat_phong_combo ON public.dat_phong(combo_id);
ALTER TABLE public.combo ALTER COLUMN homestay_id DROP NOT NULL;
ALTER TABLE public.combo ADD COLUMN IF NOT EXISTS so_gio_bao_gom integer;
ALTER TABLE public.combo ADD COLUMN IF NOT EXISTS anh_dai_dien text;
ALTER TABLE public.combo ADD COLUMN IF NOT EXISTS bat_dau timestamptz;
ALTER TABLE public.combo ADD COLUMN IF NOT EXISTS ket_thuc timestamptz;
ALTER TABLE public.combo ADD COLUMN IF NOT EXISTS pham_vi text NOT NULL DEFAULT 'chi_nhanh';
ALTER TABLE public.combo ADD CONSTRAINT combo_pham_vi_hop_le CHECK(pham_vi IN ('toan_he_thong','chi_nhanh','phong'));
ALTER TABLE public.combo ADD CONSTRAINT combo_khoang_ap_dung CHECK(bat_dau IS NULL OR ket_thuc IS NULL OR bat_dau<ket_thuc);
ALTER TABLE public.combo ADD CONSTRAINT combo_gio_hop_le CHECK(so_gio_bao_gom IS NULL OR so_gio_bao_gom BETWEEN 1 AND 744);
CREATE TABLE public.combo_chi_nhanh (
 combo_id uuid NOT NULL REFERENCES public.combo(id) ON DELETE CASCADE,
 homestay_id uuid NOT NULL REFERENCES public.homestay(id) ON DELETE RESTRICT,
 PRIMARY KEY(combo_id,homestay_id)
);
CREATE TABLE public.combo_phong (
 combo_id uuid NOT NULL REFERENCES public.combo(id) ON DELETE CASCADE,
 phong_id uuid NOT NULL REFERENCES public.phong(id) ON DELETE RESTRICT,
 PRIMARY KEY(combo_id,phong_id)
);
INSERT INTO public.combo_chi_nhanh(combo_id,homestay_id) SELECT id,homestay_id FROM public.combo WHERE homestay_id IS NOT NULL;
UPDATE public.combo SET pham_vi='toan_he_thong' WHERE homestay_id IS NULL;
CREATE INDEX ON public.combo_chi_nhanh(homestay_id);
CREATE INDEX ON public.combo_phong(phong_id);
ALTER TABLE public.combo_chi_nhanh ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_phong ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.combo_chi_nhanh,public.combo_phong FROM anon,authenticated;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('anh-combo','anh-combo',false,5242880,ARRAY['image/jpeg','image/png','image/webp']::text[])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;
COMMIT;

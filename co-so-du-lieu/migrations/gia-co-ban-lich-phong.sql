ALTER TABLE public.phong ADD COLUMN IF NOT EXISTS gia_moi_gio numeric(14,0) NOT NULL DEFAULT 0;
ALTER TABLE public.phong ADD COLUMN IF NOT EXISTS gia_moi_ngay numeric(14,0) NOT NULL DEFAULT 0;
ALTER TABLE public.phong ADD COLUMN IF NOT EXISTS gia_phu_thu_gio numeric(14,0) NOT NULL DEFAULT 0;

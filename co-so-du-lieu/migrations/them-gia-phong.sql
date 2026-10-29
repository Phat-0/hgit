-- Chạy một lần trong Supabase SQL Editor trước khi chạy phiên bản backend mới.
ALTER TABLE public.phong ADD COLUMN IF NOT EXISTS gia_moi_dem numeric(14,0) NOT NULL DEFAULT 0 CHECK (gia_moi_dem >= 0);
COMMENT ON COLUMN public.phong.gia_moi_dem IS 'Giá niêm yết tham khảo cho một đêm, đơn vị VND. Không thay thế bảng giá theo giờ/ngày và giá động.';

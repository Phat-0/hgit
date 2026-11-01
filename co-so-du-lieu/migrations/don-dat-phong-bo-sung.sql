-- Mở rộng thông tin đơn đặt phòng; không đổi các giá trị trạng thái cũ.
-- Chạy trong Supabase SQL Editor sau khi đã có public.dat_phong.
ALTER TABLE public.dat_phong ADD COLUMN IF NOT EXISTS ten_combo text;
CREATE TABLE IF NOT EXISTS public.anh_don_dat_phong (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 dat_phong_id uuid NOT NULL REFERENCES public.dat_phong(id) ON DELETE CASCADE,
 duong_dan text NOT NULL,
 ten_tep text,
 ngay_tao timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_anh_don_dat_phong_dat_phong ON public.anh_don_dat_phong(dat_phong_id);
ALTER TABLE public.anh_don_dat_phong ENABLE ROW LEVEL SECURITY;
-- Ảnh được truy cập qua API có phân quyền; không tạo policy đọc công khai.

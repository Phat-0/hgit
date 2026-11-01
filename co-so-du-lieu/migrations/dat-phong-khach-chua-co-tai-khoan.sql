-- Chạy một lần trong Supabase SQL Editor, sau schema gốc.
-- Đơn khách chưa có tài khoản được gắn số điện thoại; chỉ nhận đơn sau xác minh OTP.
ALTER TABLE public.dat_phong ALTER COLUMN nguoi_dung_id DROP NOT NULL;
ALTER TABLE public.dat_phong ADD COLUMN IF NOT EXISTS so_dien_thoai_dat text;
ALTER TABLE public.dat_phong ADD COLUMN IF NOT EXISTS nguon_dat text NOT NULL DEFAULT 'quan_tri';
ALTER TABLE public.dat_phong ADD COLUMN IF NOT EXISTS can_xac_nhan_lai boolean NOT NULL DEFAULT false;
ALTER TABLE public.dat_phong ADD COLUMN IF NOT EXISTS trang_thai_thanh_toan text NOT NULL DEFAULT 'Chưa thanh toán';
ALTER TABLE public.dat_phong ADD COLUMN IF NOT EXISTS tien_da_thanh_toan numeric(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.dat_phong ADD COLUMN IF NOT EXISTS khach_xac_nhan_den_luc timestamptz;
ALTER TABLE public.dat_phong ADD COLUMN IF NOT EXISTS da_nhan_phong_luc timestamptz;
ALTER TABLE public.dat_phong ADD COLUMN IF NOT EXISTS da_tra_phong_luc timestamptz;
ALTER TABLE public.dat_phong ADD COLUMN IF NOT EXISTS nguoi_xac_nhan_id uuid REFERENCES public.nguoi_dung(id);
ALTER TABLE public.dat_phong ADD COLUMN IF NOT EXISTS xac_nhan_luc timestamptz;
ALTER TABLE public.dat_phong DROP CONSTRAINT IF EXISTS dat_phong_trang_thai_thanh_toan_check;
ALTER TABLE public.dat_phong ADD CONSTRAINT dat_phong_trang_thai_thanh_toan_check CHECK (trang_thai_thanh_toan IN ('Chưa thanh toán','Cọc','Đủ'));
ALTER TABLE public.dat_phong DROP CONSTRAINT IF EXISTS dat_phong_nguon_dat_check;
ALTER TABLE public.dat_phong ADD CONSTRAINT dat_phong_nguon_dat_check CHECK (nguon_dat IN ('khach','quan_tri','nhan_vien'));
CREATE INDEX IF NOT EXISTS idx_dat_phong_so_dien_thoai_dat ON public.dat_phong(so_dien_thoai_dat) WHERE nguoi_dung_id IS NULL;
CREATE TABLE IF NOT EXISTS public.nhat_ky_don_dat_phong (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 dat_phong_id uuid NOT NULL REFERENCES public.dat_phong(id) ON DELETE CASCADE,
 nguoi_thuc_hien_id uuid REFERENCES public.nguoi_dung(id) ON DELETE SET NULL,
 hanh_dong text NOT NULL,
 du_lieu_cu jsonb,
 du_lieu_moi jsonb,
 ngay_tao timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nhat_ky_don_dat_phong ON public.nhat_ky_don_dat_phong(dat_phong_id,ngay_tao DESC);
ALTER TABLE public.nhat_ky_don_dat_phong ENABLE ROW LEVEL SECURITY;
-- Không cấp quyền công khai cho bảng nhật ký; backend quản trị xử lý.
-- Không đổi trạng thái đặt phòng sang "Chưa nhận phòng" vì trạng thái này
-- không thuộc CHECK gốc và sẽ làm thay đổi logic chống trùng lịch.
-- Trạng thái "Chưa nhận phòng" là nhãn suy ra sau 30 phút từ giờ CHECKOUT.

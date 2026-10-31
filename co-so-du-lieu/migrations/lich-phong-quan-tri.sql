-- Giá mặc định ở public.phong; giá điều chỉnh theo lịch ở public.gia_lich_phong.
-- Migration không xóa dữ liệu đã có.
ALTER TABLE public.chan_lich_phong ADD COLUMN IF NOT EXISTS loai_khoa text NOT NULL DEFAULT 'gio';
ALTER TABLE public.chan_lich_phong ADD COLUMN IF NOT EXISTS co_dinh boolean NOT NULL DEFAULT false;
ALTER TABLE public.phong ADD COLUMN IF NOT EXISTS gia_moi_gio numeric(14,0) NOT NULL DEFAULT 0;
ALTER TABLE public.phong ADD COLUMN IF NOT EXISTS gia_moi_ngay numeric(14,0) NOT NULL DEFAULT 0;
ALTER TABLE public.phong ADD COLUMN IF NOT EXISTS gia_moi_dem numeric(14,0) NOT NULL DEFAULT 0;
ALTER TABLE public.phong ADD COLUMN IF NOT EXISTS gia_phu_thu_gio numeric(14,0) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.gia_lich_phong (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 phong_id uuid NOT NULL REFERENCES public.phong(id) ON DELETE CASCADE,
 loai_gia text NOT NULL CHECK (loai_gia IN ('ngay','gio','qua-dem')),
 bat_dau timestamptz NOT NULL,
 ket_thuc timestamptz NOT NULL,
 gia numeric(14,0) NOT NULL CHECK (gia >= 0),
 phu_thu_gio numeric(14,0) CHECK (phu_thu_gio >= 0),
 ten text,
 thu_trong_tuan integer[],
 ngay_tao timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT gia_lich_phong_khoang_hop_le CHECK (bat_dau < ket_thuc)
);
ALTER TABLE public.gia_lich_phong ADD COLUMN IF NOT EXISTS phu_thu_gio numeric(14,0);
ALTER TABLE public.gia_lich_phong ADD COLUMN IF NOT EXISTS ten text;
ALTER TABLE public.gia_lich_phong ADD COLUMN IF NOT EXISTS thu_trong_tuan integer[];
ALTER TABLE public.gia_lich_phong ADD COLUMN IF NOT EXISTS ngay_tao timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_gia_lich_phong_phong_khoang ON public.gia_lich_phong(phong_id,bat_dau,ket_thuc);
ALTER TABLE public.gia_lich_phong ENABLE ROW LEVEL SECURITY;
-- Không tạo policy công khai: chỉ truy cập từ backend quản trị bằng kết nối PostgreSQL có quyền.

-- Cấu hình Trang chủ: public chỉ đọc qua API; bảng không mở quyền trực tiếp.
CREATE TABLE IF NOT EXISTS public.cau_hinh_trang_chu (
 id smallint PRIMARY KEY CHECK(id=1),
 ban_nhap jsonb NOT NULL CHECK(jsonb_typeof(ban_nhap)='object'),
 da_xuat_ban jsonb NOT NULL CHECK(jsonb_typeof(da_xuat_ban)='object'),
 phien_ban integer NOT NULL DEFAULT 1 CHECK(phien_ban>0),
 nguoi_sua_id uuid REFERENCES public.nguoi_dung(id) ON DELETE SET NULL,
 ngay_cap_nhat timestamptz NOT NULL DEFAULT now(),
 xuat_ban_luc timestamptz
);
ALTER TABLE public.cau_hinh_trang_chu ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cau_hinh_trang_chu FROM anon,authenticated;
INSERT INTO public.cau_hinh_trang_chu(id,ban_nhap,da_xuat_ban,xuat_ban_luc)
VALUES(1,'{"hero": {"hien": true, "tieu_de": "Đổi không gian. Chạm cảm hứng.", "noi_dung": "Một buổi hẹn, một đêm nghỉ, một chuyến đi. Chọn thời gian của bạn, tìm căn phòng vừa ý.", "anh": ""}, "gioi_thieu": {"hien": false, "tieu_de": "Một khoảng riêng dành cho bạn", "noi_dung": "", "anh": ""}, "the": [], "hien_phong": true, "chan_trang": {"hien": true, "tieu_de": "HomeStay", "noi_dung": "Đặt phòng theo giờ, theo ngày hoặc qua đêm.", "anh": ""}}'::jsonb,'{"hero": {"hien": true, "tieu_de": "Đổi không gian. Chạm cảm hứng.", "noi_dung": "Một buổi hẹn, một đêm nghỉ, một chuyến đi. Chọn thời gian của bạn, tìm căn phòng vừa ý.", "anh": ""}, "gioi_thieu": {"hien": false, "tieu_de": "Một khoảng riêng dành cho bạn", "noi_dung": "", "anh": ""}, "the": [], "hien_phong": true, "chan_trang": {"hien": true, "tieu_de": "HomeStay", "noi_dung": "Đặt phòng theo giờ, theo ngày hoặc qua đêm.", "anh": ""}}'::jsonb,now()) ON CONFLICT(id) DO NOTHING;
-- Ảnh marketing công khai; tải lên chỉ qua backend quản trị, không cấp policy ghi cho anon.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('anh-trang-chu','anh-trang-chu',true,5242880,ARRAY['image/jpeg','image/png','image/webp']) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.migrations_ung_dung(phien_ban) VALUES('20261112-quan-ly-trang-chu') ON CONFLICT DO NOTHING;

-- Trạng thái vận hành và trạng thái thanh toán là hai danh mục độc lập.
ALTER TABLE public.phong ADD COLUMN trang_thai_cap_nhat_luc timestamptz;
ALTER TABLE public.phong DROP CONSTRAINT phong_trang_thai_van_hanh_check;
ALTER TABLE public.phong ADD CONSTRAINT phong_trang_thai_van_hanh_check CHECK(length(btrim(trang_thai_van_hanh)) BETWEEN 1 AND 80);
ALTER TABLE public.chan_lich_phong ADD COLUMN trang_thai_phong text NOT NULL DEFAULT 'Bị khóa';
ALTER TABLE public.chan_lich_phong ADD COLUMN trang_thai_thanh_toan text NOT NULL DEFAULT 'Chưa thanh toán';
ALTER TABLE public.chan_lich_phong ADD CONSTRAINT khoa_trang_thai_hop_le CHECK(length(btrim(trang_thai_phong)) BETWEEN 1 AND 80 AND length(btrim(trang_thai_thanh_toan)) BETWEEN 1 AND 80);
ALTER TABLE public.cau_hinh_hien_thi_lich ADD COLUMN mau_phong jsonb NOT NULL DEFAULT '{}';
ALTER TABLE public.cau_hinh_hien_thi_lich ADD COLUMN mau_thanh_toan jsonb NOT NULL DEFAULT '{"Chưa thanh toán":"#f8d394","Cọc":"#b6a3ef","Đủ":"#91d4b2"}';
ALTER TABLE public.cau_hinh_hien_thi_lich ADD COLUMN trang_thai_phong text[] NOT NULL DEFAULT ARRAY['Trống','Đang sử dụng','Cần dọn','Đang dọn','Chờ kiểm tra','Bảo trì','Bị khóa'];
ALTER TABLE public.cau_hinh_hien_thi_lich ADD COLUMN trang_thai_thanh_toan text[] NOT NULL DEFAULT ARRAY['Chưa thanh toán','Cọc','Đủ'];
UPDATE public.cau_hinh_hien_thi_lich SET mau_phong=mau,trang_thai_phong=ARRAY(SELECT DISTINCT unnest(trang_thai_phong||trang_thai));
ALTER TABLE public.dat_phong DROP CONSTRAINT dat_phong_trang_thai_check;
ALTER TABLE public.dat_phong ADD CONSTRAINT dat_phong_trang_thai_check CHECK(trang_thai IN ('Chờ thanh toán','Chờ xác nhận','Đã xác nhận','Đã nhận phòng','Đã trả phòng','Đã hủy','Hết hạn','Không nhận phòng'));
ALTER TABLE public.cuoc_tro_chuyen ADD COLUMN so_dien_thoai_lien_ket text;
CREATE INDEX chat_cho_lien_ket_sdt_idx ON public.cuoc_tro_chuyen(so_dien_thoai_lien_ket) WHERE khach_hang_id IS NULL;
CREATE TABLE public.hoi_thoai_don_dat_phong (
 dat_phong_id uuid PRIMARY KEY REFERENCES public.dat_phong(id),
 cuoc_tro_chuyen_id uuid NOT NULL REFERENCES public.cuoc_tro_chuyen(id),
 ngay_cap_nhat timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX hoi_thoai_don_chat_idx ON public.hoi_thoai_don_dat_phong(cuoc_tro_chuyen_id);
CREATE TABLE public.anh_don_dat_phong (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),dat_phong_id uuid NOT NULL REFERENCES public.dat_phong(id),
 duong_dan text NOT NULL UNIQUE,ten_tep text NOT NULL,mime text NOT NULL,dung_luong integer NOT NULL CHECK(dung_luong BETWEEN 1 AND 5242880),
 nguoi_tai_id uuid NOT NULL REFERENCES public.nguoi_dung(id),ngay_tao timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX anh_don_theo_don_idx ON public.anh_don_dat_phong(dat_phong_id,ngay_tao,id);
ALTER TABLE public.hoi_thoai_don_dat_phong ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anh_don_dat_phong ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hoi_thoai_don_dat_phong,public.anh_don_dat_phong FROM anon,authenticated;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('anh-don','anh-don',false,5242880,ARRAY['image/jpeg','image/png','image/webp']) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.migrations_ung_dung(phien_ban) VALUES('20261113111315_tach_trang_thai_phong_thanh_toan_anh_don') ON CONFLICT DO NOTHING;
CREATE INDEX dat_phong_van_hanh_phong_idx ON public.dat_phong(phong_id,tra_phong_luc DESC) WHERE trang_thai IN ('Đã xác nhận','Đã nhận phòng','Đã trả phòng');

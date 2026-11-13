-- Bổ sung, không xóa dữ liệu cũ. Quyền trang áp dụng toàn hệ thống.
ALTER TABLE public.vai_tro ADD COLUMN IF NOT EXISTS he_thong boolean NOT NULL DEFAULT true;
ALTER TABLE public.vai_tro ADD COLUMN IF NOT EXISTS quyen_trang text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.vai_tro DROP CONSTRAINT IF EXISTS vai_tro_ma_vai_tro_check;
ALTER TABLE public.vai_tro ADD CONSTRAINT vai_tro_ten_hop_le CHECK(length(btrim(ma_vai_tro)) BETWEEN 2 AND 100);
ALTER TABLE public.vai_tro ADD CONSTRAINT vai_tro_quyen_trang_hop_le CHECK(quyen_trang <@ ARRAY['tong-quan','lich','chi-nhanh','phong','loai-phong','goi-combo','dat-phong','trang-chu','danh-gia','bao-cao','tin-nhan']::text[]);
CREATE TABLE public.cau_hinh_hien_thi_lich (
 id smallint PRIMARY KEY CHECK(id=1), mau jsonb NOT NULL DEFAULT '{}',
 trang_thai text[] NOT NULL DEFAULT '{}', phien_ban integer NOT NULL DEFAULT 1,
 ngay_cap_nhat timestamptz NOT NULL DEFAULT now(), nguoi_cap_nhat_id uuid REFERENCES public.nguoi_dung(id),
 CHECK(jsonb_typeof(mau)='object'),CHECK(cardinality(trang_thai)<=50)
);
INSERT INTO public.cau_hinh_hien_thi_lich(id) VALUES(1);
ALTER TABLE public.cau_hinh_hien_thi_lich ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cau_hinh_hien_thi_lich FROM anon,authenticated;
-- Chỉ backend kiểm tra quyền rồi đọc/ghi; không mở API ghi cấu hình trực tiếp.
CREATE INDEX IF NOT EXISTS danh_gia_moi_nhat_idx ON public.danh_gia(ngay_tao DESC,id DESC);
CREATE INDEX IF NOT EXISTS dat_phong_ngay_tao_idx ON public.dat_phong(ngay_tao DESC,id DESC);
CREATE TABLE IF NOT EXISTS public.migrations_ung_dung(phien_ban text PRIMARY KEY,ngay_chay timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.migrations_ung_dung ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.migrations_ung_dung FROM anon,authenticated;
INSERT INTO public.migrations_ung_dung(phien_ban) VALUES('20261113092348_tong_quan_danh_gia_quyen_lich') ON CONFLICT DO NOTHING;

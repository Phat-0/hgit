CREATE TABLE public.so_thu_chi (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),ngay date NOT NULL,ten text NOT NULL CHECK(length(btrim(ten)) BETWEEN 1 AND 200),
 so_tien bigint NOT NULL CHECK(so_tien<>0 AND abs(so_tien)<=1000000000000),loai text NOT NULL CHECK(loai IN ('Thu','Chi')),
 homestay_id uuid REFERENCES public.homestay(id),phong_id uuid REFERENCES public.phong(id),ghi_chu text NOT NULL DEFAULT '' CHECK(length(ghi_chu)<=2000),
 mau text NOT NULL DEFAULT '#ffffff' CHECK(mau~'^#[0-9a-fA-F]{6}$'),phien_ban integer NOT NULL DEFAULT 1,
 nguoi_tao_id uuid NOT NULL REFERENCES public.nguoi_dung(id),ngay_tao timestamptz NOT NULL DEFAULT now(),ngay_cap_nhat timestamptz NOT NULL DEFAULT now(),
 CHECK((loai='Thu' AND so_tien>0) OR (loai='Chi' AND so_tien<0))
);
CREATE INDEX so_thu_chi_ngay_idx ON public.so_thu_chi(ngay,id);
CREATE INDEX so_thu_chi_chi_nhanh_idx ON public.so_thu_chi(homestay_id,ngay);
CREATE INDEX so_thu_chi_phong_idx ON public.so_thu_chi(phong_id,ngay);
CREATE INDEX so_thu_chi_nguoi_tao_idx ON public.so_thu_chi(nguoi_tao_id);
CREATE TABLE public.tien_ton_thang(thang date PRIMARY KEY CHECK(extract(day FROM thang)=1),so_tien bigint NOT NULL CHECK(abs(so_tien)<=1000000000000000),phien_ban integer NOT NULL DEFAULT 1,nguoi_sua_id uuid NOT NULL REFERENCES public.nguoi_dung(id),ngay_cap_nhat timestamptz NOT NULL DEFAULT now());
CREATE INDEX tien_ton_nguoi_sua_idx ON public.tien_ton_thang(nguoi_sua_id);
CREATE TABLE public.chung_tu_thu_chi(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),thu_chi_id uuid NOT NULL REFERENCES public.so_thu_chi(id),duong_dan text NOT NULL UNIQUE,ten_tep text NOT NULL,mime text NOT NULL,dung_luong integer NOT NULL CHECK(dung_luong BETWEEN 1 AND 20971520),ngay_tao timestamptz NOT NULL DEFAULT now());
CREATE INDEX chung_tu_thu_chi_dong_idx ON public.chung_tu_thu_chi(thu_chi_id,ngay_tao);
CREATE TABLE public.nhat_ky_thu_chi(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,thu_chi_id uuid,nguoi_thuc_hien_id uuid NOT NULL REFERENCES public.nguoi_dung(id),hanh_dong text NOT NULL,du_lieu_cu jsonb,du_lieu_moi jsonb,ngay_tao timestamptz NOT NULL DEFAULT now());
CREATE INDEX nhat_ky_thu_chi_nguoi_idx ON public.nhat_ky_thu_chi(nguoi_thuc_hien_id);
ALTER TABLE public.so_thu_chi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tien_ton_thang ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chung_tu_thu_chi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nhat_ky_thu_chi ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.so_thu_chi,public.tien_ton_thang,public.chung_tu_thu_chi,public.nhat_ky_thu_chi FROM anon,authenticated;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('chung-tu-thu-chi','chung-tu-thu-chi',false,20971520,ARRAY['image/jpeg','image/png','image/webp','application/pdf','text/plain','text/csv','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.migrations_ung_dung(phien_ban) VALUES('20261113170000_so_thu_chi_thang') ON CONFLICT DO NOTHING;

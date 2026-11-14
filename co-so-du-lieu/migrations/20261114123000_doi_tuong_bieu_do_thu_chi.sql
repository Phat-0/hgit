CREATE TABLE public.cau_hinh_bieu_do_thu_chi (
 nguoi_dung_id uuid PRIMARY KEY REFERENCES public.nguoi_dung(id),doi_tuong jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(doi_tuong)='array' AND jsonb_array_length(doi_tuong)<=20),
 phien_ban integer NOT NULL DEFAULT 1,ngay_cap_nhat timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cau_hinh_bieu_do_thu_chi ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cau_hinh_bieu_do_thu_chi FROM anon,authenticated;
INSERT INTO public.migrations_ung_dung(phien_ban) VALUES('20261114123000_doi_tuong_bieu_do_thu_chi') ON CONFLICT DO NOTHING;

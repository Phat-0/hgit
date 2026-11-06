-- Fixture toi thieu de chay migration trong PostgreSQL PGlite; khong la schema production.
CREATE TABLE public.loai_phong(id uuid PRIMARY KEY);
CREATE TABLE public.phong(id uuid PRIMARY KEY,loai_phong_id uuid REFERENCES public.loai_phong(id),gia_moi_gio numeric NOT NULL,gia_moi_ngay numeric NOT NULL,gia_moi_dem numeric NOT NULL,gia_phu_thu_gio numeric NOT NULL);
CREATE TABLE public.goi_gia(id uuid PRIMARY KEY,loai_phong_id uuid REFERENCES public.loai_phong(id),ten_goi text,hinh_thuc_dat text,gia_co_ban numeric,so_gio_toi_thieu int,hieu_luc boolean);
CREATE TABLE public.quy_tac_gia(id uuid PRIMARY KEY,goi_gia_id uuid REFERENCES public.goi_gia(id) ON DELETE CASCADE,ten_quy_tac text,bat_dau timestamptz,ket_thuc timestamptz,gia_ap_dung numeric,muc_uu_tien int);
CREATE TABLE public.dat_phong(id uuid PRIMARY KEY,phong_id uuid REFERENCES public.phong(id),goi_gia_id uuid NOT NULL REFERENCES public.goi_gia(id) ON DELETE RESTRICT,hinh_thuc_dat text CONSTRAINT dat_phong_hinh_thuc_dat_check CHECK(hinh_thuc_dat IN ('Theo giờ','Theo đêm')),tien_phong numeric);
CREATE TABLE public.combo(id uuid PRIMARY KEY);
CREATE TABLE public.gia_lich_phong(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),phong_id uuid REFERENCES public.phong(id),loai_gia text,bat_dau timestamptz,ket_thuc timestamptz,gia numeric,phu_thu_gio numeric,ten text,thu_trong_tuan int[],ngay_tao timestamptz DEFAULT now());
INSERT INTO public.loai_phong VALUES('00000000-0000-4000-8000-000000000001');
INSERT INTO public.phong VALUES('00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001',100,500,300,50);
INSERT INTO public.goi_gia VALUES('00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001','Gio','Theo giờ',200,2,true),('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000001','Dem','Theo đêm',400,NULL,true);
INSERT INTO public.dat_phong VALUES('00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003','Theo giờ',123);
INSERT INTO public.quy_tac_gia VALUES('00000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-000000000003','Cuoi tuan','2030-01-01','2030-02-01',250,5);

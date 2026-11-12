ALTER TABLE public.cuoc_tro_chuyen ADD COLUMN IF NOT EXISTS ma_khach_chat bigint GENERATED ALWAYS AS IDENTITY;
CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_ma_khach ON public.cuoc_tro_chuyen(ma_khach_chat);
DO $$ DECLARE s text; BEGIN s:=pg_get_serial_sequence('public.cuoc_tro_chuyen','ma_khach_chat'); IF s IS NOT NULL THEN EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM anon,authenticated',s); END IF; END $$;
ALTER TABLE public.cau_tra_loi_mau ADD COLUMN IF NOT EXISTS thu_tu integer NOT NULL DEFAULT 0 CHECK(thu_tu BETWEEN 0 AND 1000000);
-- Chỉ khởi tạo thứ tự lần đầu, chạy lại không làm mất thứ tự đã chọn.
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM public.migrations_ung_dung WHERE phien_ban='20261112-thu-tu-mau-ten-khach') THEN
 WITH ordered AS(SELECT id,(row_number() OVER(ORDER BY nhom,tieu_de,id)-1)::integer AS n FROM public.cau_tra_loi_mau) UPDATE public.cau_tra_loi_mau m SET thu_tu=o.n FROM ordered o WHERE o.id=m.id;
 END IF; END $$;
INSERT INTO public.migrations_ung_dung(phien_ban) VALUES('20261112-thu-tu-mau-ten-khach') ON CONFLICT DO NOTHING;

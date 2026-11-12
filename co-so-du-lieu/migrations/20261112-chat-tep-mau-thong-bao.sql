CREATE TABLE IF NOT EXISTS public.tep_tin_chat (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tin_nhan_id uuid NOT NULL UNIQUE REFERENCES public.tin_nhan(id) ON DELETE CASCADE,
 cuoc_tro_chuyen_id uuid NOT NULL REFERENCES public.cuoc_tro_chuyen(id) ON DELETE CASCADE,
 duong_dan text NOT NULL UNIQUE,ten_tep text NOT NULL CHECK(length(ten_tep) BETWEEN 1 AND 180),
 mime text NOT NULL,dung_luong integer NOT NULL CHECK(dung_luong BETWEEN 1 AND 20971520),
 la_anh boolean NOT NULL,ngay_tao timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tep_chat_thoi_gian ON public.tep_tin_chat(cuoc_tro_chuyen_id,ngay_tao DESC,id DESC);
ALTER TABLE public.tep_tin_chat ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.tep_tin_chat FROM anon,authenticated;
CREATE TABLE IF NOT EXISTS public.cau_tra_loi_mau (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),homestay_id uuid REFERENCES public.homestay(id) ON DELETE RESTRICT,
 tieu_de text NOT NULL CHECK(length(tieu_de) BETWEEN 1 AND 120),nhom text NOT NULL CHECK(length(nhom) BETWEEN 1 AND 80),
 noi_dung text NOT NULL CHECK(length(noi_dung) BETWEEN 1 AND 4000),hien boolean NOT NULL DEFAULT true,
 ngay_cap_nhat timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cau_tra_loi_mau ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cau_tra_loi_mau FROM anon,authenticated;
INSERT INTO public.cau_tra_loi_mau(tieu_de,nhom,noi_dung)
SELECT t,n,c FROM (VALUES ('Chào khách','Chào hỏi','Xin chào! HomeStay có thể hỗ trợ gì cho bạn?'),('Hỏi nhu cầu','Đặt phòng','Bạn muốn đặt ngày nào, theo giờ hay qua đêm và cho bao nhiêu người?'),('Chuyển nhân viên kiểm tra','Hỗ trợ','Mình đã nhận thông tin. Bạn chờ một chút để bên mình kiểm tra và phản hồi nhé.')) AS x(t,n,c)
WHERE NOT EXISTS(SELECT 1 FROM public.cau_tra_loi_mau) AND NOT EXISTS(SELECT 1 FROM public.migrations_ung_dung WHERE phien_ban='20261112-chat-tep-mau-thong-bao');
DO $$ BEGIN IF EXISTS(SELECT 1 FROM storage.buckets WHERE id='tep-chat' AND public) THEN RAISE EXCEPTION 'Bucket tep-chat phải ở chế độ riêng tư'; END IF; END $$;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('tep-chat','tep-chat',false,20971520,ARRAY['image/jpeg','image/png','image/webp','application/pdf','text/plain','text/csv','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']) ON CONFLICT(id) DO NOTHING;
-- Sự kiện phát sinh cùng transaction với đơn, không phát thông báo giả cho đơn lịch sử.
CREATE OR REPLACE FUNCTION public.thong_bao_su_kien_dat_phong() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE event_type text;
BEGIN
 IF TG_OP='INSERT' THEN event_type:='Đơn mới';
 ELSIF NEW.trang_thai='Đã hủy' AND OLD.trang_thai IS DISTINCT FROM NEW.trang_thai THEN event_type:='Đơn hủy';
 ELSE RETURN NEW; END IF;
 INSERT INTO public.thong_bao(nguoi_dung_id,tieu_de,noi_dung,loai,du_lieu)
 SELECT DISTINCT n.id,event_type||' · '||NEW.ma_dat_phong,coalesce(NEW.ten_don,'Khách hàng')||' · '||NEW.ma_dat_phong,event_type,
 jsonb_build_object('dat_phong_id',NEW.id,'homestay_id',NEW.homestay_id,'ma_dat_phong',NEW.ma_dat_phong)
 FROM public.nguoi_dung n JOIN public.nguoi_dung_vai_tro nv ON nv.nguoi_dung_id=n.id JOIN public.vai_tro v ON v.id=nv.vai_tro_id
 WHERE n.trang_thai='Đang hoạt động' AND nv.ngay_thu_hoi IS NULL AND
 (v.ma_vai_tro='Quản trị hệ thống' AND nv.homestay_id IS NULL OR v.ma_vai_tro='Quản lý' AND nv.homestay_id=NEW.homestay_id);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.thong_bao_su_kien_dat_phong() FROM PUBLIC;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='trg_thong_bao_su_kien_dat_phong' AND tgrelid='public.dat_phong'::regclass) THEN CREATE TRIGGER trg_thong_bao_su_kien_dat_phong AFTER INSERT OR UPDATE OF trang_thai ON public.dat_phong FOR EACH ROW EXECUTE FUNCTION public.thong_bao_su_kien_dat_phong(); END IF; END $$;
CREATE INDEX IF NOT EXISTS idx_thong_bao_don ON public.thong_bao(nguoi_dung_id,ngay_tao DESC,id DESC) WHERE loai IN ('Đơn mới','Đơn hủy');
INSERT INTO public.migrations_ung_dung(phien_ban) VALUES('20261112-chat-tep-mau-thong-bao') ON CONFLICT DO NOTHING;

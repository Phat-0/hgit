BEGIN;
-- Sau khi trả phòng, giữ 30 phút từ giờ trả thực tế (hoặc giờ dự kiến nếu chưa ghi).
-- Không sửa lịch sử, không tạo/xóa lịch khóa rời.
CREATE OR REPLACE FUNCTION public.kiem_tra_dem_sau_checkout() RETURNS trigger
 LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF NEW.trang_thai NOT IN ('Chờ thanh toán','Chờ xác nhận','Đã xác nhận','Đã nhận phòng') THEN RETURN NEW; END IF;
 PERFORM 1 FROM public.phong WHERE id=NEW.phong_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.dat_phong d WHERE d.phong_id=NEW.phong_id AND d.id<>NEW.id
  AND d.trang_thai='Đã trả phòng'
  AND d.nhan_phong_luc<NEW.tra_phong_luc+interval '30 minutes'
  AND coalesce(d.da_tra_phong_luc,d.tra_phong_luc)>NEW.nhan_phong_luc-interval '30 minutes') THEN
  RAISE EXCEPTION 'Phòng chưa đủ khoảng đệm 30 phút sau trả phòng' USING ERRCODE='23P01';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.kiem_tra_dem_sau_checkout() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER trg_dem_sau_checkout BEFORE INSERT OR UPDATE OF phong_id,nhan_phong_luc,tra_phong_luc,trang_thai ON public.dat_phong
 FOR EACH ROW EXECUTE FUNCTION public.kiem_tra_dem_sau_checkout();
INSERT INTO public.migrations_ung_dung(phien_ban) VALUES('20261119082342_dem_sau_checkout') ON CONFLICT DO NOTHING;
COMMIT;

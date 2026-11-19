BEGIN;
-- Đệm tính theo đơn: [nhận, trả + 30 phút), không nhân đôi thành 60 phút.
-- Giữ kiểm tra cũ, bổ sung ràng buộc cho cả ghi đồng thời/trực tiếp DB.
ALTER TABLE public.dat_phong ADD CONSTRAINT ex_dat_phong_dem_30_phut
 EXCLUDE USING gist (phong_id WITH =,
 tstzrange(nhan_phong_luc,((tra_phong_luc AT TIME ZONE 'UTC')+interval '30 minutes') AT TIME ZONE 'UTC','[)') WITH &&)
 WHERE (trang_thai IN ('Chờ thanh toán','Chờ xác nhận','Đã xác nhận','Đã nhận phòng'));
INSERT INTO public.migrations_ung_dung(phien_ban) VALUES('20261119081407_dem_30_phut_dat_phong') ON CONFLICT DO NOTHING;
COMMIT;

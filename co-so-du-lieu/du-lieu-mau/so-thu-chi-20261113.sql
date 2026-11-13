-- Dữ liệu mô phỏng được người dùng yêu cầu. Không đại diện khoản thu/chi thực tế.
-- Chạy lại không nhân đôi; không cập nhật/xóa dòng đang có hoặc tiền tồn.
BEGIN;
SELECT pg_advisory_xact_lock(20261113,4);
WITH actor AS (SELECT nv.nguoi_dung_id AS id FROM public.nguoi_dung_vai_tro nv JOIN public.vai_tro v ON v.id=nv.vai_tro_id WHERE v.ma_vai_tro='Quản trị hệ thống' ORDER BY nv.nguoi_dung_id LIMIT 1),
rooms AS (SELECT p.id,p.homestay_id,p.ten_phong,row_number() OVER(ORDER BY p.ma_phong,p.id)::integer AS n FROM public.phong p ORDER BY p.ma_phong,p.id LIMIT 5),
seed AS (
 SELECT (date_trunc('month',now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date+n) AS ngay,'[MẪU] Thu phòng '||ten_phong AS ten,(300000+n*50000)::bigint AS so_tien,'Thu'::text AS loai,homestay_id,id AS phong_id,'#effbf4'::text AS mau FROM rooms
 UNION ALL SELECT date_trunc('month',now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date+n,'[MẪU] Vệ sinh '||ten_phong,-(50000+n*5000)::bigint,'Chi',homestay_id,id,'#fcf2ff' FROM rooms
 UNION ALL SELECT date_trunc('month',now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date+g.day,g.ten,g.money,g.kind,NULL::uuid,NULL::uuid,g.color FROM (VALUES (6,'[MẪU] Thu giặt sấy',120000::bigint,'Thu','#effbf4'),(7,'[MẪU] Thu đồ uống',180000::bigint,'Thu','#effbf4'),(8,'[MẪU] Điện nước khu chung',-650000::bigint,'Chi','#fff5ef'),(9,'[MẪU] Vật tư văn phòng',-220000::bigint,'Chi','#fff5ef')) AS g(day,ten,money,kind,color)
), added AS (
 INSERT INTO public.so_thu_chi(ngay,ten,so_tien,loai,homestay_id,phong_id,ghi_chu,mau,nguoi_tao_id)
 SELECT s.ngay,s.ten,s.so_tien,s.loai,s.homestay_id,s.phong_id,'DỮ LIỆU MẪU · Không phải giao dịch thực tế · mau-so-thu-chi-20261113-v1',s.mau,a.id FROM seed s CROSS JOIN actor a WHERE NOT EXISTS(SELECT 1 FROM public.so_thu_chi old WHERE old.ten=s.ten AND old.phong_id IS NOT DISTINCT FROM s.phong_id AND old.ghi_chu LIKE '%mau-so-thu-chi-20261113-v1%') RETURNING *
)
INSERT INTO public.nhat_ky_thu_chi(thu_chi_id,nguoi_thuc_hien_id,hanh_dong,du_lieu_moi) SELECT id,nguoi_tao_id,'tao_du_lieu_mau',to_jsonb(added) FROM added;
COMMIT;

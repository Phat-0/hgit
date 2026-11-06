-- PHƯƠNG ÁN B: AUDIT TRƯỚC KHI GỘP goi_gia VÀO phong.
-- CHƯA CHẠY TRÊN SUPABASE. Chỉ SELECT, không thay đổi schema hay dữ liệu.
-- Lưu toàn bộ từng result set cùng thời điểm/schema được kiểm tra.
-- Nếu bảng/cột thực tế khác schema trong repo: dừng, đối chiếu mục 1 trước.

-- 1. Cấu trúc thực tế và ràng buộc (kể cả CHECK hình thức đặt, NOT NULL).
SELECT table_schema,table_name,column_name,data_type,is_nullable,column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name IN
 ('goi_gia','phong','loai_phong','dat_phong','quy_tac_gia','gia_lich_phong')
ORDER BY table_name,ordinal_position;
SELECT conrelid::regclass::text AS bang,conname,contype,pg_get_constraintdef(oid) AS dinh_nghia
FROM pg_constraint
WHERE conrelid IN ('public.goi_gia'::regclass,'public.phong'::regclass,
 'public.dat_phong'::regclass,'public.quy_tac_gia'::regclass)
ORDER BY 1,2;

-- 2. TẤT CẢ FK vào/ra goi_gia và FK tham chiếu phòng/đơn/quy tắc.
-- Dùng OID thay vì ghép tên constraint, bao gồm mọi schema và FK nhiều cột.
SELECT conrelid::regclass::text AS bang_nguon,conname,
       confrelid::regclass::text AS bang_dich,convalidated,
       pg_get_constraintdef(oid) AS dinh_nghia
FROM pg_constraint
WHERE contype='f' AND
 (conrelid='public.goi_gia'::regclass OR confrelid IN
 ('public.goi_gia'::regclass,'public.phong'::regclass,
  'public.dat_phong'::regclass,'public.quy_tac_gia'::regclass))
ORDER BY 1,2;

-- 3. Dependency do PostgreSQL ghi nhận, bao gồm dependency cấp cột.
SELECT pg_describe_object(d.classid,d.objid,d.objsubid) AS doi_tuong_phu_thuoc,
       d.deptype,d.refobjsubid AS cot_duoc_tham_chieu
FROM pg_depend d
WHERE d.refclassid='pg_class'::regclass AND d.refobjid='public.goi_gia'::regclass
ORDER BY 1;
-- SQL động/function và hệ thống bên ngoài có thể không có pg_depend.
SELECT schemaname,viewname,definition FROM pg_views WHERE definition ILIKE '%goi_gia%';
SELECT schemaname,matviewname,definition FROM pg_matviews WHERE definition ILIKE '%goi_gia%';
SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) AS tham_so,
       pg_get_functiondef(p.oid) AS dinh_nghia
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE p.prokind IN ('f','p') AND n.nspname NOT IN ('pg_catalog','information_schema')
  AND p.prosrc ILIKE '%goi_gia%';
SELECT t.tgrelid::regclass::text AS bang,t.tgname,pg_get_triggerdef(t.oid) AS dinh_nghia
FROM pg_trigger t WHERE NOT t.tgisinternal AND
 (t.tgrelid IN ('public.goi_gia'::regclass,'public.phong'::regclass,'public.dat_phong'::regclass)
  OR pg_get_triggerdef(t.oid) ILIKE '%goi_gia%');
SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check FROM pg_policies
WHERE tablename='goi_gia' OR COALESCE(qual,'') ILIKE '%goi_gia%'
 OR COALESCE(with_check,'') ILIKE '%goi_gia%';
SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class
WHERE oid IN ('public.goi_gia'::regclass,'public.phong'::regclass,'public.dat_phong'::regclass);
SELECT grantee,privilege_type FROM information_schema.table_privileges
WHERE table_schema='public' AND table_name='goi_gia' ORDER BY 1,2;

-- 4. Số dòng và tổng tiền gốc làm mốc đối chiếu, KHÔNG backfill đơn lịch sử.
SELECT 'goi_gia' AS bang,count(*) AS so_dong FROM public.goi_gia
UNION ALL SELECT 'phong',count(*) FROM public.phong
UNION ALL SELECT 'dat_phong',count(*) FROM public.dat_phong
UNION ALL SELECT 'quy_tac_gia',count(*) FROM public.quy_tac_gia;
SELECT trang_thai,hinh_thuc_dat,count(*) AS so_don,
       sum(tien_phong) AS tien_phong,sum(tien_dich_vu) AS tien_dich_vu,
       sum(tien_giam) AS tien_giam,sum(tong_tien) AS tong_tien
FROM public.dat_phong GROUP BY 1,2 ORDER BY 1,2;
SELECT g.*, (SELECT count(*) FROM public.dat_phong d WHERE d.goi_gia_id=g.id) AS so_don,
 (SELECT count(*) FROM public.quy_tac_gia q WHERE q.goi_gia_id=g.id) AS so_quy_tac
FROM public.goi_gia g ORDER BY g.loai_phong_id,g.hinh_thuc_dat,g.ten_goi;

-- 5. Mapping mơ hồ: không tự chọn min/max/FIRST, kể cả gói ngừng bán có đơn cũ.
SELECT loai_phong_id,hinh_thuc_dat,count(*) AS so_goi,
 count(*) FILTER (WHERE hieu_luc) AS so_goi_dang_ban,
 count(DISTINCT (gia_co_ban,so_gio_toi_thieu,hieu_luc)) AS so_cau_hinh,
 array_agg(id ORDER BY ten_goi) AS goi_ids
FROM public.goi_gia GROUP BY 1,2 HAVING count(*)>1 ORDER BY 1,2;
SELECT p.id AS phong_id,p.loai_phong_id,p.homestay_id,
       g.id AS goi_gia_id,g.ten_goi,g.hinh_thuc_dat,g.gia_co_ban,g.so_gio_toi_thieu,g.hieu_luc,
       to_jsonb(p)->>'gia_moi_gio' AS gia_gio_hien_tai,
       to_jsonb(p)->>'gia_moi_ngay' AS gia_ngay_hien_tai,
       to_jsonb(p)->>'gia_moi_dem' AS gia_dem_hien_tai,
       to_jsonb(p)->>'gia_phu_thu_gio' AS phu_thu_hien_tai
FROM public.phong p LEFT JOIN public.goi_gia g ON g.loai_phong_id=p.loai_phong_id
ORDER BY p.id,g.hinh_thuc_dat,g.ten_goi;

-- 6. Dữ liệu không phù hợp / mồ côi / thiếu số giờ cơ bản.
SELECT g.* FROM public.goi_gia g LEFT JOIN public.loai_phong l ON l.id=g.loai_phong_id
WHERE l.id IS NULL OR g.gia_co_ban IS NULL OR g.gia_co_ban<0
 OR (g.hinh_thuc_dat='Theo giờ' AND (g.so_gio_toi_thieu IS NULL OR g.so_gio_toi_thieu<1));
SELECT d.id,d.ma_dat_phong,d.phong_id,d.goi_gia_id,d.hinh_thuc_dat
FROM public.dat_phong d LEFT JOIN public.phong p ON p.id=d.phong_id
LEFT JOIN public.goi_gia g ON g.id=d.goi_gia_id
WHERE p.id IS NULL OR g.id IS NULL OR g.loai_phong_id IS DISTINCT FROM p.loai_phong_id
 OR d.homestay_id IS DISTINCT FROM p.homestay_id
 OR d.hinh_thuc_dat IS DISTINCT FROM g.hinh_thuc_dat;
SELECT q.* FROM public.quy_tac_gia q LEFT JOIN public.goi_gia g ON g.id=q.goi_gia_id
WHERE g.id IS NULL OR q.bat_dau>=q.ket_thuc OR q.gia_ap_dung<0;
-- Quy tắc chồng nhau: cần bảo toàn ưu tiên khi chuyển, không INSERT hàng loạt.
SELECT a.id AS quy_tac_a,b.id AS quy_tac_b,a.goi_gia_id,
       a.muc_uu_tien AS uu_tien_a,b.muc_uu_tien AS uu_tien_b
FROM public.quy_tac_gia a JOIN public.quy_tac_gia b
 ON a.goi_gia_id=b.goi_gia_id AND a.id<b.id
 AND a.bat_dau<b.ket_thuc AND b.bat_dau<a.ket_thuc;
-- Kết quả rỗng không chứng minh không có phụ thuộc từ code ngoài DB.
-- Chưa có bước DROP/ALTER/UPDATE trong file này.

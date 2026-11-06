BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
-- PHUONG AN B: KIEM TRA TRUOC KHI GOP GOI_GIA VAO PHONG
-- CHI DOC DU LIEU. Chay trong Supabase SQL Editor, khong thay doi schema.
SELECT 'goi_gia' AS bang, count(*) AS so_dong FROM public.goi_gia
UNION ALL SELECT 'dat_phong',count(*) FROM public.dat_phong
UNION ALL SELECT 'quy_tac_gia',count(*) FROM public.quy_tac_gia
UNION ALL SELECT 'phong',count(*) FROM public.phong;
-- Tat ca khoa ngoai truc tiep vao goi_gia (bao gom bang khong nam trong repo)
SELECT tc.table_schema,tc.table_name,kcu.column_name,ccu.table_name AS bang_duoc_tham_chieu,tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema
JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name=tc.constraint_name AND ccu.table_schema=tc.table_schema
WHERE tc.constraint_type='FOREIGN KEY' AND ccu.table_schema='public' AND ccu.table_name='goi_gia'
ORDER BY tc.table_name;
-- Tim cac doi tuong phu thuoc (view, function, trigger, policy) bang cach doc dinh nghia
SELECT schemaname,viewname,definition FROM pg_views WHERE schemaname='public' AND definition ILIKE '%goi_gia%';
SELECT n.nspname AS schema,p.proname AS ham,pg_get_functiondef(p.oid) AS dinh_nghia
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE p.prokind IN ('f','p') AND n.nspname NOT IN ('pg_catalog','information_schema')
AND CASE WHEN p.prokind IN ('f','p') THEN pg_get_functiondef(p.oid) ELSE '' END ILIKE '%goi_gia%';
-- Kiem tra nhieu goi cung hinh thuc trong mot loai phong: khong the gop 1:1 vao phong
SELECT loai_phong_id,hinh_thuc_dat,count(*) AS so_goi,array_agg(ten_goi ORDER BY ten_goi) AS ten_goi
FROM public.goi_gia GROUP BY loai_phong_id,hinh_thuc_dat HAVING count(*)>1;
-- Kiem tra goi gia co gia/so gio khac nhau theo tung loai phong
SELECT loai_phong_id,hinh_thuc_dat,count(DISTINCT (gia_co_ban,so_gio_toi_thieu)) AS so_cau_hinh
FROM public.goi_gia GROUP BY loai_phong_id,hinh_thuc_dat HAVING count(DISTINCT (gia_co_ban,so_gio_toi_thieu))>1;
-- Don dat phong khong co phong hoac goi gia khong phu hop
SELECT d.id,d.ma_dat_phong,d.phong_id,d.goi_gia_id,d.hinh_thuc_dat
FROM public.dat_phong d LEFT JOIN public.phong p ON p.id=d.phong_id
LEFT JOIN public.goi_gia g ON g.id=d.goi_gia_id
WHERE p.id IS NULL OR g.id IS NULL OR g.loai_phong_id IS DISTINCT FROM p.loai_phong_id
OR d.hinh_thuc_dat IS DISTINCT FROM g.hinh_thuc_dat;
-- Kiem tra cac quy tac gia phu thuoc vao goi
SELECT g.id,g.ten_goi,count(q.id) AS so_quy_tac
FROM public.goi_gia g LEFT JOIN public.quy_tac_gia q ON q.goi_gia_id=g.id
GROUP BY g.id,g.ten_goi HAVING count(q.id)>0 ORDER BY so_quy_tac DESC;
-- Xac dinh bang gia theo lich da co
SELECT table_name,column_name,data_type FROM information_schema.columns
WHERE table_schema='public' AND table_name IN ('phong','goi_gia','gia_lich_phong','quy_tac_gia','dat_phong')
ORDER BY table_name,ordinal_position;

-- Bo sung audit 2026-11-06. Chi SELECT; chua chay tren Supabase.
-- FK ca hai chieu, ke ca composite va schema ngoai public. definition giu dung cap cot.
SELECT n.nspname AS schema_name,r.relname AS table_name,c.conname,
       pg_get_constraintdef(c.oid,true) AS definition,c.convalidated
FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid
JOIN pg_namespace n ON n.oid=r.relnamespace
WHERE c.contype='f' AND
 (c.conrelid IN ('public.goi_gia'::regclass,'public.phong'::regclass)
 OR c.confrelid IN ('public.goi_gia'::regclass,'public.phong'::regclass))
ORDER BY 1,2,3;
-- Dependency catalog: bao gom view/rule, constraint, policy, trigger...
SELECT pg_describe_object(d.classid,d.objid,d.objsubid) AS dependent,
       pg_describe_object(d.refclassid,d.refobjid,d.refobjsubid) AS referenced,d.deptype
FROM pg_depend d
WHERE d.refclassid='pg_class'::regclass
AND d.refobjid IN ('public.goi_gia'::regclass,'public.phong'::regclass)
ORDER BY 2,1;
-- RLS/policy va trigger: ca tham chieu SQL dang chuoi khong duoc catalog bat duoc.
SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check FROM pg_policies
WHERE tablename IN ('goi_gia','phong','quy_tac_gia','dat_phong')
OR COALESCE(qual,'') ILIKE '%goi_gia%' OR COALESCE(with_check,'') ILIKE '%goi_gia%';
SELECT n.nspname,r.relname,t.tgname,pg_get_triggerdef(t.oid,true) AS definition
FROM pg_trigger t JOIN pg_class r ON r.oid=t.tgrelid
JOIN pg_namespace n ON n.oid=r.relnamespace
WHERE NOT t.tgisinternal AND (r.relname IN ('goi_gia','phong','dat_phong','quy_tac_gia')
OR pg_get_triggerdef(t.oid,true) ILIKE '%goi_gia%');
SELECT schemaname,matviewname,definition FROM pg_matviews WHERE definition ILIKE '%goi_gia%';
-- Khong tu ghi de gia phong hien co; doi chieu moi phong voi moi goi ke ca ngung ban.
SELECT p.id AS phong_id,p.loai_phong_id,to_jsonb(p) AS phong_hien_tai,
       g.id AS goi_gia_id,g.hinh_thuc_dat,g.gia_co_ban,g.so_gio_toi_thieu,g.hieu_luc
FROM public.phong p LEFT JOIN public.goi_gia g ON g.loai_phong_id=p.loai_phong_id
ORDER BY p.id,g.hinh_thuc_dat,g.id;
-- Goi khong co phong dich / loai phong mo coi.
SELECT g.* FROM public.goi_gia g LEFT JOIN public.loai_phong l ON l.id=g.loai_phong_id
WHERE l.id IS NULL OR NOT EXISTS (SELECT 1 FROM public.phong p WHERE p.loai_phong_id=g.loai_phong_id);
-- Kiem tra quy tac mo coi va gia/khoang khong hop le.
SELECT q.* FROM public.quy_tac_gia q LEFT JOIN public.goi_gia g ON g.id=q.goi_gia_id
WHERE g.id IS NULL OR q.bat_dau>=q.ket_thuc OR q.gia_ap_dung<0;
SELECT g.* FROM public.goi_gia g WHERE gia_co_ban<0 OR so_gio_toi_thieu<=0;
-- Bao toan don cu: luu so luong va tong tien de doi chieu sau backfill.
SELECT hinh_thuc_dat,count(*) AS so_don,sum(tien_phong) AS tien_phong,
       sum(tong_tien) AS tong_tien,min(nhan_phong_luc),max(tra_phong_luc)
FROM public.dat_phong GROUP BY hinh_thuc_dat ORDER BY hinh_thuc_dat;

ROLLBACK;

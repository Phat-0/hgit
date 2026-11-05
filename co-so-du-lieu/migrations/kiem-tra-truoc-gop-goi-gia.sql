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
WHERE n.nspname='public' AND pg_get_functiondef(p.oid) ILIKE '%goi_gia%';
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

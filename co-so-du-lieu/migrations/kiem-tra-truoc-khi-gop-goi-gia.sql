-- KIEM TRA TRUOC KHI GOP goi_gia VAO phong
-- CHI DOC: khong ALTER, UPDATE, DELETE, DROP.
-- Chay tren Supabase SQL Editor, gui ket qua truoc khi thuc hien migration.
SELECT 'foreign_key' AS nhom, conrelid::regclass::text AS bang_nguon,
       conname AS ten, pg_get_constraintdef(oid) AS chi_tiet
FROM pg_constraint
WHERE contype='f' AND confrelid='public.goi_gia'::regclass
ORDER BY 2,3;
SELECT 'column' AS nhom, table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema='public' AND table_name IN ('goi_gia','phong','dat_phong','quy_tac_gia','gia_lich_phong','combo','anh_don_dat_phong','chung_tu_thanh_toan')
ORDER BY table_name,ordinal_position;
SELECT 'goi_gia' AS bang,count(*) AS so_dong FROM public.goi_gia
UNION ALL SELECT 'phong',count(*) FROM public.phong
UNION ALL SELECT 'dat_phong',count(*) FROM public.dat_phong
UNION ALL SELECT 'quy_tac_gia',count(*) FROM public.quy_tac_gia;
SELECT g.loai_phong_id,g.hinh_thuc_dat,count(*) AS so_goi,
       count(DISTINCT (g.so_gio_toi_thieu,g.gia_co_ban,g.hieu_luc)) AS so_cau_hinh_khac_nhau
FROM public.goi_gia g GROUP BY 1,2 HAVING count(*)>1
ORDER BY so_goi DESC;
SELECT d.goi_gia_id,count(*) AS so_don
FROM public.dat_phong d GROUP BY 1 ORDER BY so_don DESC;
SELECT q.goi_gia_id,count(*) AS so_quy_tac
FROM public.quy_tac_gia q GROUP BY 1 ORDER BY so_quy_tac DESC;
SELECT table_name,column_name
FROM information_schema.columns
WHERE table_schema='public' AND (column_name ILIKE '%goi_gia%' OR column_name ILIKE '%gia_%' OR column_name ILIKE '%gio%')
ORDER BY table_name,column_name;
-- Danh sach trigger, view, function lien quan:
SELECT dependent_ns.nspname AS schema_name, dependent_view.relname AS ten_view
FROM pg_depend d
JOIN pg_rewrite r ON r.oid=d.objid
JOIN pg_class dependent_view ON dependent_view.oid=r.ev_class
JOIN pg_namespace dependent_ns ON dependent_ns.oid=dependent_view.relnamespace
WHERE d.refobjid='public.goi_gia'::regclass
GROUP BY 1,2 ORDER BY 1,2;

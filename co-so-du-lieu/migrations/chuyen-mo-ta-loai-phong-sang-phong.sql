-- Chưa áp dụng trên Supabase: thao tác xác nhận đã bị hủy.
-- Chạy toàn bộ trong một transaction, không dùng CASCADE.
BEGIN;
ALTER TABLE public.phong ADD COLUMN IF NOT EXISTS mo_ta text;
DO $migration$
BEGIN
 IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='loai_phong' AND column_name='mo_ta') THEN
  IF EXISTS (SELECT 1 FROM public.loai_phong l WHERE nullif(trim(l.mo_ta),'') IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.phong p WHERE p.loai_phong_id=l.id)) THEN
   RAISE EXCEPTION 'Có mô tả loại phòng chưa gắn phòng, cần chuyển nội dung trước';
  END IF;
  UPDATE public.phong p SET mo_ta=l.mo_ta FROM public.loai_phong l WHERE p.loai_phong_id=l.id AND nullif(trim(p.mo_ta),'') IS NULL AND nullif(trim(l.mo_ta),'') IS NOT NULL;
  ALTER TABLE public.loai_phong DROP COLUMN mo_ta RESTRICT;
 END IF;
END $migration$;
COMMENT ON COLUMN public.phong.mo_ta IS 'Mô tả riêng của từng phòng';
COMMIT;

-- DU THAO MIGRATION - chi chay sau khi sao luu va xac nhan tren Supabase SQL Editor.
-- Combo khong co so gio: dich vu cong them; combo co so gio: gia combo bao gom gio dau.
BEGIN;
ALTER TABLE public.combo ADD COLUMN IF NOT EXISTS so_gio_bao_gom integer;
ALTER TABLE public.combo DROP CONSTRAINT IF EXISTS combo_so_gio_bao_gom_check;
ALTER TABLE public.combo ADD CONSTRAINT combo_so_gio_bao_gom_check CHECK (so_gio_bao_gom IS NULL OR so_gio_bao_gom > 0);
ALTER TABLE public.dat_phong ADD COLUMN IF NOT EXISTS combo_id uuid REFERENCES public.combo(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_dat_phong_combo ON public.dat_phong(combo_id);
-- Chung tu thanh toan da lien ket: dat_phong -> thanh_toan -> chung_tu_thanh_toan.
-- Khong CASCADE, neu bang anh dang co rang buoc phu thuoc, cau lenh se dung va ROLLBACK.
DROP TABLE IF EXISTS public.anh_don_dat_phong;
COMMIT;

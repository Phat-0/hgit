BEGIN;
LOCK TABLE public.combo IN SHARE ROW EXCLUSIVE MODE;
ALTER TABLE public.combo ADD COLUMN IF NOT EXISTS anh_combo text[] NOT NULL DEFAULT '{}';
UPDATE public.combo SET anh_combo=ARRAY[anh_dai_dien] WHERE anh_dai_dien IS NOT NULL AND cardinality(anh_combo)=0;
ALTER TABLE public.combo ADD CONSTRAINT combo_toi_da_8_anh CHECK(cardinality(anh_combo)<=8);
-- Giữ anh_dai_dien làm ảnh bìa tương thích dữ liệu hiện tại, không xóa tệp cũ.
COMMIT;

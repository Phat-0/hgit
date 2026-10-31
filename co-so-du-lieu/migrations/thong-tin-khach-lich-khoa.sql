-- Chạy trong Supabase SQL Editor trước khi sử dụng tính năng mới.
ALTER TABLE public.chan_lich_phong
  ADD COLUMN IF NOT EXISTS ten_khach text,
  ADD COLUMN IF NOT EXISTS so_dien_thoai text,
  ADD COLUMN IF NOT EXISTS gia_ghi_nhan numeric(14,0);

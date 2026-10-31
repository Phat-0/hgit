-- Lịch phòng chỉ cần các cột khóa. Giá cơ bản lưu trực tiếp trên public.phong.
ALTER TABLE public.chan_lich_phong ADD COLUMN IF NOT EXISTS loai_khoa text NOT NULL DEFAULT 'gio';
ALTER TABLE public.chan_lich_phong ADD COLUMN IF NOT EXISTS co_dinh boolean NOT NULL DEFAULT false;
-- Không tạo bảng gia_lich_phong nữa.
-- Nếu bảng cũ đã được tạo và bạn chắc chắn không cần dữ liệu lịch giá cũ,
-- chạy migration xoa-gia-lich-phong.sql riêng để xóa.

# Cấu hình Supabase Storage cho ảnh phòng

1. Trong Supabase Dashboard của dự án, mở SQL Editor và chạy `co-so-du-lieu/migrations/tao-bucket-anh-phong.sql` **một lần**. Bucket `anh-phong` là private.
2. Trong `may-chu/.env` trên máy chủ, thêm `SUPABASE_SERVICE_ROLE_KEY=<khóa service_role của chính dự án>`. Giữ `SUPABASE_URL` như cấu hình hiện tại. **Không** thêm khóa này vào `trang-web/.env*`, Git hoặc commit. Khi triển khai online, lưu bằng secret manager.
3. Khởi động lại backend bằng `npm.cmd run start:dev` và frontend bằng `npm.cmd run dev`.
4. Tại trang Phòng → Thêm/Chỉnh sửa → chọn ảnh JPG/PNG/WebP (mỗi ảnh <=5 MB) → Lưu phòng. Ảnh được tải qua NestJS, lưu đường dẫn nội bộ `storage://<phong-id>/<uuid>.<ext>` trong `public.hinh_anh_phong`. Khi xem, backend cấp signed URL 1 giờ.
5. Có thể đặt ảnh đại diện và xóa ảnh trong cửa sổ Chỉnh sửa.

**Bảo mật:** Chỉ quản trị viên có token hợp lệ được tải/xóa ảnh. Bucket không public, service_role chỉ dùng phía backend. Khi xóa phòng, nếu DB cascade xóa bản ghi ảnh thì file Storage không tự xóa; cần quy trình dọn rác Storage khi triển khai chính thức. URL ảnh đã ký có thể hết hạn sau 1 giờ; tải lại trang để cấp URL mới.

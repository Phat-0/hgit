# Quản lý Combo

## Cập nhật trên máy

```powershell
cd D:\DoAnTotNghiep
git pull origin main
cd may-chu
npm.cmd run db:dong-bo-combo
npm.cmd run start:dev
```

Dừng backend cũ trước khi khởi động lại. Frontend đang chạy Vite sẽ tự tải thay đổi; bản triển khai production cần build và triển khai lại.

Migration dùng DATABASE_URL và CA `may-chu/certificates/supabase-ca.crt`, xác minh TLS; không tắt kiểm tra chứng chỉ. Chạy một lần theo phiên bản trong `migrations_ung_dung`, có transaction và rollback. Script đối chiếu số đơn/tổng tiền, số combo/tổng giá và các khóa ngoại đã tham chiếu combo trước/sau. Giữ nguyên combo cũ, tự chuyển phạm vi từ chi nhánh cũ; không xóa gói giá, đơn hay chứng từ.

Trong `may-chu/.env`, cấu hình SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY để backend tải ảnh. Không đưa service role vào frontend. Migration tạo bucket `anh-combo` riêng tư, giới hạn JPG/PNG/WebP tối đa 5 MB; backend kiểm tra cả MIME và bytes đầu tệp. Ảnh được lưu thành tệp, DB lưu khóa tệp, API trả URL ký thời hạn một giờ. Tải lại danh sách khi URL đã hết hạn.

## Sử dụng

- Danh sách chỉ còn Combo. Màn hình máy tính có bốn thẻ ảnh mỗi hàng; màn hình hẹp tự giảm cột. Tên và giá nằm trên ảnh. Biểu tượng xanh khi đang bán và trong thời gian áp dụng, đỏ khi chưa chạy, hết hạn hoặc tạm ngưng.
- Nhấp thẻ để mở chi tiết bên phải. Các thẻ nhường chỗ với chuyển động FLIP. Trên màn hình nhỏ, thông tin nằm trên lưới để tránh ép nội dung. Hỗ trợ tùy chọn giảm chuyển động của hệ điều hành.
- Tìm kiếm mở rộng khi được chọn; lọc theo chi nhánh và ngày áp dụng. Bỏ lọc để xem lại toàn bộ.
- Tạo/sửa bằng form thống nhất nhãn trái, ô nhập phải; điện thoại chuyển một cột. Chọn tệp ảnh và xem trước; khi sửa không chọn tệp mới thì giữ ảnh cũ.
- Phạm vi: toàn bộ chi nhánh; chọn nhiều chi nhánh; hoặc chọn các phòng ở nhiều chi nhánh. Lọc phòng trong form không làm mất các phòng đã chọn ở chi nhánh khác.
- Combo giờ cần số giờ bao gồm (1–744); combo dịch vụ không có số giờ. Giá dùng cùng ô nhập tiền của ứng dụng: nhập 250 → lưu 250.000 VND.
- Thời gian bắt đầu/kết thúc tính theo UTC+7. Đơn phải nằm hoàn toàn trong khoảng áp dụng. Combo giờ chỉ được chọn cho đơn theo giờ. Điều kiện phòng, phạm vi và thời gian được kiểm tra lại tại backend khi tạo hoặc đổi lịch đơn.
- Xóa cần xác nhận. Khóa ngoại chặn xóa combo đã dùng trong đơn/chi tiết dịch vụ; chọn Tạm ngưng nếu muốn ngừng bán. Giá tiền đã chốt của đơn cũ không bị đổi khi sửa giá combo.
- Combo cũ đang gắn dịch vụ riêng của một chi nhánh không thể tự mở rộng sang chi nhánh khác.

## Kiểm tra

```powershell
cd D:\DoAnTotNghiep\may-chu
npm.cmd test -- src/quan-tri/combo.spec.ts src/quan-tri/khung-gio.spec.ts src/quan-tri/tao-don-admin.spec.ts src/quan-tri/lich-phong-schema.spec.ts src/quan-tri/don-lich.spec.ts src/quan-tri/danh-sach-don.spec.ts
npm.cmd run build
npm.cmd run lint
cd ..\trang-web
npm.cmd run build
```

Cần kiểm tra ảnh thực trên Supabase sau khi chạy migration và cấu hình khóa Storage. Không có khóa hoặc DB thực trong môi trường kiểm tra mã nguồn thì chưa thể xác nhận thao tác đó trên dự án online.

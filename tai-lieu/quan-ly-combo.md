# Quản lý Combo

## Cập nhật trên máy

```powershell
cd D:\DoAnTotNghiep
git pull origin main
cd may-chu
npm.cmd run db:dong-bo-combo
npm.cmd run db:anh-combo
npm.cmd run start:dev
```

Dừng backend cũ trước khi khởi động lại. Frontend đang chạy Vite sẽ tự tải thay đổi; bản triển khai production cần build và triển khai lại.

Migration dùng DATABASE_URL và CA `may-chu/certificates/supabase-ca.crt`, xác minh TLS; không tắt kiểm tra chứng chỉ. Chạy một lần theo phiên bản trong `migrations_ung_dung`, có transaction và rollback. Script đối chiếu số đơn/tổng tiền, số combo/tổng giá và các khóa ngoại đã tham chiếu combo trước/sau. Giữ nguyên combo cũ, tự chuyển phạm vi từ chi nhánh cũ; không xóa gói giá, đơn hay chứng từ.

Trong `may-chu/.env`, cấu hình SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY để backend tải ảnh. Không đưa service role vào frontend. Migration tạo bucket `anh-combo` riêng tư, giới hạn JPG/PNG/WebP tối đa 5 MB; backend kiểm tra cả MIME và bytes đầu tệp. Ảnh được lưu thành tệp, DB lưu khóa tệp, API trả URL ký thời hạn một giờ. Tải lại danh sách khi URL đã hết hạn.

## Sử dụng

Nền qt-layout dùng gradient tím bóng chung; thẻ nội dung vẫn trắng. Tên trang Combo ở hàng trên, bộ lọc khoảng ngày, tìm kiếm, chi nhánh và thao tác được căn cùng hàng bên dưới. Bộ lọc hiển thị sẵn ngày; trước khi chọn lại khoảng ngày, danh sách vẫn hiển thị toàn bộ thời gian.

- Danh sách chỉ còn Combo. Màn hình máy tính có bốn thẻ ảnh mỗi hàng; màn hình hẹp tự giảm cột. Tên và giá nằm trên ảnh. Biểu tượng xanh khi đang bán và trong thời gian áp dụng, đỏ khi chưa chạy, hết hạn hoặc tạm ngưng.
- Nhấp thẻ mở hộp chi tiết giữa màn hình. Tên combo và giá nằm trên đầu cạnh nút đóng, hàng dưới dành riêng cho ảnh (nhấn để phóng to), bắt đầu/kết thúc cùng một hàng; mô tả/phạm vi dài có thanh cuộn bên trong. Có nút sửa, xóa và đóng.
- Tìm kiếm mở rộng khi được chọn; lọc theo chi nhánh, khoảng từ ngày–đến ngày và phân loại Combo dịch vụ/Combo giờ. Phân loại nằm cạnh nút Làm mới. Bỏ lọc để xóa điều kiện chi nhánh/ngày/từ khóa.
- Tạo/sửa bằng form hai cột, mỗi trường có nhãn trái và ô nhập phải; điện thoại chuyển một cột. Chọn nhiều tệp ảnh và xem trước (tối đa 8 ảnh, mỗi ảnh 5 MB); có thể bỏ từng ảnh và đặt ảnh đã lưu làm bìa. Khi sửa không chọn tệp mới thì giữ ảnh cũ. Migration db:anh-combo chuyển ảnh bìa cũ sang danh sách ảnh mà không xóa tệp.
- Phạm vi: toàn bộ chi nhánh; chọn nhiều chi nhánh; hoặc chọn các phòng ở nhiều chi nhánh. Lọc phòng theo chi nhánh và loại phòng không làm mất lựa chọn ở chi nhánh khác. Hai khung cạnh nhau gồm danh sách để chọn và các phòng đã chọn, hỗ trợ chọn tất cả kết quả lọc hoặc bỏ từng phòng.
- Combo giờ cần số giờ bao gồm (1–744); combo dịch vụ không có số giờ. Giá dùng cùng ô nhập tiền của ứng dụng: nhập 250 → lưu 250.000 VND.
- Chọn khoảng ngày bằng cùng bộ lịch của Đơn đặt phòng; giờ bắt đầu và giờ kết thúc đặt cạnh nhau, bấm cả ô để mở bộ chọn Giờ/Phút và bấm ngoài để đóng. Thời gian tính theo UTC+7. Đơn phải nằm hoàn toàn trong khoảng áp dụng. Combo giờ chỉ được chọn cho đơn theo giờ. Điều kiện phòng, phạm vi và thời gian được kiểm tra lại tại backend khi tạo hoặc đổi lịch đơn.
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

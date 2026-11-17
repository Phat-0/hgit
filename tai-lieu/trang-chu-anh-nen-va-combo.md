# Trang chủ: ảnh nền, ảnh nổi và Combo

Trong quản trị → **Trang chủ**:

1. Ở **Banner đầu trang**, tải **Ảnh nền đầu trang** để phủ nền khu vực đầu trang. **Ảnh nổi đầu tiên** và tối đa 8 ảnh bổ sung tạo bộ ảnh có nút trước/sau, ảnh nhỏ, vuốt ngang trên điện thoại và mở ảnh lớn.
2. Sửa tên website, dòng giới thiệu, tiêu đề Phòng/Combo, màu, số cột và vị trí ảnh nổi trong **Thương hiệu và bố cục trang khách**. Bộ ảnh được cấu hình sẽ được ưu tiên; chỉ dùng ảnh phòng làm bộ ảnh dự phòng khi chưa cấu hình ảnh nổi.
3. **Danh sách phòng** cho phép hiển thị phòng và mục Combo. Phòng, giá, ảnh và combo lấy từ nghiệp vụ hiện có; không nhập lại giá trong CMS.
4. Ở **Chân trang**, sửa tiêu đề, nội dung, ảnh/logo, địa chỉ, số điện thoại và email. Liên kết gọi điện/gửi email lấy đúng các trường này.
5. **Lưu nháp** giữ nguyên bản khách đang thấy; **Xuất bản trang chủ** áp dụng cấu hình khi trang khách tải lại. Vẫn kiểm tra quyền trang và phiên bản chống ghi đè như trước.

Khung đặt phòng nằm dưới phần ảnh đầu trang, nền kem sáng, mỗi ô điều khiển cao 44px. Chọn theo giờ dùng cùng `ChonGio` với quản trị, chọn từng phút và tự đóng khi bấm ngoài. Theo ngày/qua đêm giữ giờ nhận/trả theo thiết lập nghiệp vụ của quản trị.

Phòng và Combo là hai khu vực riêng. Combo đang bán được lọc theo thời gian, loại đặt và chi nhánh qua API `GET /api/khach/combo-noi-bat`. Danh sách phòng áp dụng lấy từ các phòng trống và phạm vi combo. Khi đặt combo, API cũ vẫn kiểm tra phòng/giá/phạm vi lần nữa và trả tổng tiền phòng + combo; giá trên thẻ được ghi rõ là giá combo.

Ảnh và liên hệ được lưu trong JSON cấu hình Trang chủ hiện có; không thêm bảng/cột DB. Ảnh nền/bộ ảnh chỉ nhận URL của kho ảnh Trang chủ được tải lên qua API sẵn có, tối đa 5MB/ảnh. Cấu hình cũ vẫn đọc/lưu được; nháp không được đưa ra public khi chưa xuất bản.

Lịch giờ/đêm: đường viền ngang chỉ do ô bảng vẽ 1px; các ô nền nửa giờ không vẽ thêm viền trên/dưới. Hàng chính cao 65px = nội dung 64px + viền 1px, giống nguyên tắc của lịch ngày; mở rộng các hàng giá vẫn giữ một viền duy nhất.

## Kiểm tra

- Build web/máy chủ; kiểm tra cấu trúc; bộ UI hiện có và tích hợp PGlite.
- Máy chủ 111 kiểm thử đạt, gồm nhận cấu hình cũ/mới, ảnh đúng kho, tối đa album, liên hệ hợp lệ và catalog chỉ trả trường public.
- Playwright: 1440/1024/768/390px, không tràn ngang, điều khiển cùng 44px, chọn phút và bấm ngoài; đặt combo mở biểu mẫu với đúng tổng giá; CMS tải ảnh/sửa liên hệ/tiêu đề và gửi xuất bản đúng cấu hình trong API giả lập.
- API catalog trên máy phát triển phản hồi 200; có thể trả danh sách rỗng khi không có combo áp dụng. Không tạo ảnh hoặc combo giả trong dữ liệu thật.

Thiết kế tiếp tục tham khảo quy trình [Unslop](https://github.com/heydamir/unslop) của Damir Sokolovsky (@heydamir), CC BY 4.0; màu nâu–vàng, ảnh nổi và bố cục theo ảnh người dùng cung cấp.

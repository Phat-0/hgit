# App khách và số lượng combo

## Đã thay đổi

- App bắt buộc đăng nhập OTP/email trước khi mở dữ liệu. Đăng xuất đóng các trang riêng; lỗi HTTP 401 đưa về đăng nhập. Phiên hiện vẫn chỉ ở RAM.
- Nền đăng nhập gradient chuyển động, không có nội dung quảng cáo. Tôn trọng giảm chuyển động của hệ thống.
- Thanh dưới có Trang chủ / Phòng / Đặt phòng / Combo / Giỏ hàng; nút đặt phòng lớn ở giữa. Danh sách phòng/combo hai sản phẩm mỗi hàng, thẻ tăng chiều cao theo chữ.
- Sắp xếp giá/nổi bật, phòng trống hiện tại theo khung giờ quản trị và thời lượng tối thiểu; ảnh chi tiết phóng to, chat mở bottom sheet.
- Đặt mặc định theo giờ, họ tên/điện thoại lên trước, ngày và giờ chọn riêng. Nhận sớm/trả muộn nhập số nguyên 0–12. Combo dịch vụ nhập số lượng 1–20, gói giờ tối đa 1 gói/phòng.
- Combo chi tiết chọn số lượng rồi chọn phòng phù hợp để đặt. Giỏ hàng là đơn của tài khoản xếp dọc.
- API app/dat-phong bắt buộc xác thực ở server, tạo trạng thái Đã xác nhận; không xác nhận thanh toán. Web vẫn dùng cơ chế chờ xác nhận trước đó. Cả hai vẫn khóa phòng/chống lặp như cũ.
- Báo giá lỗi 409 hiện giờ không khả dụng và biểu tượng cảnh báo; nhấn đặt hiện thông báo chọn lại. Web có cùng cảnh báo, số lượng combo và phụ thu giờ nguyên.
- Quản trị app: menu theo quyền; xem dữ liệu các mục, lịch ngày theo từng phòng, vệ sinh với xác nhận hoàn thành, danh sách hội thoại/chat. Backend kiểm tra quyền từng API.

## Database

Migration `20261120073825_so_luong_combo.sql` đã áp dụng vào homestay-db: cập nhật hàm chốt chi tiết để ghi số lượng và nhân đơn giá. Không thêm bảng/cột, không chạy lại đơn cũ. Đã xác minh hàm ghi/tính số lượng và anon/authenticated không có quyền gọi trực tiếp.

## Kiểm tra và giới hạn

- Backend và web build, kiểm thử số lượng/phụ thu/không tạo đơn app khi chưa đăng nhập.
- Dart kiểm tra cú pháp; thêm test đăng nhập bắt buộc và giữ các test nhiều kích thước/cỡ chữ. Chưa chạy Flutter analyzer/test do môi trường này không có SDK.
- Tunnel file và SimUtil đang mất kết nối, chưa cài bản mới lên emulator, chưa kiểm tra thực tế animation/cỡ chữ và chưa đồng bộ trực tiếp D:\DoAnTotNghiep. Không tạo đơn thật để kiểm thử.
- Quản trị app hiện là phần xem dữ liệu và các luồng vệ sinh/chat; chưa đủ CRUD/cấu hình như web, lịch chưa có lưới giờ tương tác/kéo thả. Form đặt đơn quản trị web vẫn chưa thêm bộ chọn số lượng; số lượng đã chốt của đơn app/web khách được giữ khi đọc chi tiết.

## Cập nhật trên Windows

Lưu thay đổi riêng của bạn trước khi kéo mã. Từ gốc dự án dùng `git pull --ff-only` nếu working tree cho phép; không reset bỏ thay đổi. Khởi động lại backend sau khi lấy mã mới.

```powershell
cd D:\DoAnTotNghiep\ung-dung-di-dong
flutter pub get
flutter analyze
flutter test
flutter run -d emulator-5554
```

Cần bật lại tunnel file và SimUtil để kiểm tra thiết bị và hoàn thiện phần quản trị còn lại.

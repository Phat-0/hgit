# App HomeStay — bản khách đầu tiên

Flutter native, dùng API NestJS và Supabase Auth của web. Không tạo database riêng; không đưa khóa Gemini/Supabase service-role vào app.

## Chạy trên Android Studio

Cài Flutter stable 3.29 trở lên, Android Studio, plugin Flutter/Dart và Android SDK. Mở Device Manager tạo và chạy một emulator.

Trong PowerShell:

```powershell
cd D:\DoAnTotNghiep\ung-dung-di-dong
powershell -ExecutionPolicy Bypass -File .\cong-cu\chuan-bi.ps1
flutter devices
flutter run --dart-define=API_URL=http://10.0.2.2:3000/api
```

Mở thư mục `ung-dung-di-dong` trong Android Studio. Script tạo Android/web bằng Flutter SDK đang cài, giữ nguyên mã ứng dụng, cấp quyền Internet và chỉ cho HTTP ở debug. API phải đang chạy cổng 3000. `10.0.2.2` là máy Windows nhìn từ Android Emulator; điện thoại thật dùng IP LAN của máy chạy server, cùng Wi-Fi. Không dùng localhost của điện thoại.

Bản phát hành dùng URL HTTPS thật:

```powershell
flutter build apk --release --dart-define=API_URL=https://TEN-MIEN-CUA-BAN/api
```

`TEN-MIEN-CUA-BAN` phải được thay bằng server thực tế. Chữ ký phát hành và cấu hình production cần hoàn thiện trước khi phát hành Play Store.

## Đã viết

- Trang khách tông nâu/vàng, nội dung hero lấy từ quản trị web; dữ liệu phòng, combo, chi nhánh, đánh giá và số liệu từ API.
- Chuyển tab có fade/slide; khối xuất hiện khi vào viewport. Tôn trọng cài đặt giảm chuyển động của hệ thống.
- Bố cục 1/2/3 cột theo chiều rộng và cỡ chữ; không khóa chiều cao thẻ theo chữ. Cỡ chữ 100/115/130/150% lưu trên thiết bị và kết hợp cỡ chữ hệ thống.
- Chi tiết phòng, album vuốt ngang, ảnh toàn màn hình và pinch zoom.
- Chọn giờ/ngày/đêm, giờ cuộn mốc 30 phút theo thiết lập quản trị, phụ thu nhận sớm/trả muộn, số khách, combo, voucher; báo giá từ server.
- Tạo yêu cầu đặt phòng có UUID chống lặp; giữ UUID khi gửi lại cùng biểu mẫu sau lỗi mạng. Server quyết định giá và chống trùng lịch.
- OTP dùng tài khoản Supabase hiện tại; xem đơn của tôi. Token chỉ ở RAM trong phiên, chưa lưu phiên đăng nhập và tự refresh. Khi token hết hạn cần đăng nhập lại.
- Chat văn bản với CSKH, cập nhật mỗi 5 giây khi app hoạt động. AI trả lời theo thiết lập backend hiện tại; app không gọi Gemini trực tiếp.

## Phạm vi còn lại

Đây là nền app khách đầu tiên, chưa phải toàn bộ chức năng web. Chưa có màn hình nhân viên/quản trị/vệ sinh, push notification, upload/xem tệp chat, bản đồ, thanh toán, hủy đơn và tìm phòng theo thời gian ngay tại trang chủ. Combo hiện xem được; áp dụng khi chọn phòng rồi mở đặt phòng. Chưa có album stack/parallax và review carousel đầy đủ như web. Những phần này cần nối tiếp sau khi chạy thiết bị và kiểm tra các luồng cơ bản.

## Kiểm tra

```powershell
flutter analyze
flutter test
flutter run --profile --dart-define=API_URL=http://10.0.2.2:3000/api
```

Đã thêm test API lỗi phòng hết chỗ/khóa chống lặp và test bố cục rộng 320/390/768/1024 với text scale 1/1.5/2. Các test Flutter chưa được chạy trong môi trường soạn mã này do không có SDK. Kiểm tra cú pháp Dart đã chạy đạt bằng parser; không thay thế analyze, test hay kiểm tra emulator.

Trên thiết bị kiểm tra thêm: xoay ngang, bàn phím, màn hình nhỏ, cỡ chữ hệ thống 200%, giảm chuyển động, mạng yếu/mất mạng, phòng vừa được đặt, nhận OTP, chat và quay lại app sau khi chạy nền. Không tạo đơn thật tự động trong test.

## Kết nối MCP

Xem [hướng dẫn Android Studio + SimUtil](../tai-lieu/ket-noi-mcp-android.md).

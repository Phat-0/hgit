# App HomeStay — bản khách đầu tiên

Flutter native, dùng API NestJS và Supabase Auth của web. Không tạo database riêng; không đưa khóa Gemini/Supabase service-role vào app.

## Chạy trên Android Studio

Cài Flutter stable 3.35 trở lên, Android Studio, plugin Flutter/Dart và Android SDK. Mở Device Manager tạo và chạy một emulator.

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

## Phiên bản mới

Chi tiết tính năng, kiểm thử và phần còn lại: [App khách và số lượng combo](../tai-lieu/app-khach-va-so-luong-combo.md).

App yêu cầu đăng nhập trước khi vào, thanh điều hướng 5 mục, danh sách hai sản phẩm/hàng, cỡ chữ thích ứng. Đặt phòng/giá/combo dùng chung API với web. Quản trị app hiện có phần xem dữ liệu và luồng lịch/vệ sinh/tin nhắn; chưa đủ CRUD như web.

## Kiểm tra

```powershell
flutter analyze
flutter test
flutter run -d emulator-5554
```

Chưa chạy analyzer/test/emulator trong môi trường này vì chưa có Flutter SDK và tunnel thiết bị đang ngắt. Kiểm tra cú pháp Dart đạt; kiểm thử nhiều cỡ chữ đã được viết, chưa được chạy. Không coi kiểm tra cú pháp là bằng chứng giao diện đã chạy đúng.

## Kết nối MCP

Xem [Android Studio + SimUtil](../tai-lieu/ket-noi-mcp-android.md).

## Lỗi Kotlin trên Windows

Nếu còn cache lỗi giữa Pub Cache ổ C và mã ổ D, dừng lần chạy cũ, rồi chạy một lần:

```powershell
.\android\gradlew.bat -p .\android --stop
flutter clean
flutter pub get
flutter run -d emulator-5554
```

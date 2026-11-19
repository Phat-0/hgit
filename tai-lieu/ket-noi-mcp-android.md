# Android Studio + SimUtil MCP

Android Studio dùng để sửa/build ứng dụng; SimUtil MCP điều khiển emulator/điện thoại để xem, chạm, vuốt và kiểm tra giao diện. Kết nối này không tự cấp quyền chạy terminal hay đọc mã nguồn; giữ kết nối file dự án đang có.

## 1. Chuẩn bị máy Windows

1. Cài Android Studio và SDK Platform-Tools; bật một emulator trong Device Manager.
2. Cài SimUtil Desktop bản Windows từ https://github.com/dungngminh/simutil/releases?q=app-v bằng `SimUtil-windows-x64-setup.exe`. Chọn cài adb nếu máy chưa có.
3. Mở SimUtil. Emulator phải xuất hiện trong danh sách. Chọn stream để xem màn hình.
4. Chạy app theo README trong `ung-dung-di-dong`, giữ backend đang chạy.

Kiểm tra Android nhận thiết bị trong PowerShell nếu adb đã có PATH:

```powershell
adb devices
```

Điện thoại thật cần bật Developer options → USB debugging và chấp thuận hộp thoại RSA trên điện thoại. Trạng thái phải là `device`, không phải `unauthorized`.

## 2. Kết nối MCP

Trong SimUtil nhấn biểu tượng phích cắm ở góc trên bên phải. Ứng dụng có cấu hình MCP sao chép sẵn cho từng công cụ. Endpoint mặc định:

```text
http://127.0.0.1:8765/mcp
```

Đây là MCP qua HTTP, không phải Playwright và không phải URL trang web. Giữ SimUtil mở khi sử dụng.

Client MCP chạy ngay trên máy Windows có thể dùng cấu hình HTTP:

```json
{
  "mcpServers": {
    "simutil": {
      "url": "http://127.0.0.1:8765/mcp"
    }
  }
}
```

Cấu trúc cấu hình khác nhau tùy client; ưu tiên cấu hình SimUtil tạo sẵn cho đúng client. Ví dụ chính thức cho Claude Code:

```powershell
claude mcp add --transport http simutil http://127.0.0.1:8765/mcp
```

## 3. Để cuộc trò chuyện ChatGPT này điều khiển máy ảo

ChatGPT không truy cập được `127.0.0.1` của máy bạn trực tiếp. Cần thêm kết nối MCP qua tunnel giống kết nối file/Playwright trước đây. Không dán endpoint localhost vào một kết nối cloud rồi chờ hoạt động.

Nếu tunnel client chỉ nhận MCP qua lệnh stdio, dùng cầu nối `mcp-remote` đến SimUtil HTTP:

```powershell
npx.cmd -y mcp-remote http://127.0.0.1:8765/mcp --allow-http
```

Ở cấu hình tunnel, dùng chính lệnh trên làm MCP command. Với runtime bạn từng sử dụng:

```powershell
$env:CONTROL_PLANE_TUNNEL_ID = "ID_TUNNEL_SIMUTIL_MOI"
.\tunnel-client-runtime.exe run --mcp.command "npx.cmd -y mcp-remote http://127.0.0.1:8765/mcp --allow-http" --health.listen-addr "127.0.0.1:8083"
```

`ID_TUNNEL_SIMUTIL_MOI` là ID do phần tạo kết nối cấp, không dùng lại ID của file/Playwright. `8083` là cổng health còn trống, không phải cổng SimUtil; nếu bận chọn cổng khác. Chưa có kết nối SimUtil trong cuộc trò chuyện hiện tại nên chưa thử được lệnh tunnel này trên máy bạn. Không mở công khai cổng điều khiển 8765 ra Internet.

Khi kết nối xong, yêu cầu: “Dò thiết bị SimUtil, mở app HomeStay, kiểm tra màn 390 và tablet, cỡ chữ lớn, vuốt trang chủ, ảnh phòng, chọn giờ và chat; không gửi đơn thật.” Tôi sẽ dùng các công cụ được kết nối, không đoán kết quả từ mã.

## 4. Công cụ cần thấy

- `list_devices`: thiết bị và trạng thái.
- `stream_device`: hiện thiết bị.
- `screenshot`: ảnh màn hình thật.
- `tap`, `swipe`, `press_button`: tương tác.
- `run_scenario`: chạy chuỗi thao tác trên nhiều thiết bị.

Nếu không thấy thiết bị, xử lý adb trước. Nếu có thiết bị nhưng không có tool MCP, kiểm tra SimUtil, cổng 8765 và tunnel. Nếu app không lấy được phòng, kiểm tra `API_URL` và backend, không phải MCP.

Nguồn chính thức đã đối chiếu: https://github.com/dungngminh/simutil/blob/main/app/README.md và https://github.com/dungngminh/simutil.

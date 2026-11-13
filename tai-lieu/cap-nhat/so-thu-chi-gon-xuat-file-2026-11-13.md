# Sổ thu chi gọn, dữ liệu mẫu và xuất file — 13/11/2026

- Tên Sổ thu chi ở góc trái; tìm kiếm ngay dưới. Cùng hàng là lịch gọn, ba mục Tổng/Thu/Chi và tiền tồn. Nút Thay đổi chỉ hiện khi tiền tồn khác giá trị đã lưu.
- Bảng luôn có khung tối thiểu, kể cả khi chưa có dữ liệu/đang tải. Dấu + nằm giữa đường nối cuối bảng với footer để thêm dòng.
- Bỏ cột Thao tác. Sửa trực tiếp các ô như trước. Chọn dòng hoặc nhấp chuột phải vào dòng để hiện công cụ bên ngoài bảng: đổi màu, Lưu, Hoàn tác, Xóa có xác nhận. Công cụ không chiếm cột dữ liệu; Enter trong input không tự xóa hay thực hiện thao tác tài chính.
- Tính tổng vùng và theo ngày vẫn hoạt động; thay đổi chưa lưu không tự thay số dư tháng. Nhập tiền theo nghìn đồng như các form khác.

## Xuất file

Menu Xuất file phía trên:

1. **Excel · tất cả trong kỳ:** file `.xlsx` thực sự, gồm Sổ thu chi, Tổng tháng và Thu chi ngày. Có phòng/chi nhánh, số dư, tên chứng từ và mã màu hàng. Số tiền là ô số, giữ đúng dấu âm. Lấy dữ liệu đã lưu trong khoảng lịch chính, không phụ thuộc lọc tìm kiếm.
2. **CSV · tất cả trong kỳ:** các dòng đã lưu trong khoảng ngày.
3. **CSV · dòng đang lọc:** theo bảng hiện tại; nếu có bản nháp, nội dung đang sửa cũng được xuất để xem trước. Đây không phải thao tác lưu DB.

Biểu đồ có **SVG** và **CSV biểu đồ**, dùng đúng phạm vi chi nhánh/phòng, cách nhóm, màu, thứ tự và lựa chọn % hiện tại. SVG gồm biểu đồ thanh thu/chi và vòng tròn, là file vector có thể phóng to/in. CSV có số tiền và phần trăm.

Phần Thống kê đặt phòng mở rộng giữ xuất CSV theo ngày, thêm **Xuất Excel dữ liệu hiển thị** cho ngày, từng phòng, chi nhánh, kiểu đặt, thanh toán, trạng thái và các đơn đang được API trả về. Giới hạn đơn vẫn hiển thị rõ tối đa 300 đơn mới nhất; file không giả vờ chứa các đơn ngoài phạm vi API.

Các ảnh/tệp chứng từ tải riêng qua mục Chứng từ. Excel/CSV chứa tên tệp, không nhúng token, link truy cập dài hạn hoặc tự đóng gói tệp riêng tư. Bảng giới hạn 5.000 dòng/khoảng; thu hẹp khoảng lịch nếu vượt giới hạn trước khi xuất.

CSV có UTF-8 BOM để đọc tiếng Việt; chuỗi nghi là công thức được vô hiệu hóa, còn số âm vẫn là số. Excel dùng OOXML inline strings, không tạo macro hay công thức từ nội dung người nhập.

## Dữ liệu mẫu đã thêm

Script `co-so-du-lieu/du-lieu-mau/so-thu-chi-20261113.sql` đã chạy trên Supabase theo yêu cầu. Có 14 dòng: 10 khoản thu phòng/vệ sinh cho 5 phòng hiện có và 4 khoản giặt sấy, đồ uống, điện nước, văn phòng. Mọi dòng có `[MẪU]` và ghi chú `DỮ LIỆU MẪU · Không phải giao dịch thực tế`. Tổng mẫu: thu 2.550.000đ, chi −1.195.000đ. Không sửa tiền tồn, đơn đặt phòng hoặc các khoản có trước.

Script có khóa giao dịch và kiểm tra nhãn để chạy lại không nhân đôi. Tạo mẫu có nhật ký. Có thể tìm `[MẪU]` rồi sửa hoặc xóa từng dòng bằng công cụ dòng như bình thường; không có nút tự xóa hàng loạt dữ liệu thật.

## Kiểm tra và cập nhật

Đã dùng Playwright MCP mở website localhost:5173 với dữ liệu giả tối thiểu, không dùng tài khoản thật và không ghi API thật. Bản đang chạy trước cập nhật vẫn có 9 cột và header cao 185px, đã xác định nguyên nhân bố cục chật và bảng bị đẩy xuống. Không chuyển bundle hay fixture nội bộ đầy đủ sang MCP. Chưa chụp xác nhận bản mới vì máy đang chạy cần nhận commit mới trước.

Kiểm chứng bản code mới: build frontend/backend, lint, các bài backend/PostgreSQL/DOM, kiểm tra ZIP CRC/XML của XLSX, số âm và chống công thức CSV, đủ 8 cột, nút +, nút tiền tồn chỉ xuất hiện khi thay đổi. Seed được thử chạy hai lần để kiểm tra không trùng.

```powershell
cd D:\DoAnTotNghiep
git pull origin main
cd may-chu
npm.cmd run build
cd ..\trang-web
npm.cmd run build
```

Khởi động lại backend để nhận API có tên chứng từ trong dữ liệu xuất. Không có migration schema mới ở lần này; dữ liệu mẫu đã được thêm trực tiếp qua MCP và lưu script để đối chiếu.

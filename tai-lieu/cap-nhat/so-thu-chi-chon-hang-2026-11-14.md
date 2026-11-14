# Sổ thu chi: chọn hàng, chỉnh rộng cột và chọn nhanh tháng — 14/11/2026

## Bố cục

- Bỏ tiêu đề “Báo cáo thống kê” ở đầu phần nội dung của trang; giữ mục điều hướng để vẫn vào được báo cáo.
- Sổ thu chi ở hàng riêng. Hàng kế tiếp: tìm kiếm, lịch dùng chung, xuất file và biểu tượng làm mới.
- Hàng ngay trên bảng: bên trái chọn màu/xóa các hàng đã đánh dấu, bên phải Tổng/Thu/Chi có màu riêng và tiền tồn. Chỉ hiện nút Thay đổi khi tiền tồn khác giá trị đã lưu.
- Không còn dòng hướng dẫn “Nhập nghìn đồng” trên bảng. Các ô tiền vẫn giữ quy tắc nhập nghìn đồng và chú thích khi trỏ chuột như trước.
- Dấu + giữ ở giữa mép cuối bảng; bỏ chọn bên dưới đổi thành biểu tượng có nhãn trợ năng và tooltip.

## Chọn và sửa hàng

Bỏ chọn từng ô/vùng ô. Mỗi dòng có ô đánh dấu; ô trên tiêu đề chọn tất cả hàng đang hiển thị. Có thể chọn bằng bàn phím, Ctrl/Shift hoặc kéo qua các vùng trống của hàng. Chọn cả hàng không ảnh hưởng việc sửa từng trường bên trong.

Chọn màu áp dụng vào bản nháp của các hàng đã chọn. Nhấn Lưu để ghi lại; Hoàn tác để bỏ phần đang sửa. Khi đổi loại/ghi chú khiến dòng không còn khớp bộ lọc, dòng có bản nháp vẫn được giữ trên bảng để không mất nút lưu.

Xóa nhiều hàng có một xác nhận trước khi xử lý. Mỗi hàng vẫn được kiểm tra quyền, phiên bản và chứng từ ở backend. Hàng chưa thể xóa được giữ lại, giao diện thông báo cụ thể; không giả vờ xóa thành công toàn bộ. Không tự xóa chứng từ để vượt ràng buộc.

Tổng hàng chọn chỉ cộng tiền các hàng được chọn, không cộng tiền tồn. Dòng mới mặc định ngày hôm nay theo giờ Việt Nam, kể cả lúc đang xem kỳ khác. Nếu lưu ngày ngoài kỳ đang xem thì cần đổi bộ lịch để thấy lại dòng đó.

## Độ rộng bảng

Kéo vạch ở mép phải từng tiêu đề để thay độ rộng cột; cuộn ngang bên trong bảng. Có thể dùng phím trái/phải trên vạch, nhấp đúp hoặc Home để đặt lại. Độ rộng được nhớ trên trình duyệt, không thay đổi bố cục của máy khác. Không kéo giãn toàn bộ trang.

## Lịch

Dùng cùng RangePicker với các form khác, giữ nguyên cách bấm ngày bắt đầu/ngày kết thúc. Riêng hai bộ lịch của sổ thu chi có thêm hàng Chọn nhanh tháng: chọn tháng/năm rồi Chọn tháng để lấy ngày đầu đến ngày cuối tháng (có xét năm nhuận).

Lịch tính tổng bên dưới thay hai ô ngày rời. Sau lịch là ba ô Tổng/Thu/Chi của khoảng đã chọn, độc lập tiền tồn. Lịch này giới hạn trong dữ liệu đã tải bởi lịch chính; muốn tính kỳ khác, đổi lịch chính trước. Chọn nhanh tháng trong lịch tổng cũng tuân thủ giới hạn đó.

## Kiểm chứng và cập nhật

Đã kiểm tra build frontend và các tương tác DOM: chọn cả hàng/biểu tượng bỏ chọn, kéo rộng cột/đặt lại, chọn tháng 2/2028 có 29 ngày, chọn khoảng ngày thủ công, ngày mới là hôm nay, hiển thị ba tổng bên dưới lịch. Không thay đổi schema hoặc dữ liệu DB.

Playwright đã mở website localhost:5173; phiên kiểm tra hiện ở màn hình đăng nhập, chưa xác nhận trực quan bản bố cục mới trên máy đang chạy. Không dùng thông tin đăng nhập thật, không xuất artifact dự án sang MCP.

```powershell
cd D:\DoAnTotNghiep
git pull origin main
cd trang-web
npm.cmd run build
```

Lần này chỉ thay frontend; không cần chạy migration.

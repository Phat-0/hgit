# Rà soát giao diện chọn và căn chỉnh

Ngày: 16/11/2026

- Dùng cơ chế chung đóng danh sách khi bấm ra ngoài, chuyển tiêu điểm hoặc nhấn Escape; giữ danh sách mở khi tick nhiều lựa chọn bên trong.
- Đưa danh sách thống kê/biểu đồ lên lớp popover, giới hạn theo màn hình, tự chọn vị trí phía trên hoặc dưới để tránh khung cuộn cắt nội dung.
- Tên chi nhánh/phòng xuống dòng đầy đủ; danh sách đối tượng và phòng chia 3 cột trên màn hình lớn, 2 cột trên điện thoại.
- Đóng thiết lập cột khi bấm ra ngoài, vẫn giữ khi đang thao tác lịch riêng.
- Áp dụng đóng ngoài cho menu phòng, chi nhánh, hồ sơ, tìm kiếm và thanh điều hướng di động.
- Đồng bộ các nút lọc/lịch/ô chọn của sổ thu chi, biểu đồ và thống kê cao 32px, khoảng cách 8px.
- Sửa sidebar tại độ rộng 768px che khuất nội dung khi đang đóng.

## Kiểm tra

Playwright trên giao diện quản trị với API giả lập trong ngữ cảnh trình duyệt riêng:

- 1440, 1024, 768, 390px: danh sách nằm trong màn hình, không cắt chữ, không tràn ngang, bố cục 3/2 cột.
- Chọn nhiều checkbox vẫn mở; bấm ngoài, Escape, chuyển tiêu điểm đóng đúng; mở danh sách khác đóng danh sách cũ.
- Menu phòng/chi nhánh, hồ sơ, tìm kiếm, sidebar máy tính bảng, lịch và giờ: bấm ngoài/Escape hoạt động.
- Thiết lập cột và lịch riêng hoạt động cùng nhau; bấm ngoài đóng thiết lập.
- Kiểm tra đo chiều cao các ô điều khiển: 32px.
- Build frontend và bộ kiểm thử giao diện hiện có chạy đạt.

Mã kiểm tra có thể chạy với Playwright Page trong kiem-thu/lua-chon-noi.playwright.mjs. Dữ liệu kiểm tra không ghi vào cơ sở dữ liệu; không thay đổi schema.


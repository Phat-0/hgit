# Ổn định lịch và thu gọn biểu đồ

- Đổi nền vùng biểu đồ thu chi sang xanh xám nhạt; biểu đồ cột xanh nhẹ, tròn tím nhẹ; hai ô lịch có màu tương ứng. Nền SVG hòa cùng thẻ; chữ giữa hình tròn dùng màu đậm hơn để đọc rõ.
- Mỗi tháng luôn có 42 ô / 6 hàng tuần. Tên tháng có chiều cao cố định, đổi tháng không đổi chiều cao/vị trí popup.
- Sửa nguyên nhân nền tên trong danh sách giãn hết hàng lưới: summary/label chỉ rộng theo nội dung, tối đa 170px; các mục bên trong áp dụng cùng quy tắc.
- Ô bật/tắt biểu đồ dùng toàn bộ khung tên, không giới hạn phần chữ hoặc vùng tô; ẩn làm mờ cả ô, nút × ở góc được giữ.
- Khung chỉnh tính chất có padding 6px, gap 4px, điều khiển 28px và độ rộng vừa nội dung.
- Menu bảng thống kê, biểu đồ thu chi và biểu đồ thống kê hiển thị ngay các nút sắp xếp; không dùng select để chọn kiểu sắp xếp.
- Xuất biểu đồ là ba ô SVG/Excel/CSV có biểu tượng, mô tả, nút tải và trạng thái khóa khi đang tải/lỗi. Xuất xong đóng menu.
- Không thay đổi DB.

## Kiểm tra

Playwright trong context API giả lập riêng: đổi qua tháng 2/3/8/11 giữ nguyên vị trí/chiều cao; 42 ô/tháng. Tại 1440/1024/768/390px lịch không nhảy. Đo ô Chi nhánh 84.25px, Phòng 64.89px; kiểm tra editor gap 4/padding 6; lịch cột/tròn khác màu; vùng nhấn phủ toàn ô; sắp xếp trực tiếp áp dụng; 3 lựa chọn xuất và tải CSV thực thành công. Kiểm tra hình bằng ảnh chụp trình duyệt.

Build frontend, bộ kiểm thử giao diện hiện có đạt; cập nhật các kiểm tra sắp xếp sang nút trực tiếp.

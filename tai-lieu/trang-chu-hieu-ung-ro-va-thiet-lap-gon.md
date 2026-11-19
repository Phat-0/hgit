# Trang chủ: hiệu ứng rõ hơn và thiết lập gọn

- Tăng chuyển động Scroll-Driven từ 28 lên 64px, kéo dài quãng cuộn. Gắn timeline riêng vào ảnh, tiêu đề, đoạn chữ và thông tin thẻ; không chỉ gắn vào khối bao. Footer hoàn tất hiệu ứng ngay khi vào đủ màn hình để chữ cuối trang không bị mờ.
- Mở đặt đơn bằng hé xuống (clip-path), đều 1400–1600ms; đóng 900–1200ms. Nếu khung ở ngoài vùng nhìn thì đưa lên trước khi chạy để thấy hết cảnh mở. Không animate chiều cao từng khung hình; giữ nội dung lịch/form sau đóng mở. Giảm chuyển động vẫn bỏ hiệu ứng.
- Phòng và Combo trên trang chủ đều có lọc chi nhánh, tối đa 3 thẻ rồi Xem tất cả. Combo toàn hệ thống hiện ở mọi chi nhánh; combo chi nhánh/phòng xét danh sách áp dụng.
- Nền mặc định chuyển xanh than #172c30, lớp sáng nhẹ xanh ngọc; giữ ảnh nền riêng ở đầu trang.
- Quản trị bỏ công tắc hiển thị từng khối, chỉ giữ hai mục chính Phòng/Combo và chọn nội dung nổi bật. Footer chỉ sửa chữ, thông tin/đường dẫn; bỏ email và upload ảnh footer khỏi giao diện, giữ ảnh đã lưu. Bỏ hướng dẫn dưới các ô, giữ thông báo lưu/lỗi và nội dung xem trước.

Kiểm tra: build frontend đạt. Playwright ghi nhận 79 phần tử có timeline, 11 ảnh và 11 tiêu đề/đoạn văn. Mốc mở khoảng 567ms trên 1600ms còn clip 64,6%, sau kết thúc clip none/opacity 1. Lọc chi nhánh Combo, tối đa 3 thẻ; layout không tràn ngang ở 1440/768/390/360px. Quản trị không còn email, upload ảnh hay đoạn hướng dẫn trong footer; không tràn ở 1440/768/390px. Dữ liệu thử được chặn bằng route giả lập, không ghi DB thật.

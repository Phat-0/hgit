# Bộ chọn biểu đồ ngang, lịch riêng và kéo cột

- Bỏ nền màu của khung ngoài chứa hai biểu đồ; giữ màu hai tờ giấy bên trong.
- Bộ chọn đối tượng nhỏ lại 510px (giới hạn theo màn hình), tăng khoảng cách giữa chi nhánh và phòng; làm nổi tên chỉ số hơn tiêu đề nhóm.
- Nút × ẩn khi không hover, hiện khi trỏ vào ô hoặc dùng bàn phím; màn hình cảm ứng vẫn có nút dùng được.
- Kéo cột: dropEffect move trên vùng tài liệu, ảnh kéo trong suốt, cột gốc mờ 30%; đổi thứ tự giữ nguyên dữ liệu và cấu hình.
- Thiết lập giá trị mặc định Sử dụng lịch chung; ô lịch riêng chỉ có biểu tượng khi chưa chọn, chọn khoảng tự chuyển sang riêng. Bỏ nút Dùng lịch chung. Nhiều đoạn lịch hiện ngay ngoài ô, cùng tháng ghi tháng một lần, bỏ năm hiện tại.
- Đối tượng biểu đồ và ba hàng giá trị hiện ngang, không dropdown. Các ngày cùng tháng gom chung một cụm; ngày/tuần biểu đồ lấy từ đúng các nhóm của cột đã thiết lập.
- Chọn dữ liệu trong bảng tự mở biểu đồ cột và chọn đúng giá trị đó; chọn checkbox hàng dùng các cột hiện có. Giữ cách tính tổng/trung bình và lịch riêng của cột.
- Chưa thêm chức năng tạo nhiều hình tròn; có tài liệu điều kiện để người dùng xác nhận. Hình tròn hiện có không cộng mức trung bình/số dư hay chỉ số khác nghĩa thành tỷ trọng.
- Không đổi schema, không lưu cấu hình/kết quả thống kê vào DB.

## Xác minh

Playwright: × chỉ hiện khi hover; mặc định lịch chung; 2 đoạn lịch hiện ngoài ô (01–02/11 · 10–11/11); 4 ngày gom tháng; chọn ô Chi trên bảng tự hiện một cột 50.000; kéo cột nhận move và nguồn mờ .3; bộ chọn ngang không tràn tại 1440/1024/768/390px; nền ngoài trong suốt, hai giấy khác màu.

Build frontend, kiểm thử UI và kiểm thử định dạng khoảng ngày đạt. Tài liệu điều kiện biểu đồ tròn nằm cùng thư mục để xác nhận trước khi triển khai mở rộng.

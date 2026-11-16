# Nhóm giá trị, lịch nhiều khoảng và chọn hàng

- Thu nhỏ nút Chọn tháng còn 26px, căn theo dải tháng; nút + và Đóng nằm cạnh nhau ở chân lịch.
- Mỗi giá trị chỉ mở một lịch. Các khoảng đã chọn nằm trong lịch, bấm khoảng để sửa, × để xóa và + để bắt đầu chọn khoảng mới. Không tạo các ô lịch kéo dài bên ngoài.
- Danh sách thêm cột, giá trị trên bảng và chọn giá trị biểu đồ được nhóm theo Tổng / Trung bình ngày / Trung bình tuần. Chọn chỉ số từ nhóm nào sẽ tạo đúng cách tính của nhóm đó.
- Ô giá trị có màu theo nhóm; nhấp tên để chỉnh, chỉ còn × ở góc để xóa, bỏ bánh răng.
- Bấm hàng để chọn, bấm lại để bỏ chọn; Shift + bấm chọn đoạn từ hàng neo, hỗ trợ cả ô checkbox. Giữ kéo chọn nhiều hàng, Ctrl/Cmd + Shift để thêm đoạn, Alt + kéo tên để đổi thứ tự.
- Các mục biểu đồ thống kê nhóm theo cách tính, tiếp tục chia Tổng / Chi nhánh / Phòng, phòng theo chi nhánh. Danh sách chọn đối tượng biểu đồ cũng theo cấp.
- Thu gọn khung tên trong danh sách; tên dài có chú thích đầy đủ khi trỏ chuột.
- Không thay đổi schema hoặc ghi cấu hình/kết quả thống kê vào DB.

## Xác minh

- Playwright: bấm chọn/bỏ chọn, Shift chọn 3 hàng, kéo chọn không bôi chữ; lịch chứa 2 khoảng; + cùng hàng Đóng; nút tháng 26px.
- Playwright: tạo chỉ số trung bình ngày/tuần đúng cách tính, 3 nhóm ô và 3 nhóm biểu đồ, phòng lồng theo chi nhánh; khung nổi nằm trong màn hình tại 1440/1024/768/390px.
- Build frontend và bộ kiểm thử giao diện hiện có đạt; phép tính thống kê tiếp tục dùng engine đã kiểm tra.

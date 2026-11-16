# Bố cục đối tượng, chọn giá trị và kéo cột

- Màu nằm ở hai tờ giấy bên trong: figure cột xanh nhạt, figure tròn tím nhạt; SVG/khung cuộn trong suốt để màu phủ toàn vùng vẽ.
- Bộ chọn đối tượng chia hai cột: Chi nhánh trái, Phòng phải. Mở Phòng hiển thị mọi phòng, nhóm theo tên chi nhánh căn cùng mép; đúng 5 phòng/hàng. Thu khoảng cách ô phòng về 4px, không trải rộng dư thừa.
- Thay dấu + thêm cột bằng nút Giá trị. Mở ra ba hàng chỉ số ngang theo cách tính, không cần mở tiếp từng nhóm.
- Các giá trị đã chọn luôn ở ba hàng Tổng / Trung bình ngày / Trung bình tuần. Bấm để ẩn/hiện cột bảng, trạng thái phủ toàn ô; nhấp đúp, chuột phải hoặc Alt+Enter để sửa. Tiêu đề cột vẫn bấm sửa được.
- Kéo tiêu đề hoặc ô giá trị để đổi thứ tự cột; các cột con ngày/tuần đi cùng chỉ số. Alt+trái/phải hỗ trợ bàn phím. Cột ẩn vẫn giữ cấu hình, dữ liệu biểu đồ không bị xóa theo.
- Không ghi DB; trạng thái ẩn nằm trong cấu hình xuất file hiện có.

## Xác minh

Playwright với 2 chi nhánh và 14 phòng giả lập: hai mục nằm cạnh nhau, 5 phòng/hàng và tên chi nhánh thẳng hàng tại 1440/1024/768/390px. Kiểm tra ba hàng giá trị, bật/tắt cột, vùng bấm kín ô, kéo cột đầu xuống cuối và thứ tự ô cập nhật. Đo hai nền trong biểu đồ khác màu và kiểm tra ảnh chụp bố cục.

Build frontend, kiểm thử giao diện và kiểm thử tính toán thống kê đạt. Các kịch bản Playwright trước được cập nhật theo nút Giá trị và thao tác nhấp đúp để sửa.

# Thu chi và thống kê — 16/11/2026

- Báo cáo gồm hai tab Thu chi / Thống kê. Giữ cả hai tab trong phiên để chuyển qua lại không làm mất bảng đang dựng.
- Biểu đồ thu chi chỉ chọn một nhóm đối tượng (chi nhánh hoặc phòng), một chỉ số Thu hoặc Chi. Menu ☰ chứa %, đường chồng cột, màu và danh sách xuất. Biểu đồ tròn luôn so sánh Thu/Chi theo màu, không có danh sách chú giải bên dưới.
- Thống kê: hàng theo tổng hệ thống, chi nhánh hoặc phòng; chọn hàng hiển thị, kéo thả hoặc dùng ↑/↓. Cột có thể thêm/bớt; đầu cột hai tầng gồm chỉ số/cách tính/lịch và ngày/thứ/tuần cụ thể.
- Mỗi cột có lịch chung hoặc riêng, lọc nhiều thứ; chỉ tiêu đặt phòng có thêm lọc loại đặt và giờ nhận phòng (0–23h). Giới hạn 20 cột cấu hình, 500 cột con, 50.000 ô để tránh treo giao diện.
- Tổng hoặc TB/ngày, TB/tuần; giá đơn và thời gian có TB/lượt đặt. Ngày không có phát sinh vẫn nằm trong mẫu số TB/ngày. Tuần T2–CN, tuần lẻ tính một tuần. Mẫu số bằng 0 hiển thị “—”.
- Đặt/hủy theo ngày tạo đơn tại Việt Nam. Số đặt, giá và thời gian chỉ tính đơn đã xác nhận/nhận/trả; hủy tính đơn đã hủy. Thời gian là giờ lưu trú dự kiến, khung giờ là giờ nhận phòng dự kiến.
- Số dư toàn hệ thống: tiền tồn từng tháng + thu − chi từ đầu tháng. Số dư chi nhánh/phòng: lũy kế các khoản gán cho đối tượng, không phân bổ tiền tồn chung. TB số dư tính các mốc cuối ngày/tuần được chọn.
- API GET `/api/quan-tri/thu-chi/thong-ke` kiểm tra quyền báo cáo, kiểm tra ngày và giới hạn khoảng tổng 367 ngày. Giao dịch REPEATABLE READ READ ONLY; tổng hợp từ các bảng hiện có, không lưu kết quả/cấu hình và không trả thông tin cá nhân khách. Trên 50.000 nhóm dữ liệu sẽ yêu cầu thu hẹp lịch, không trả kết quả bị cắt âm thầm.
- Xuất Excel/CSV/JSON, biểu đồ xuất SVG/CSV/Excel. Xuất bảng đánh dấu bản hiện tại đã xuất; thay đổi tiếp sẽ cảnh báo lại. Cảnh báo khi đóng/tải lại trình duyệt và trước điều hướng/đăng xuất trong quản trị. Nội dung cảnh báo đóng trình duyệt do trình duyệt quyết định và cần người dùng đã tương tác với trang.
- Không có migration hoặc thay đổi schema DB.

## Kiểm tra

- Web: `npm --prefix trang-web run build`.
- Backend: `npm --prefix may-chu run build`; 107 kiểm thử `npm --prefix may-chu test` đạt.
- `node kiem-thu/thong-ke-thu-chi.test.mjs`: tổng, TB, nhiều thứ, lịch riêng, tuần lẻ/năm nhuận, số dư và lọc loại/giờ, mẫu số 0.
- `node kiem-thu/trang-khach-chat.integration.mjs`: thêm kiểm tra API thống kê với PostgreSQL PGlite, quyền, tổng nguồn và không ghi DB.
- `node kiem-thu/chay-chat-ui.mjs`: cập nhật kiểm tra biểu đồ và tab thống kê mới; toàn bộ bộ kiểm thử UI đạt.
- Trình duyệt: chọn độc lập chi nhánh/phòng, header hai tầng, lịch riêng, kéo hàng, biểu đồ; tải và kiểm tra CSV/Excel/JSON; cảnh báo chưa lưu; bố cục 1280/768/390px.

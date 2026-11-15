# Thống kê thu chi — cập nhật 16/11/2026

- Sổ thu chi giữ nguyên ở khối trên. Khối thứ hai chuyển giữa Thu chi và Thống kê.
- Bảng thống kê chọn nhiều đối tượng đồng thời: tổng hệ thống, từng chi nhánh, từng phòng. Danh sách phòng được xếp dưới từng chi nhánh dạng xổ xuống. Mỗi hàng có checkbox, chọn tất cả; chọn vào ô cũng đổi chọn hàng. Giữ kéo thả, bỏ nút ↑/↓; nút kéo hỗ trợ Alt + lên/xuống để đổi thứ tự bằng bàn phím.
- Thêm cột bằng biểu tượng ＋. Thiết lập cột không có các tiêu đề phía trên ô chọn; thứ tự: chỉ số → loại đặt (chỉ tiêu đặt phòng) → cách tính → chia cột. Cách tính gồm Tổng, Trung bình ngày, Trung bình tuần. Chia cột gồm Chung, Theo ngày, Theo tuần.
- Chỉ Theo ngày hiện checkbox các thứ. Theo tuần tự hiện lịch riêng, ban đầu trống; cột chờ chọn lịch không làm trống các cột khác và không dùng ngầm lịch chung. Lịch chung và các lịch riêng đã chọn có khoảng bao tối đa 367 ngày.
- Thời gian lưu trú là trung bình giờ mỗi lượt đặt hợp lệ của một loại đã chọn. Tổng = tổng giờ / số lượt; Trung bình ngày/tuần = trung bình các mức trung bình của ngày/tuần có đơn. Không cộng giờ rồi chia ngày trống. Chưa có lượt hợp lệ hiển thị “—”. Giá đơn vẫn là tổng giá trị hoặc trung bình theo ngày/tuần theo cách tính đã chọn.
- Bỏ chỉ tiêu Khung giờ riêng và bộ lọc giờ nhận phòng. Với loại Theo giờ, checkbox “Lượt theo khung giờ” thêm thông tin nhóm giờ bắt đầu có nhiều lượt đặt nhất. Giờ đầu và cuối là trung bình của nhóm đó; giờ qua ngày có nhãn +N ngày. Nếu số lượt bằng nhau chọn giờ sớm hơn. Đây là thống kê theo giờ bắt đầu đặt, không phải công suất phòng đang sử dụng.
- Bộ tạo biểu đồ nằm dưới bảng; chọn đối tượng và một/nhiều giá trị. Mỗi giá trị có biểu đồ riêng để không gộp đơn vị khác nhau vào một trục. Tối đa 8 giá trị hiển thị cùng lúc. Thu/chi có menu %, thêm đường và xuất; các phạm vi tổng/chi nhánh/phòng có thể chồng nhau nên không cộng hàng thành một tổng mới.
- Khi đối tượng biểu đồ bao gồm nhau (tổng và chi nhánh/phòng, hoặc chi nhánh và phòng của nó), chỉ so sánh bằng cột, không vẽ tỷ trọng hoặc cộng thành tổng mới. Dropdown phòng/giá trị được kiểm tra không lệch khỏi màn hình điện thoại.
- Xuất bảng Excel/CSV/JSON kèm lịch, loại đặt và khung giờ bổ sung. Thay đổi sau xuất sẽ cảnh báo chưa lưu lại. Không lưu cấu hình/kết quả trong DB, không có migration.
- API chỉ đọc, kiểm tra quyền báo cáo và khoảng ngày; bổ sung tổng phút bắt đầu của các lượt hợp lệ để tính giờ trung bình chính xác đến phút. Các số liệu đơn dùng ngày tạo đơn theo Việt Nam, trạng thái hợp lệ = đã xác nhận/nhận/trả; số hủy tính đơn đã hủy. Thời gian là khoảng lưu trú dự kiến.

## Kiểm tra

- Build web và NestJS; 107 unit tests backend.
- `node kiem-thu/thong-ke-thu-chi.test.mjs`: tổng/TB ngày/tuần, trung bình lưu trú có trọng số và theo ngày/tuần, lọc loại, khung giờ nhiều lượt, thời gian qua đêm, chọn giờ khi hòa, lịch tuần ban đầu trống, năm nhuận và số dư.
- `node kiem-thu/trang-khach-chat.integration.mjs`: PostgreSQL PGlite kiểm tra quyền, tổng thu/chi/đặt/hủy, tổng phút giờ bắt đầu và không ghi dữ liệu.
- `node kiem-thu/chay-chat-ui.mjs`: đối tượng hỗn hợp, phòng nhóm theo chi nhánh, chọn hàng, không có nút mũi tên, bộ thêm cột dạng icon, thiết lập gọn, lịch tuần trống mở được, bộ chọn biểu đồ dưới bảng, cảnh báo chưa lưu.

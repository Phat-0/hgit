# Thiết lập biểu đồ trên bảng và 10 dòng mẫu

- Bỏ các bộ chọn, nút thêm và quy tắc nằm dưới bảng thống kê; giữ vùng hiển thị biểu đồ.
- Đặt Giá trị biểu đồ trước lịch trên hàng điều khiển. Khung này nhận các hàng đã chọn, cho chọn đối tượng, giá trị/cột con tháng/ngày, kiểu cột hoặc tròn và Áp dụng.
- Thêm biểu đồ cột/tròn đều mở cùng bộ chọn trước khi tạo. Các khung đã tạo giữ cấu hình riêng, không thay đổi khi chọn biểu đồ khác.
- Đổi kiểu biểu đồ trong khung chọn không tự đóng khung; bấm ngoài hoặc Áp dụng/Tạo mới đóng.
- Thêm nút 10 dòng mẫu T10–T11: 10 phòng thuộc hai chi nhánh, mỗi phòng có số liệu tháng 10 và 11 năm hiện tại. Bảng mẫu mặc định ba chỉ số Thu/Chi/Đặt chia theo tháng.
- Dữ liệu mẫu chỉ tính tại giao diện, có nhãn rõ và nút Dữ liệu thật để thoát; biểu đồ mẫu không gọi API thật kể cả khi đổi lịch ra ngoài kỳ mẫu. Không ghi DB.
- File thống kê mẫu dùng tiền tố mau-, JSON có cờ du_lieu_mau. Trở lại dữ liệu thật xóa các biểu đồ/lựa chọn mẫu và lấy dữ liệu thật theo lịch mặc định.

## Xác minh

- Kiểm thử dữ liệu: đúng 10 phòng, 10 bản ghi mỗi tháng, tổng thu tháng 10 = 6.150.000 và tháng 11 = 6.650.000; ID mẫu riêng.
- Playwright: không còn bộ chọn dưới bảng, vị trí khung chọn trước lịch, nhận hàng đã chọn, áp dụng kiểu tròn, thêm cột/tròn chỉ tạo sau khi chọn; 10 dòng mẫu có hai tháng; popup trong màn hình ở 1440/1024/768/390px; đổi lịch mẫu không gọi API, trở về dữ liệu thật đúng.
- Build frontend và kiểm thử UI hiện có đạt.

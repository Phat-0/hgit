# Trang chọn biểu đồ và trung bình tháng

- Thêm Trung bình tháng vào cách tính và nhóm giá trị (bảng/chọn giá trị/biểu đồ/xuất file).
- Khi chọn một cách tính trung bình, bỏ Theo ngày khỏi Chia cột; nếu cột đang theo ngày thì chuyển về Chung. Engine cũng chuẩn hóa cấu hình trung bình + ngày để không chia sai.
- Thu/chi/lượt/giá đơn TB tháng = tổng / số tháng có trong tập ngày được chọn, kể cả tháng đã chọn không phát sinh. Không tự thêm tháng ở khoảng trống giữa các khoảng rời nhau.
- Thời gian TB tháng là trung bình các mức giờ/lượt của tháng có đơn; số dư TB tháng là trung bình số dư tại ngày cuối được chọn của từng tháng. Giữ nguyên quy tắc các cách tính trước.
- Chuyển hai nút tạo biểu đồ xuống ngay dưới bảng. Không tự tạo khung biểu đồ khi chỉ chọn hàng; các hàng và ô được dùng làm lựa chọn ban đầu cho trang tạo. Nút Giá trị biểu đồ ở trên vẫn cho thiết lập biểu đồ chính.
- Khi bấm tạo, mở trang chọn dạng dialog lớn, khóa cuộn nền, giữ tiêu điểm, Escape/Thoát/× để đóng. Bố cục Chi nhánh–Phòng theo cấp và 5 phòng/hàng giống bộ chọn bên ngoài.
- Các hàng đang chọn và các giá trị tương ứng được điền sẵn. Tạo mới có thể chọn thêm các đối tượng hiện có trong nguồn thống kê.
- Ngày hiển thị thành khoảng gộp; tập rời quá dài hiển thị khoảng bao và số khoảng, có chú thích đầy đủ. Biểu tượng lịch nằm ngay cạnh từng giá trị để chọn lại, hỗ trợ nhiều khoảng/tháng.
- Lịch đổi trong trang chọn chỉ áp dụng biểu đồ, không đổi cột bảng. Biểu đồ chính và thêm mới dùng cùng cơ chế tính/tải lịch độc lập.
- Không ghi cấu hình hay kết quả vào DB.

## Xác minh

- Kiểm thử TB tháng: tiền, tháng trống, số lượt, TB lưu trú theo tháng, số dư tại mốc cuối tháng; không chia ngày cho cấu hình trung bình.
- Playwright: 325.000 tiền thu TB hai tháng của P101 mẫu; bỏ Theo ngày khi chuyển TB; nút nằm dưới bảng; điền sẵn hai hàng đã chọn; ngày không liệt kê 61 ô; lịch cạnh giá trị đổi riêng không làm đổi bảng; tạo cột và tròn; dialog và đóng bằng Escape ở 1440/1024/768/390px.
- Đo ô chọn và biểu tượng lịch cùng hàng (ô cao 38px), kiểm tra ảnh chụp giao diện.
- Build frontend và kiểm thử UI hiện có đạt.

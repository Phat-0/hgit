# Nhiều tháng, chia theo tháng và nhiều biểu đồ

- Lịch chung thống kê, lịch riêng của giá trị và lịch biểu đồ nhận nhiều tháng rời nhau. Chọn tháng trên dải, bấm Chọn N tháng để áp dụng; ngày của các tháng ở giữa không được tự thêm.
- Thêm Theo tháng vào cách chia cột. Tổng/trung bình giữ cách tính đang chọn, nhóm tháng theo lịch chung hoặc riêng.
- Lịch chung là mặc định ẩn trong thiết lập giá trị; chỉ giữ ô lịch riêng. Xóa hết lịch riêng trở lại lịch chung.
- Bỏ mục thứ tự kéo thả/thứ tự bảng khỏi các nút sắp xếp. Bấm lại nút đang chọn hủy sắp xếp, trở về thứ tự gốc/đã kéo. Giữ Theo ngày cho biểu đồ thu chi.
- Bỏ dòng Đã chọn … hàng dưới bảng sổ thu chi và phần thiết lập biểu đồ thống kê. Không bỏ lựa chọn dữ liệu.
- Giữ biểu đồ cột chính theo các giá trị/bộ lọc đã chọn. Biểu đồ tròn chính có chỉ số, lịch riêng và nhóm ngày/tuần/tháng.
- Hai nút thêm biểu đồ cột và tròn tạo khung độc lập, lấy dữ liệu đang chọn lúc tạo. Mỗi khung có lịch, cách chia riêng, xuất file, ẩn/hiện từng phần và nút xóa riêng; xóa một khung không ảnh hưởng các khung khác.
- Biểu đồ cột thêm mặc định theo thiết lập cột; có thể chuyển ngày/tuần/tháng. Biểu đồ tròn chia theo thời gian cho một chỉ số tổng hợp hợp lệ, không gộp trung bình/số dư hoặc phạm vi trùng thành tỷ trọng.
- Lịch riêng ngoài dữ liệu bảng tải qua GET thống kê riêng. Lịch bảng và biểu đồ khác giữ nguyên. Cấu hình khung được đưa vào JSON xuất hiện có, không ghi DB.

## Xác minh

- Kiểm thử tính toán: tháng 1 và 3 bỏ tháng 2, bảo toàn tổng qua ngày/tuần/tháng; cột giữ đúng nhóm dữ liệu đã chọn; gom ngày trùng và nhận biết phạm vi chồng.
- Playwright: nhiều tháng rời, cột Theo tháng, lịch chung ẩn, bấm lại hủy sắp xếp, thêm được cột/tròn, đổi lịch và xóa một biểu đồ không ảnh hưởng lịch bảng/biểu đồ còn lại; bố cục tại 1440/1024/768/390px.
- Build frontend, kiểm thử UI hiện có và kiểm thử tính toán thống kê đạt. Đã kiểm tra ảnh chụp bố cục.

# Gom cột theo phòng và thu gọn ô ẩn/hiện ngày

- Biểu đồ cột gom theo đối tượng/phòng, bên trong theo kỳ; các giá trị cùng phòng/cùng kỳ đứng cạnh nhau thay vì trải hết giá trị thứ nhất qua mọi phòng rồi mới đến giá trị thứ hai.
- Màu gắn với chỉ số/cách tính được chọn, nhất quán qua phòng và thời gian; có chú thích màu ngay trên biểu đồ. Bấm chú thích để ẩn/hiện cả giá trị.
- Giữ màu và thứ tự phòng khi ẩn một giá trị; sắp xếp áp dụng lên nhóm phòng, không tách cặp giá trị ra.
- Nhãn số của các cột liền nhau so le để tránh đè nhau khi hai giá trị bằng/gần nhau.
- Ô ẩn/hiện gom theo phòng + giá trị, bao gồm mọi ngày đã chọn; mặc định không bung danh sách ngày. Mở mũi tên khi cần chọn riêng, ngày chia theo tháng, 5 nút/hàng, khung chọn có chiều cao giới hạn.
- Biểu đồ tròn theo ngày cũng thu các ngày vào một nhóm điều khiển; giữ màu từng phần khi mở lựa chọn riêng.
- Bỏ các tiêu đề nhóm phụ Tổng/Phòng/Chi nhánh và tiêu đề Dữ liệu đã chọn lặp lại; giữ tiêu đề khung hiện có, nhãn đơn vị và chú thích cần thiết.
- CSV/Excel giữ số liệu đang hiện; SVG có chú thích màu kèm các cột. Không đổi phép tính hay ghi DB.

## Xác minh

- Kiểm thử bố trí: hai phòng × hai giá trị × hai kỳ = 8 cột; cặp cùng kỳ cách nhau 32px, nhãn phòng đúng nhóm; 61 ngày gộp một điều khiển; không sửa dữ liệu đầu vào.
- Playwright: 2 màu giá trị ổn định, ẩn/hiện một giá trị qua cả hai phòng, 61 ngày của 2 phòng/2 giá trị chỉ còn 4 ô chính, chọn ẩn riêng ngày khi mở, không thêm tiêu đề phụ, không tràn và khung chọn gọn tại 1440/1024/768/390px.
- Kiểm tra tải SVG có chú thích Thu/Chi; ẩn riêng nhóm P101–Thu vẫn giữ thứ tự P101 rồi P102. Đã xem ảnh chụp cột ghép.
- Build frontend, kiểm thử UI và kiểm thử tính toán biểu đồ hiện có đạt.

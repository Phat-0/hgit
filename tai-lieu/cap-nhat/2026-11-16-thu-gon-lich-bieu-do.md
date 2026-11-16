# Thu gọn lịch, đối tượng, thống kê và biểu đồ

- Bỏ nhãn Lịch chung; chọn tháng bằng dải cuộn ngang 12 tháng, năm phía trên, tự cuộn đến tháng đang chọn.
- Tổng chi nhánh và tổng phòng nằm trong đúng nhóm; danh sách phòng lồng theo chi nhánh, thụt cấp; chỉ hiển thị mã phòng. API đọc thêm ma_phong có sẵn, không thay đổi schema.
- Thu gọn ô đối tượng, thiết lập, lịch và nhãn màu; giảm chiều rộng danh sách nổi và giữ trong màn hình.
- Mỗi giá trị thống kê có lịch riêng cùng kiểu lịch chính, thêm/xóa nhiều khoảng; hợp nhất ngày trùng, không tính ngày ở khoảng trống. Đổi kiểu chia vẫn giữ lịch riêng đang có.
- Bảng chỉ hiện hàng tiêu đề thứ hai khi có ngày/tuần; ô chung hoặc chưa chọn lịch gộp theo chiều dọc. Bỏ biểu tượng ở tên đối tượng.
- Kéo qua dữ liệu để chọn liên tiếp hàng, Ctrl/Cmd giữ lựa chọn trước; không bôi ký tự. Alt + kéo tên để đổi thứ tự.
- Menu bảng và biểu đồ có thứ tự tên A–Z/Z–A, giá trị nhỏ–lớn/lớn–nhỏ; bảng lấy cột đầu tiên làm khóa giá trị.
- Biểu đồ thu chi có Thu và chi / Chỉ thu / Chỉ chi; màu thu xanh nhạt, chi tím nhạt; lịch tròn nằm cạnh lịch cột và tải dữ liệu độc lập.
- Giá trị biểu đồ thống kê nhóm theo tên, mở danh sách ngày 5 ô/hàng, có lịch giới hạn khoảng; gom thành một cột và một tròn. Nhãn dùng màu của điểm dữ liệu, giữ màu khi sắp xếp/ẩn.
- Trường hợp các giá trị khác đơn vị, âm hoặc phạm vi chồng nhau giữ thông báo ở vị trí hình tròn, không cộng tỷ trọng sai.
- Tất cả cấu hình/kết quả tiếp tục tính tại giao diện, không ghi DB; cảnh báo rời trang chưa xuất file được giữ.

## Xác minh

- Playwright: kéo chọn 3 hàng không chọn chữ, 2 khoảng riêng, ẩn/hiện hàng tiêu đề, danh sách 5 cột, chỉ 1 cặp biểu đồ; khung nổi tại 1440/1024/768/390px.
- Playwright: hai lịch thu chi độc lập, phòng chỉ P101, hai chuỗi thu/chi cùng biểu đồ, màu nhạt và sắp xếp giảm dần.
- Bộ kiểm thử giao diện hiện có; tính toán thống kê (thêm trường hợp nhiều khoảng trùng/ngắt quãng và tổng phòng); 10 kiểm thử đầu vào backend; build frontend đều đạt.

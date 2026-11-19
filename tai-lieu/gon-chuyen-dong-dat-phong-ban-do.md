# Gọn chuyển động, đặt phòng và bản đồ

Theo yêu cầu mới, trang khách luôn bật hiệu ứng, bỏ lựa chọn trên header và không dùng lựa chọn off/system đã lưu để chặn chuyển động. Bộ reveal chỉ còn khoảng 15 khối lớn thay vì ~100 phần tử ảnh/chữ. Chạy một lần khi vào vùng nhìn, không lặp khi cuộn qua lại; ba kiểu rise/slide/soft cùng thời gian 1550ms và nhịp trễ nhất quán. Giữ parallax nhẹ, tạm dừng tính parallax lúc khung đặt đơn đang bung/khép.

Khung tìm phòng mở/đóng bằng chiều cao thực của một container, không chỉ clip nội dung sau khi layout đã nhảy. Các phần bên dưới dịch chuyển cùng animation; dọn style/overflow khi kết thúc, xử lý thao tác đảo chiều giữa chừng. Chỉ một vùng height thay đổi theo frame vì đây là chuyển động đẩy bố cục được yêu cầu.

Bản đồ mở rộng không còn header/tiêu đề lớn, nút đóng ở góc. Ba nhóm: checkbox tất cả/từng chi nhánh; khoảng cách và yêu cầu cho phép vị trí nếu chưa có; nút dẫn đường mở danh sách chọn đích. Mỗi lần vẽ tuyến chỉ dùng chi nhánh đích đã chọn. Khoảng cách đường thẳng có dấu ≈ nếu dịch vụ đường bộ không trả dữ liệu.

Nút lightbox chuyển sang các ô grid của overlay toàn màn hình, tách khỏi figure đang animate; nút đóng cố định góc trên. Áp dụng cả ảnh trong quản trị dùng chung component.

Form đặt phòng: desktop rộng tối đa 940px, bảng tổng hợp 260px, input 34px; bỏ cuộn riêng trong fields/tổng hợp/combo. Di động có thể cuộn toàn hộp khi nội dung dài, không dùng hai thanh cuộn lồng nhau. Ngày/đêm dùng đúng wheel đang dùng cho giờ, tên Check-in sớm và Check-out muộn, 0–12 giờ theo mốc 30 phút.

Giá dự kiến giữ số tiền trong lúc lấy báo giá, không thay bằng “Đang tính giá”. Khi kéo giờ, cập nhật ước tính theo đơn giá phụ thu hiện biết; API vẫn tính lại theo lịch giá/combo/voucher. Nút tạo đơn vẫn bị chặn trong khi quote chưa xác nhận khớp yêu cầu; không tin giá client.

## Kiểm tra

Build frontend đạt. Playwright `gon-dat-phong-ban-do.playwright.mjs`:

- 15 khối reveal, luôn bật kể cả trình duyệt báo reduce; bỏ menu hiệu ứng.
- Khối dưới khi mở: top 1318.56 → giữa 1398.06 → cuối 1504.56; khi đóng giữa 1440.56 → cuối 1318.56. Không nhảy thẳng trước/sau cảnh mở.
- Ba nút lightbox nằm trong màn hình, hai nút trước/sau ở hai mép.
- Thanh phụ thu đổi giá ngay 720.000 → 770.000, không hiện dòng đang tính.
- Form desktop cao khoảng 584px; không cuộn nội bộ. Không tràn ngang ở 1440/1024/768/390px. Trên di động, nội dung dài cuộn cả hộp ở lớp ngoài.
- Bản đồ không header; chọn/bỏ tất cả; chưa cho vị trí không hiện khoảng cách; cấp vị trí giả lập hiện đủ 2 chi nhánh; dẫn đường mở chọn đích và link ứng dụng bản đồ.

Dữ liệu giao diện/API được route giả lập, vị trí kiểm thử là tọa độ giả, không tạo đơn/khách thật hoặc thay đổi DB.

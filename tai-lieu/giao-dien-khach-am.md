# Giao diện khách và chat

Giữ bố cục Trang chủ hiện có và nội dung quản lý từ CMS. Dùng tông nâu ấm, kem, vàng theo ảnh tham khảo; ảnh hiển thị lấy từ dữ liệu phòng hoặc ảnh Trang chủ đã cấu hình. Không tạo ảnh phòng, đánh giá hay danh tính nhân viên giả.

Chat khách không có sidebar, header có avatar HomeStay, tìm tin nhắn, xem ảnh, xem tệp và nút đóng. Đã bỏ khối “Phòng cho chuyến đi của bạn” theo yêu cầu mới. Kết quả phòng vẫn ở trang đặt phòng bên ngoài chat. Hộp thư quản trị giữ danh sách hội thoại và các chức năng hiện có. Khi mở chat ẩn bong bóng nổi để tránh che tin nhắn.

Nhập hai ngày rõ ràng theo `DD/MM` hoặc `DD/MM/YYYY`, ví dụ `Nhận 20/11/2026 trả 22/11/2026, 2 người`, tự cập nhật lịch xem phòng bên ngoài chat và điền số khách vào biểu mẫu. Ngày thứ hai là ngày trả phòng, được chuyển về quy ước ngày cuối lưu trú của lịch hiện tại trước khi gọi API. Không tạo đơn hoặc gửi tin nhắn tự động. Đặt theo giờ dùng bộ chọn ngày/giờ có sẵn; không đoán những câu mơ hồ như “cuối tuần”. Giá và phòng trống luôn do API hiện tại trả về.

Hiệu ứng mở chat và ảnh hover nhẹ, có hỗ trợ giảm chuyển động. Ảnh chưa cấu hình hiển thị thông báo rõ ràng. Không thay đổi schema hoặc dữ liệu DB.

## Unslop

Unslop là skill hướng dẫn thiết kế cho Codex, không phải npm package hay dịch vụ của ứng dụng. Đã cài skill cá nhân kèm tài liệu, scripts và ảnh tham khảo. Với Codex trên máy khác, cài bằng `$skill-installer install https://github.com/heydamir/unslop/tree/main/skills/unslop`, sau đó gọi `$unslop` kèm yêu cầu và ảnh tham khảo.

Nguồn: [unslop](https://github.com/heydamir/unslop), Damir Sokolovsky [@heydamir](https://x.com/heydamir), giấy phép [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), phiên bản nguồn `620163eedb3529d9cd23a3994ed8d287d06f760d`. Phần giao diện này tham khảo quy trình giảm trang trí AI; bố cục, màu nâu/vàng và chuyển động theo yêu cầu người dùng.

## Kiểm tra

`npm --prefix trang-web run build`, `node kiem-thu/chay-chat-ui.mjs`, `node --experimental-strip-types kiem-thu/lich-dat-tu-chat.mjs`.

Playwright qua kết nối trình duyệt: 12 trang quản trị × 4 kích thước 1440/1024/768/390; 6 biểu mẫu tạo mới trên điện thoại; đăng nhập ở desktop/điện thoại; menu điều hướng, lịch, thư viện ảnh, lightbox và công cụ chat khách. Chi tiết ở `ra-soat-giao-dien-unslop.md`. Dùng API giả lập trong tab riêng, không tạo đơn/tin nhắn thật.

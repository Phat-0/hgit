# Giao diện khách và chat

Giữ bố cục Trang chủ hiện có và nội dung quản lý từ CMS. Dùng tông nâu ấm, kem, vàng theo ảnh tham khảo; ảnh hiển thị lấy từ dữ liệu phòng hoặc ảnh Trang chủ đã cấu hình. Không tạo ảnh phòng, đánh giá hay danh tính nhân viên giả.

Chat khách không có sidebar, header chỉ có avatar HomeStay và nút đóng. Hộp thư quản trị giữ nguyên. Thẻ phòng trong chat theo lịch đang chọn, có ảnh, tên, loại phòng, sức chứa, diện tích và giá cho cả khoảng đặt; bấm để mở biểu mẫu đặt phòng. Khi mở chat ẩn bong bóng nổi để tránh che tin nhắn.

Nhập hai ngày rõ ràng theo `DD/MM` hoặc `DD/MM/YYYY`, ví dụ `Nhận 20/11/2026 trả 22/11/2026, 2 người`, tự cập nhật lịch xem phòng và lọc sức chứa. Ngày thứ hai là ngày trả phòng, được chuyển về quy ước ngày cuối lưu trú của lịch hiện tại trước khi gọi API. Không tạo đơn hoặc gửi tin nhắn tự động. Đặt theo giờ dùng bộ chọn ngày/giờ có sẵn; không đoán những câu mơ hồ như “cuối tuần”. Giá và phòng trống luôn do API hiện tại trả về.

Hiệu ứng mở chat và ảnh hover nhẹ, có hỗ trợ giảm chuyển động. Ảnh chưa cấu hình hiển thị thông báo rõ ràng. Không thay đổi schema hoặc dữ liệu DB.

## Unslop

Unslop là skill hướng dẫn thiết kế cho Codex, không phải npm package hay dịch vụ của ứng dụng. Đã cài skill cá nhân kèm tài liệu, scripts và ảnh tham khảo. Với Codex trên máy khác, cài bằng `$skill-installer install https://github.com/heydamir/unslop/tree/main/skills/unslop`, sau đó gọi `$unslop` kèm yêu cầu và ảnh tham khảo.

Nguồn: [unslop](https://github.com/heydamir/unslop), Damir Sokolovsky [@heydamir](https://x.com/heydamir), giấy phép [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), phiên bản nguồn `620163eedb3529d9cd23a3994ed8d287d06f760d`. Phần giao diện này tham khảo quy trình giảm trang trí AI; bố cục, màu nâu/vàng và chuyển động theo yêu cầu người dùng.

## Kiểm tra

`npm --prefix trang-web run build`, `node kiem-thu/chay-chat-ui.mjs`, `node --experimental-strip-types kiem-thu/lich-dat-tu-chat.mjs`.

Playwright qua kết nối trình duyệt: màn hình 1440×1000 và 390×844; xác nhận không sidebar khách, header avatar, ảnh và thông tin phòng, ngày trả phòng gửi API đúng 22/11 thay vì dư một ngày, chọn thẻ mở biểu mẫu và đóng chat, không tràn ngang, ô nhập vẫn thấy, không lỗi JavaScript. Kiểm tra này dùng API giả lập trong tab riêng, không tạo đơn/tin nhắn thật.

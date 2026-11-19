# Nền hero tĩnh và căn nút ảnh

Nền hero không còn cập nhật zoom/translate theo cuộn. Pseudo-element dùng inset 0, kích thước cover cố định theo section; giữ tương tác chuột của gallery và parallax ảnh phòng riêng. Nền dưới thêm hai vùng ánh vàng rất nhẹ và một vệt sáng chéo tĩnh, không thêm phần tử chạy animation.

Reveal khối tăng lên 2100ms. Đã sửa độ ưu tiên selector để thời gian này thực sự áp dụng, không bị rule 1100ms cũ ghi đè. Khung đặt phòng mở/đóng nhanh hơn khoảng 20%, cấu hình thông thường 1600ms thành 1280ms; tiếp tục đẩy bố cục bên dưới đồng thời.

Lightbox được gọn lại CSS dùng chung: nút đóng riêng ở góc trên; trước/sau neo vào stage ảnh và căn giữa theo chiều cao ảnh, không theo figure gồm chú thích. Chỉ ảnh chạy hiệu ứng chuyển, nút không dịch theo chuyển cảnh. CSS cũ chồng lấn được thay bằng một bộ quy tắc thống nhất, gồm điện thoại.

Kiểm thử Playwright `nen-tinh-nut-anh.playwright.mjs`:

- Trước/sau cuộn: section cao 950px; nền transform none; background-size và background-position giống nhau.
- Reveal 2.1s; animation bung đặt đơn 1280ms.
- Tâm nút trước/sau lệch tâm ảnh 0px, không chồng nhau, đều trong viewport ở 1440/1024/768/390px.
- Next đổi ảnh, đóng lightbox hoạt động.

Build frontend đạt. Kiểm thử dùng dữ liệu route giả lập, không thay đổi DB.

# Trình duyệt báo giảm chuyển động

Kiểm tra bản web đang chạy tại localhost:5173, không ép media thành no-preference, ghi nhận prefers-reduced-motion: reduce = true và 0 animation chạy. Các bài kiểm tra chuyển động trước đã ép no-preference nên không phản ánh trạng thái này. CSS/JS mới đã tải đúng từ D:/DoAnTotNghiep; lỗi không phải thiếu file CSS.

Thêm lựa chọn ngay thanh điều hướng: Theo thiết bị / Bật / Tắt. Mặc định theo thiết bị, giữ tôn trọng trợ năng. Người dùng chủ động bật thì website lưu lựa chọn trên trình duyệt (homestay_motion); không đổi thiết lập hệ điều hành, không ảnh hưởng khách khác.

Đồng bộ hàm giamChuyenDong cho reveal, parallax, gallery, đặt đơn, bộ đếm, review và lightbox. Các media query giảm chuyển động của giao diện khách/chat/lightbox chỉ áp dụng khi chưa chọn bật riêng, thay vì để opacity/transform !important cũ triệt tiêu animation. Các quy tắc riêng của giao diện quản trị vẫn giữ nguyên nếu không liên quan giao diện khách.

Kiểm thử trong context sạch, thiết bị vẫn báo reduce=true:

- Theo thiết bị: 0 animation chạy.
- Chọn bật: ảnh opacity khoảng 0,47, translateY khoảng 14,9px, animation đang chạy; không chỉ thêm class.
- Hero cuộn: matrix scale 1.04/translateY 0 → scale 1.05389/translateY 14.65px.
- Tải lại trang vẫn chọn full.
- Chọn tắt: 0 animation chạy.

Build frontend đạt. Kiểm thử này dùng GET nội dung thật và lưu lựa chọn cục bộ trong context tạm, không sửa DB hay thiết lập Windows.

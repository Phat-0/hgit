# Rà giao diện bằng Playwright ngày 13/11/2026

Kiểm tra website localhost:5173 bằng MCP Playwright trong context riêng, API trả dữ liệu mẫu. Không đăng nhập bằng thông tin của người dùng, không gửi tin hay ghi database. CSS sửa được đưa vào trang kiểm thử; cùng nội dung được lưu trong mã nguồn.

Đã duyệt 12 mục quản trị: Tổng quan, Lịch, Chi nhánh, Phòng, Loại phòng, Combo, Đơn đặt phòng, Trang chủ, Nhân viên, Tin nhắn, Cài đặt, Báo cáo thống kê. Kiểm tra chiều rộng trang và chữ bị cắt trong button/label/heading/header bảng trên desktop 1440px và mobile 390px. Đã mở/đóng form tạo mới của chi nhánh, phòng, loại phòng, combo, đơn đặt phòng, nhân viên trên desktop.

Lỗi đã tái hiện và sửa:
- CSS input chung làm hiện hai input file có thuộc tính hidden: chiếm hàng nhập chat.
- Bong bóng chat đè khu vực gửi trong hộp thư quản trị.
- Sidebar di động bị đẩy khỏi màn hình nhưng vẫn giữ chỗ trong flex, ép workspace còn 110px.
- Stacking context của workspace/content giữ form tạo đơn dưới header; nút đóng bị chặn click.
- Aside của chat bị áp margin/padding/border từ aside chung.

Đo lại chat tại 390/768/1024/1440px: sidebar hiện, input và nút gửi trọn viewport; file input ẩn; không tràn ngang toàn trang. Tên dài trong danh sách hội thoại được rút gọn có chủ ý; tên đầy đủ ở header hội thoại. Nút ảnh/tệp dùng SVG, title khi hover, aria-label cho trình đọc màn hình.

Kiểm tra bổ sung: build frontend, test:ui (sidebar quản trị, khách không sidebar, file input hidden, icon/title, nút gửi, bong bóng không hiện trong inbox). Hàm Playwright kiểm tra hình học nằm tại kiem-thu/chat-bo-cuc.playwright.mjs.

Giới hạn: đây là kiểm tra bố cục với dữ liệu mẫu, không xác nhận toàn bộ dữ liệu thật hay tất cả trạng thái sửa/xóa/tải tệp. Danh sách rỗng không đại diện mọi giá trị dài trong dữ liệu sản xuất. Cài đặt/Báo cáo vẫn giữ phạm vi tính năng hiện có.

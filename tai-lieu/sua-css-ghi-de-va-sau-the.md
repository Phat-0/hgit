# Sửa CSS ghi đè và sáu thẻ

CSS gallery cũ và selector native-timeline có độ ưu tiên cao hơn selector entrance, khiến khai báo mới không thực sự chạy trên các phần tử nhìn thấy. Đã thêm selector rõ phạm vi, đủ ưu tiên cho entrance trên ảnh/chữ; không chỉ kiểm tra thuộc tính data-*.

Trang chủ chạy CSS entrance ngay khi vào viewport: chữ/khối 1100ms, ảnh 1500ms với dịch chuyển và phóng nhẹ. IntersectionObserver chỉ kích hoạt thuộc tính, không cập nhật vị trí mỗi frame. Nội dung xuất hiện khi cuộn nhanh và chạy lại khi quay lại vùng nhìn; native timeline vẫn áp dụng ngoài pha entrance. Không để cờ tắt hoạt ảnh cũ trong CMS chặn yêu cầu hiện tại. Vẫn tôn trọng prefers-reduced-motion.

Phòng và Combo hiện tối đa 6 thẻ mỗi tab trên trang chủ, giữ lọc và Xem tất cả. Form đặt đơn bỏ ảnh phòng trong phần tổng hợp và ảnh thumbnail combo; giữ đầy đủ tên, giá và lựa chọn.

Build frontend đạt. Playwright trên dữ liệu thật ghi nhận ảnh đang chạy kh-image-enter (opacity ~0,52, transform scale ~1,034 và dịch ~13,7px), sau 1,5s đạt opacity 1; thẻ khi cuộn chạy kh-visible-enter. Fixture có 15 phòng hiển thị đúng 6, 3 combo có sẵn hiển thị 3 (không tạo thẻ thiếu dữ liệu), form không còn img, không tràn ở 1440/768/390px. Không ghi dữ liệu thử lên DB.

# Trang chủ: cuộn và điều hướng

- Nội dung trang chủ dùng CSS `animation-timeline: view()` và `animation-range` để hiện theo vị trí cuộn. Chỉ khung đặt đơn có bố cục hai phần chuyển động trái/phải, bên giới thiệu giữ vị trí khi cuộn. Trình duyệt chưa hỗ trợ dùng IntersectionObserver một lần. Tắt hoạt ảnh và giảm chuyển động vẫn hiển thị đầy đủ nội dung.
- Bỏ MutationObserver quét toàn trang sau mỗi thay đổi: chỉ đăng ký các nút vừa thêm. Bỏ JavaScript cập nhật vị trí ảnh nền mỗi lần cuộn. Khối đặt đơn chỉ animate opacity/transform; không animate height khiến trang tính lại bố cục ở mỗi khung hình. Mở mặc định 900ms, đóng tối đa 350ms; lịch và menu không bị cắt.
- Các đường dẫn khách Trang chủ/Phòng & Giá/Combo/chi tiết phòng/kết quả tìm kiếm chuyển bằng History API trong cùng ứng dụng. Giữ nội dung chung, danh mục và cấu hình đang tải; tìm phòng vẫn gọi API để kiểm tra lịch mới. Giữ link thật, Back/Forward, URL truy cập trực tiếp, mở tab mới và link bên ngoài. Không chèn thời gian chờ để chạy hiệu ứng rời trang.
- Nền dưới dùng màu tối trung tính và ánh sáng nhẹ; bỏ nền ảnh hạt cũ. Footer giảm padding, bản đồ còn 164px trên desktop, cột cùng hàng và nút liên hệ thẳng đáy. Trên di động xếp lại để không ép chữ nhỏ.
- Quản trị Trang chủ: màu nền khớp vùng dưới, ảnh nền thuộc đầu trang, font xem trước theo font thật; bỏ ô tiêu đề Phòng/Combo không hiển thị ra ngoài. Số thẻ mỗi hàng chỉ hiện khi có thẻ nội dung bật. Tiêu đề đánh giá đặt trong mục đánh giá. Giữ ô nội dung/ảnh đầu trang, giới thiệu, thẻ, số liệu, nút đặt, phòng/combo nổi bật, đánh giá, footer và liên hệ đang dùng.

## Kiểm tra

Build frontend đạt. Playwright đã kiểm tra:

- CSS timeline chạy thật: phần tử dưới màn hình ở đầu hiệu ứng, cuộn tới đạt opacity 1 sau khung hình render.
- Chuyển 3 trang khách giữ nguyên dấu nhận diện trên window, không tải lại tài liệu hay gọi lại 3 API dữ liệu chung; Back/Forward hoạt động.
- Đóng/mở lại đặt đơn; khung 2 phần, opacity đầy đủ, không tràn ngang.
- Layout 1440/1024/768/390/360px không tràn trang; footer desktop fixture 297px, dữ liệu thật 270px.
- Giảm chuyển động vẫn thấy nội dung.
- Quản trị sửa tiêu đề đánh giá/lưu nháp bằng API giả lập; không tràn ở 1440/768/390px. Không ghi cấu hình thử lên DB thật.

Các trình duyệt/thiết bị có tốc độ cuộn và phần cứng khác nhau; không ép tốc độ cuộn của người dùng. Hiệu ứng native tiến theo quãng cuộn; tốc độ mở khung đặt đơn vẫn chỉnh được trong quản trị.

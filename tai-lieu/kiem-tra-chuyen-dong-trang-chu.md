# Chuyển động trang chủ — đã kiểm tra trong trình duyệt

Bỏ phần chữ “Đặt đơn / Một khoảng riêng dành cho bạn” bên trong khung đặt; giữ bộ chọn ngày, Giờ/Ngày/Đêm và giờ. Nền dưới đổi sang nâu #2b1e17, ánh sáng vàng nhẹ theo ảnh tham khảo, không dùng ảnh để giả animation.

## Triển khai

- CSS native view timeline trên section; opacity/translate tiến theo cuộn. IntersectionObserver chạy entrance khi vào viewport, có phương án thay thế khi không hỗ trợ timeline. Stagger 90ms theo vị trí phần tử, footer theo cột. Selector cuối có phạm vi rõ để không bị reset CSS cũ ghi đè.
- Hero nền ở pseudo-element (đã bỏ quy tắc display:none cũ), zoom/translate theo cuộn. Ảnh stack theo chuột, hover depth, giữ kéo gallery. Headline chia dòng và reveal từng dòng, giữ font tiêu đề.
- Ảnh phòng parallax tối đa 16px, hover zoom; overlay/nút có phản hồi. RAF/passive scroll và biến CSS, không React setState theo từng frame của parallax.
- Loại đặt có indicator trượt; khung ngày/giờ và cách tính giá không đổi.
- Tab nội dung fade/slide, lightbox fullscreen có mở/đóng, next/prev bằng nút và bàn phím, khóa cuộn nền và quản lý focus. Chuyển ảnh bằng transition thật, không ảnh GIF.
- Review carousel cuộn ngang, drag/swipe, tự chạy 4,5 giây khi trong viewport, dừng khi hover/focus/drag, tab ẩn hoặc giảm chuyển động. Card gần giữa nổi bật. Không tạo đánh giá giả cho trang thật.
- Chat khách chỉ mở hỗ trợ; giữ icon chọn ảnh/tệp đã có. Bong bóng pulse nhẹ; panel scale/fade. Không ảnh hưởng giao diện chat quản trị.
- Map card hover nâng 4px; social có glow nhẹ khi hover.

## Kết quả Playwright

`kiem-thu/trai-nghiem-dong.playwright.mjs` chạy bằng dữ liệu riêng được route giả lập, không ghi DB hay gọi AI thật:

| Hiệu ứng | Kết quả đo |
|---|---|
| Headline | kh-headline-line đang chạy |
| Hero theo cuộn | matrix scale 1.04 → 1.05389, translateY 0 → 14.6526px |
| Hero theo chuột | translate khoảng 4.03px / -1.11px |
| Section native | timeline view(), opacity 0.55 → 1 theo cuộn |
| Card reveal | animation đang chạy; stagger 0/90/180ms |
| Parallax ảnh phòng | translateY 2.86 → 5.56px khi cuộn thêm |
| Hover ảnh phòng | scale 1.085 |
| Tab | kh-tab-enter đang chạy |
| Lightbox | anh-open; next đổi URL; anh-switch; ArrowLeft và đóng hoạt động |
| Loại đặt | indicator translateX 0 → 137.562px |
| Review | tự cuộn 0 → 310px; hover giữ 310px; kéo tới 691px |
| Chat | chat-customer-open đang chạy; nút ảnh/tệp hiện |
| Footer | delay 0/90/180/270ms; tất cả kết thúc opacity 1 |
| Responsive | 1440/768/390px không tràn trang |
| Giảm chuyển động | headline animation none; không autoplay/parallax |
| Giả lập không hỗ trợ timeline | 100 phần tử theo fallback; card kh-visible-enter đang chạy |

Build frontend đạt. Không khẳng định tốc độ khung hình cố định trên mọi thiết bị; ưu tiên transform/opacity, chỉ một RAF cho parallax và không ép tốc độ cuộn. Cấu hình và API đặt đơn hiện có vẫn giữ nguyên.

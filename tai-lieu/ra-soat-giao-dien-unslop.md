# Rà soát giao diện web — 17/11/2026

## Hướng thiết kế

- Sản phẩm: đặt phòng Homestay theo giờ/ngày/đêm và quản trị vận hành.
- Tính cách: ấm, rõ ràng, điềm tĩnh.
- Chất liệu: ảnh phòng thật, ánh sáng cửa sổ và gỗ cho trang khách; bề mặt sáng dịu cho quản trị.
- Điểm nhấn: thư viện ảnh phòng và biểu đồ dữ liệu; không trang trí tất cả các khung.
- Chi tiết xuyên suốt: nét nhà HomeStay và biểu tượng nét mảnh đồng nhất.

## Các vấn đề tìm thấy

- `nen-chung.css` phủ gradient tím lên mọi trang; sidebar/nền/thẻ cạnh tranh với dữ liệu.
- `style.css` và `bo-cuc-quan-tri.css` có nhiều lớp ghi đè màu/bóng; thẻ thông tin cao hơn nhu cầu, chữ và số chưa thống nhất.
- Thanh trạng thái đơn đặt phòng có nút ra ngoài khung trên điện thoại.
- Header khách dồn nhiều nút nhỏ vào một hàng trên điện thoại; footer chưa chia nhóm rõ ràng.
- Giao diện chat khách bị chiếm chỗ bởi danh sách phòng; công cụ tìm kiếm/ảnh/tệp nằm trong header hội thoại bị ẩn.
- Nút ẩn bong bóng nhỏ, dùng ký tự mũi tên không đồng nhất với bộ icon.
- Ảnh hero chỉ đứng riêng một khung; chưa có điều khiển chuyển ảnh; tỷ lệ ảnh và khoảng cách giữa khối chưa thống nhất.

## Những thay đổi đã áp dụng

1. Khoảng cách: nguồn nhịp chung 4/8/12/16/20/24/32; sidebar 248px, hàng điều hướng 40px, khung dữ liệu gọn; bộ lọc và trạng thái đơn xuống hàng theo chiều rộng.
2. Màu: quản trị dùng nền sáng dịu, chữ trung tính và tím ở trạng thái chọn; giảm gradient và bóng màu ở khung chính. Trang khách giữ nâu/kem/vàng theo ảnh người dùng.
3. Icon: thêm `BieuTuong.tsx`, dùng SVG cùng nét cho thanh điều hướng, logo nhà, tìm kiếm/ảnh/tệp, đóng và ẩn chat.
4. Nội dung: giữ tên sản phẩm, dữ liệu CMS, quyền và nghiệp vụ; bỏ riêng phần phòng trong chat theo yêu cầu. Không thêm đánh giá, ảnh phòng hoặc người đại diện giả.
5. Chữ: tiêu đề 400–500, số dùng tabular, nhãn/ghi chú rõ hơn; serif ở tiêu đề trang khách, sans ở điều khiển.
6. Bố cục: header quản trị cùng lề nội dung, nút tiện ích nằm trong luồng; có footer gọn. Khách có menu điện thoại đóng khi chọn mục, Escape hoặc bấm ngoài; footer chia thông tin/liên kết/bản quyền.
7. Chi tiết: thẻ bo 12–16px, khung 20px, điều khiển 8px, focus bàn phím rõ; nút bong bóng ẩn/mở có vùng bấm lớn hơn. Chat khách gọn 760×640 tối đa, co theo viewport.
8. Ảnh: thư viện dùng ảnh Trang chủ/phòng từ API, chọn thumbnail, trước/sau và mở lightbox. Không tải ảnh minh họa mới vào dữ liệu thật. Thẻ phòng dùng tỷ lệ 4:3, hành động cùng đáy.
9. Chuyển động: ảnh hiện bằng opacity/translate 8px; reveal thẻ khi đi vào viewport; không tự chạy carousel. Tôn trọng `prefers-reduced-motion`.

## Xác minh

- Build TypeScript/Vite đạt. Cảnh báo kích thước chunk quản trị có sẵn vẫn còn.
- `node kiem-thu/chay-chat-ui.mjs` đạt: đơn chung, thu chi, thống kê, bảng đơn, tổng quan, phân quyền và tiện ích chat.
- `node --experimental-strip-types kiem-thu/lich-dat-tu-chat.mjs` đạt.
- Bộ `kiem-thu/giao-dien-toan-trang.playwright.mjs`: 48/48 lượt đạt, 12 trang × 1440/1024/768/390px; không tràn trang hoặc điều khiển hiển thị ngoài khung. Bảng dữ liệu vẫn có cuộn ngang riêng; phần bên trong details đóng không tính là điều khiển đang hiển thị.
- 6 biểu mẫu tạo chi nhánh/phòng/loại phòng/combo/đơn/nhân viên ở 390×844: khung và trường nhập nằm trong chiều ngang viewport.
- Đăng nhập ở 1440px và 390px không tràn ngang; trang điện thoại cuộn dọc theo nội dung.
- Chat khách: không còn khối phòng; cả 3 công cụ mở được, Escape đóng, nút ẩn/mở bong bóng hoạt động, ô nhập luôn nhìn thấy.
- Khách: menu điện thoại đóng bằng Escape; lịch 366×568 nằm trong màn hình 390×844; chuyển ảnh và lightbox hoạt động; không lỗi JavaScript trong luồng kiểm tra.

Playwright sử dụng API giả lập trong các tab riêng. Không gửi tin nhắn, tạo đơn, thay schema hay ghi dữ liệu sản xuất. Không thể đảm bảo mọi độ dài nội dung thực tế bằng các bộ dữ liệu thử này; các khung có wrap/cuộn nội bộ để xử lý nội dung dài.

Nguồn phương pháp: [Unslop](https://github.com/heydamir/unslop), Damir Sokolovsky ([@heydamir](https://x.com/heydamir)), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Bố cục, tông màu khách và yêu cầu chuyển động theo bộ ảnh người dùng cung cấp; không đổi tên sản phẩm thành tên trên ảnh.

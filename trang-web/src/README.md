# Cấu trúc mã giao diện

| Thư mục | Sở hữu |
| --- | --- |
| `quan-tri/` | Vỏ quản trị và các trang theo nghiệp vụ |
| `quan-tri/lich/` | Lịch, thiết lập hiển thị, hình học thời gian và CSS lịch |
| `quan-tri/don-dat-phong/` | Bảng đơn, biểu mẫu tạo/sửa, chi tiết và ảnh đơn; được lịch sử dụng lại |
| `quan-tri/bao-cao/` | Báo cáo, biểu đồ chung; `thu-chi/` và `thong-ke/` giữ thành phần, tính toán và xuất file riêng |
| `quan-tri/chi-nhanh/`, `phong/`, `loai-phong/`, `combo/` | Trang và CSS/thành phần chỉ phục vụ từng nghiệp vụ |
| `quan-tri/trang-chu/`, `nhan-vien/`, `danh-gia/`, `tong-quan/`, `thong-bao/` | Nội dung và thành phần quản trị tương ứng |
| `khach/` | Trang khách, thành phần ảnh/đọc lịch đặt và giao diện khách |
| `dung-chung/lich/` | Bộ chọn ngày/giờ và quy tắc thời gian dùng ở nhiều trang |
| `dung-chung/tro-chuyen/` | Chat, công cụ tìm tin/ảnh/tệp, mẫu trả lời và vị trí bong bóng |
| `dung-chung/bieu-mau/` | Ô tiền, chỉnh cột và chọn vị trí dùng lại |
| `dung-chung/api/`, `du-lieu/` | Client API, kiểu nội dung Trang chủ và dữ liệu địa chỉ |
| `dung-chung/giao-dien/` | Icon, lightbox, CSS nền tảng và hệ thống giao diện chung |

Gốc `src` chỉ giữ `main.tsx`, khai báo Vite và tài liệu này. Tệp phục vụ riêng trang nào đặt cạnh trang đó; chỉ chuyển vào `dung-chung` khi có nhiều trang sử dụng. Trang khách không import mã quản trị, quản trị không import mã trang khách; phần dùng chung không import ngược vào các trang.

Giữ thứ tự các import CSS trong lần tổ chức này để không đổi quy tắc cascade ngoài yêu cầu sửa lịch. `style.css` chứa các quy tắc nền tảng sẵn có và được giữ trong nhóm giao diện chung.

Chạy `npm --prefix trang-web run kiem-tra:cau-truc` từ gốc dự án để kiểm tra đường dẫn và ranh giới phụ thuộc. Chạy `npm --prefix trang-web run build` để kiểm tra TypeScript và đóng gói. Bảng đổi đường dẫn: [`tai-lieu/cau-truc-trang-web.json`](../../tai-lieu/cau-truc-trang-web.json).

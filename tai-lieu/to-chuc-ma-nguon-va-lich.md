# Tổ chức mã nguồn và sửa lịch — 17/11/2026

## Lịch

- Bỏ nhãn trạng thái dưới tên phòng; vẫn giữ trạng thái trong dữ liệu và các kiểm tra nghiệp vụ khi đặt/khóa phòng.
- Dải giờ/đêm phủ đủ chiều cao hàng, không bo góc hoặc chừa lề gây hở giữa hai khoảng sát nhau. Lịch ngày dùng cùng cách phủ màu.
- Vị trí và độ dài dải vẫn lấy từ thời gian bắt đầu/kết thúc thực tế; không làm tròn mất 30 phút cuối hoặc chia đứt ở nửa đêm.
- Playwright với một đơn 20:00–08:00 và đơn kế tiếp 08:00–10:30: hai dải cao 64px, không có nhãn dưới tên phòng, khe tiếp giáp đo được 0px.

## Cấu trúc

Chuyển 102 tệp trong 104 tệp nguồn web sang ba nhóm `quan-tri`, `khach`, `dung-chung`. Gốc `src` chỉ giữ entry `main.tsx`, khai báo Vite và README. Thành phần, CSS, tính toán và xuất file của trang được gom cạnh trang; thu chi/thống kê chia thành nhóm con trong báo cáo.

Tất cả import/re-export/dynamic import và các đường dẫn tệp nguồn trong kiểm thử được cập nhật. Nội dung CMS và dữ liệu địa chỉ vẫn được dùng lại từ nhóm chung. Không thêm lớp re-export ở vị trí cũ làm dư hai hệ thống thư mục.

Xem [hướng dẫn](../trang-web/src/README.md) và [bảng đổi đường dẫn](cau-truc-trang-web.json). Lệnh `npm --prefix trang-web run kiem-tra:cau-truc` kiểm tra import tồn tại, thư mục gốc gọn và ranh giới phụ thuộc: khách/quản trị không phụ thuộc trực tiếp nhau, dùng chung không phụ thuộc ngược vào trang.

Máy chủ đã có module quản trị, khách hàng, xác thực và kết nối dữ liệu nên giữ cách phân module hiện có; đã kiểm tra build và toàn bộ kiểm thử máy chủ. Không thay đổi API, schema hoặc dữ liệu sản xuất.

## Kiểm tra

- Web và máy chủ build đạt.
- Kiểm tra cấu trúc đạt: 184 import nội bộ, không phát hiện phụ thuộc ngược.
- Máy chủ: 13 tệp kiểm thử, 107 kiểm thử đạt.
- Bộ UI hiện có đạt, bao gồm form đơn, thu chi, thống kê, phân quyền, bảng và chat.
- Các kiểm thử tính toán/định dạng/dữ liệu mẫu/nhóm biểu đồ và kiểm thử hình học lịch mới đều đạt.
- Kiểm thử tích hợp PGlite đạt: đặt phòng, phân quyền, chat, nhân viên, Trang chủ, trạng thái, thu chi và thống kê.
- Playwright sau khi chuyển nguồn: 48/48 lượt kiểm tra, 12 trang quản trị × 4 độ rộng; trang khách tải phòng và mở chat với đủ 3 nút công cụ, không lỗi module.
- Fixture Playwright chỉ chặn URL có pathname bắt đầu `/api/`, tránh chặn nhầm module nguồn trong `dung-chung/api`.

Các kiểm tra trình duyệt dùng dữ liệu giả lập trong tab riêng. Nguồn cũ trên máy Windows được sao lưu cục bộ; bộ chuyển một lần đã đối chiếu SHA-256 đủ 105 tệp đích trước khi bỏ đường dẫn cũ. Cấu hình Vite đã khôi phục về nguyên trạng. Thư mục sao lưu/chuẩn bị được loại khỏi Git.

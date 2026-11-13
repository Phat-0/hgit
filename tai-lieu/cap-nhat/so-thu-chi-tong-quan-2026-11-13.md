# Sổ thu chi và điều chỉnh tổng quan, lịch — 13/11/2026

## Tổng quan

Năm thẻ xếp biểu tượng ở trên, nhãn/số liệu ở dưới, cùng căn trái. Đánh giá là điểm sao trung bình trên thang 5, bên dưới giữ tổng đánh giá và số mới trong tuần. Biểu đồ cao theo tiền, tiền phía trên cột và số đơn phía dưới (chỉ số, không chữ “đơn”). Mỗi cột rộng tối thiểu 84 px, nhãn tiền có khoảng riêng; ngày không có đơn cũng không chồng nhãn.

## Lịch và phòng trống

Lịch giờ/đêm và lịch ngày dùng chung nội dung thẻ, bo góc và màu trạng thái. Khoảng khóa dùng `trang_thai_phong` và danh mục `mau_phong`; đơn đặt dùng trạng thái thanh toán và `mau_thanh_toan`. Hai nhóm vẫn chỉnh riêng trong Thiết lập.

API tạo đơn của khách và quản trị chỉ nhận phòng có trạng thái hiển thị hiện tại là Trống, đồng thời không có đơn/khóa trùng khoảng đặt. Phòng đang sử dụng, đang vệ sinh, chờ kiểm tra, bảo trì, bị khóa hay trạng thái tùy chỉnh khác đều không nhận đơn mới, kể cả đặt cho tương lai. Nhân viên hoàn tất vệ sinh rồi chọn Trống mới nhận được đơn. Form mới chỉ liệt kê phòng trống; nút Tạo đơn trong popup lịch bị tắt nếu phòng chưa trống. Thay phòng/thời gian của đơn cũng kiểm tra lại trạng thái; sửa ghi chú/thanh toán không đổi lịch vẫn được phép.

## Sổ thu chi

Phía trên là một khối chung gồm tìm kiếm, chọn từ ngày–đến ngày (mặc định nguyên tháng hiện tại), lọc Thu/Chi, tiền tồn và bảng nhập trực tiếp.

Các cột: ngày, tên khoản, tiền, loại Thu/Chi, chi nhánh/phòng, ghi chú, chứng từ, số dư lũy kế và thao tác. Nhập theo nghìn đồng như ô giá khác: 250 → 250.000. Gõ số âm sẽ chuyển sang Chi, số dương chuyển sang Thu. Chọn Thu/Chi đưa tiền về đúng dấu; API chuẩn hóa và DB ràng buộc dấu để không lưu sai. Không cho lưu khoản bằng 0.

Nhấn ✓ để lưu từng dòng (kể cả màu hàng); ↶ bỏ bản nháp. Nhấn × và xác nhận để xóa. Dòng có chứng từ cần xóa chứng từ trước; mọi tạo/sửa/xóa và tiền tồn lưu nhật ký, chống ghi đè phiên bản khi nhiều người cùng sửa.

### Các tổng tiền

- **Tiền tồn:** nhập và lưu riêng cho từng tháng, không tự chuyển từ tháng trước. Mặc định 0 nếu chưa nhập. Dùng tháng của ngày bắt đầu khi chọn khoảng nhiều tháng.
- **Tổng tiền tháng:** tiền tồn đã lưu + toàn bộ thu cả tháng + toàn bộ chi âm cả tháng. Tìm kiếm/lọc/đang chọn ô không thay đổi tổng này.
- **Lũy kế từng dòng:** tiền tồn tháng bắt đầu + thu/chi trước khoảng chọn trong tháng đó + các dòng theo thứ tự thời gian. Khi xem nhiều tháng, đây là lũy kế từ tiền tồn tháng bắt đầu, không tự chèn tiền tồn của các tháng tiếp theo.
- **Tổng vùng:** kéo chuột từ ô đầu đến ô cuối hoặc Shift + phím mũi tên. Chỉ cộng các ô ở cột Số tiền trong vùng, không cộng tiền tồn hoặc cột lũy kế. Chọn một ô tiền sẽ hiện tổng đúng ô đó.
- **Tổng theo ngày:** nhập hai mốc ngày trong phần dữ liệu đã tải để tính tổng thu/chi, không gồm tiền tồn. Muốn tính ngoài khoảng đã tải, đổi khoảng lịch chính trước.
- **Bản nháp:** số tiền trong bảng/tổng vùng có thể xem trước thay đổi chưa lưu; biểu đồ và tổng tháng chỉ lấy dữ liệu đã lưu.

Sổ thu chi lưu **riêng** với doanh thu/nhãn thanh toán của đơn. Không tự biến một đơn đã xác nhận thành tiền thực thu và không cộng hai nguồn với nhau. Nhân viên ghi khoản thực thu/thực chi và gán phòng/chi nhánh tương ứng. Phần thống kê đặt phòng cũ vẫn truy cập trong mục mở rộng bên dưới.

### Chứng từ và quyền

Tối đa 10 tệp/dòng: JPG/PNG/WebP 10 MB; PDF/TXT/CSV/DOCX/XLSX 20 MB. Kiểm tra MIME/chữ ký tệp, không nhận HTML/SVG/chương trình. Kho `chung-tu-thu-chi` riêng tư; URL ký 5 phút, yêu cầu quyền trang Báo cáo ở backend. Người có quyền Báo cáo quản lý sổ toàn hệ thống theo mô hình quyền trang hiện tại. Chứng từ không được đọc bằng client Supabase trực tiếp.

### Biểu đồ

Biểu đồ cột Thu/Chi và tròn hiển thị dưới khối sổ. Dùng khoảng ngày chính, lọc riêng theo chi nhánh/phòng, nhóm ngày/chi nhánh/phòng/tổng, đổi màu Thu/Chi và sắp xếp lớn→bé/bé→lớn/ngày–tên. Màu biểu đồ lưu trên trình duyệt của người dùng; màu từng hàng lưu DB dùng chung.

% = giá trị thu hoặc trị tuyệt đối chi / (tổng thu + trị tuyệt đối chi) trong phạm vi đã chọn. Chi trong biểu đồ dùng độ lớn dương để so sánh; bảng và tổng số dư vẫn giữ dấu âm. Không cộng tiền tồn vào biểu đồ. Khoản chưa gán phòng/chi nhánh chỉ xuất hiện trong tổng/chưa gán, không phân bổ ngầm vào chi nhánh riêng.

Bảng giới hạn 5.000 dòng/khoảng; quá giới hạn API yêu cầu thu hẹp ngày, không âm thầm bỏ dòng để tránh tính thiếu tổng.

## Database và cập nhật

Migration `20261113170000_so_thu_chi_thang.sql` đã áp dụng Supabase qua MCP; chỉ thêm bảng/index/bucket, không xóa dữ liệu. Các bảng `so_thu_chi`, `tien_ton_thang`, `chung_tu_thu_chi`, `nhat_ky_thu_chi` bật RLS, chặn anon/authenticated truy cập trực tiếp, backend kiểm tra quyền.

```powershell
cd D:\DoAnTotNghiep
git pull origin main
cd may-chu
npm.cmd run db:so-thu-chi
npm.cmd run build
cd ..\trang-web
npm.cmd run build
```

Script migration có kiểm tra phiên bản, chạy lại sau khi đã đồng bộ sẽ bỏ qua. Khởi động lại backend sau cập nhật. Đã kiểm tra build/lint, 98 unit tests, PostgreSQL PGlite (phiên bản/tiền tồn/chứng từ/RLS) và DOM (kéo chọn vùng, đổi dấu, tổng độc lập, biểu đồ %). Chưa xác nhận trực quan bản mới bằng Playwright; không xuất artifact frontend sang MCP khi chưa được phép.

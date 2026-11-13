# Cập nhật Tổng quan, Lịch và quyền nhân viên — 13/11/2026

## Các phần đã thay đổi

- Tổng quan bỏ chữ “Dữ liệu thực tế”, gộp Homestay/Phòng; thêm doanh thu theo tháng chọn được, chênh lệch hôm nay/hôm qua, tổng đánh giá và đánh giá mới từ đầu tuần (thứ Hai, giờ Việt Nam).
- Thẻ Đánh giá mở trang Đánh giá; các thẻ còn lại mở Báo cáo. Biểu đồ dùng số liệu từng ngày, bấm ngày mở đánh giá của ngày đó. Hai chuỗi số đơn và doanh thu dùng thang đo riêng, có số và tiền cụ thể trên mỗi cột.
- Đánh giá mới thay Trạng thái Homestay. Lượt đặt/hủy phân loại theo giờ/ngày/đêm thay Homestay mới đăng ký. Đơn mới trong tháng hiển thị khách, phòng, kiểu đặt, giờ tạo, giờ nhận, giá và mở đúng chi tiết đơn.
- Menu Cài đặt đổi thành Đánh giá. Trang đánh giá có tìm kiếm, lọc sao/ngày, thông tin phòng/chi nhánh và liên kết đọc chi tiết đơn.
- Báo cáo lọc ngày/chi nhánh; có số đơn/hủy, tỷ lệ hủy, doanh thu/tiền thực thu, giá trị trung bình; Homestay/phòng/tài khoản, tài khoản mới; phân nhóm theo phòng, chi nhánh, kiểu đặt, trạng thái, thanh toán và đánh giá theo sao; bảng ngày, 300 đơn mới nhất trong kỳ và xuất CSV theo ngày. Bộ lọc tối đa 367 ngày. Tổng tài khoản và tài khoản mới là toàn hệ thống, không phân theo chi nhánh.
- Lịch: kẻ cột nửa giờ và bo thanh lịch; bỏ tiêu đề tên cột kỹ thuật khỏi Thiết lập. Ba nút Điều chỉnh giờ/Thêm mới/Xóa cùng hàng. Thêm tên và màu ngay dưới hàng nút. Màu/trạng thái tùy chỉnh lưu vào DB có phiên bản chống ghi đè. Có nút nhập thiết lập cũ trên máy; sau đó phải lưu để chia sẻ.
- Bấm ô lịch trống chọn Tạo đơn đặt phòng hoặc Tạo lịch khóa riêng. Đơn dùng chung form với trang Đơn đặt phòng, tự tính giá; lịch khóa vẫn riêng, các trường xếp hai cột và giờ ở cùng nhóm.
- Tạo/sửa đơn dùng chung form, hai cột; ngày và đêm hiện đủ ngày/giờ check-in, check-out. Đổi phòng/ngày/giờ hiện dòng trước → sau; chi tiết đơn đọc lịch sử từ nhật ký DB. Giữ giờ và giá đã chốt của đơn cũ khi chỉ sửa thông tin, không áp ngược thiết lập giờ mới. Khi đổi lịch/phòng thì áp quy tắc hiện tại. API vẫn kiểm tra trùng lịch, sức chứa, số giờ tối thiểu và không cho giảm tổng dưới tiền đã thu.
- Phòng tìm theo cả tên loại phòng (lọc và đếm tại DB); Loại phòng có ô tìm tên/chi nhánh/mô tả.
- Combo: các bộ lọc/nút trên một hàng khi đủ chỗ; màn hình nhỏ được xuống hàng. Chi tiết mở ngay bên dưới ảnh, đẩy các thẻ tiếp theo trong cùng cột, các cột bên cạnh giữ vị trí. Sửa/xóa/ảnh phóng to vẫn có.
- Trang chủ: thêm tên website, khẩu hiệu, tiêu đề phần phòng, ba nền tím, màu nút, số thẻ 2/3/4 mỗi hàng, vị trí ảnh banner và xem trước; giữ upload ảnh, bật/tắt các khối, sắp xếp thẻ, lưu nháp/xuất bản và chống ghi đè.
- Nhân viên: tăng độ rõ thông tin; thêm tab Vai trò và quyền, tạo vai trò riêng, cấp quyền trang, chọn vai trò mới khi tạo/sửa nhân viên. Backend kiểm tra quyền cho từng trang; chỉ quản trị hệ thống quản lý vai trò và nhân viên. Không mở quyền quản trị nhân viên cho vai trò tùy chỉnh.

## Quy ước doanh thu

Doanh thu đặt phòng là tổng `dat_phong.tong_tien` của đơn Đã xác nhận/Đã nhận phòng/Đã trả phòng, nhóm theo `ngay_tao` ở Asia/Ho_Chi_Minh. Đơn chờ và đơn hủy không tính doanh thu. Đây là giá trị đặt phòng, không phải doanh thu kế toán theo ngày lưu trú. Tiền đã thu là tổng giao dịch `thanh_toan` Đã xác nhận theo ngày tạo giao dịch. Nhãn thanh toán ở đơn không tự sinh giao dịch thu và không tự hoàn tiền. Các ngày không có dữ liệu hiển thị 0.

## Giải đáp các điểm được hỏi

**Máy khác có thấy thiết lập lịch không?** Sau khi Lưu thiết lập hiển thị, máy khác mở/tải lại Lịch sẽ nhận cùng màu và tên trạng thái từ `cau_hinh_hien_thi_lich`. Khung giờ từ `cau_hinh_gio_dat_phong` cũng dùng chung. Giao diện/ứng dụng khác cần gọi cùng API để thể hiện các thiết lập này; không tự xuất hiện trong ứng dụng chưa tích hợp API. Chưa có đẩy thay đổi thời gian thực giữa các tab. Tên tùy chỉnh dùng cho nhãn/lý do khóa và màu hiển thị, không tự tạo thêm trạng thái nghiệp vụ của đơn.

**Đơn từ Lịch lưu sang Đơn đặt phòng, khóa chỉ nằm ở Lịch?** Đã tách hai lựa chọn. Tạo đơn ghi `dat_phong`, nên hai trang cùng đọc một đơn. Khóa ghi `chan_lich_phong`, không tạo doanh thu hay đơn. Cả hai cùng tham gia chống trùng phòng; giá ghi nhận của khóa chỉ là ghi chú vận hành.

**Tiền dịch vụ ở đâu ra?** Đọc từ `dat_phong.tien_dich_vu`, mặc định 0. `tong_tien` được DB tính = tiền phòng + dịch vụ − giảm giá. Hiện form chưa có nghiệp vụ thêm dịch vụ riêng; không tự thu một khoản cố định. Giá combo trong luồng tạo đơn hiện được cộng vào tiền phòng, không tự đưa sang trường dịch vụ. Các bảng danh mục dịch vụ/combo_dich_vu chưa có màn hình ghi nhận dịch vụ phát sinh trong luồng này.

**Hỗ trợ đặt phòng trong Tin nhắn là gì?** Mở hoặc tạo hội thoại hỗ trợ cho tài khoản hiện tại (theo chi nhánh nếu có). Nó không tạo đơn, không giữ chỗ, không phải AI. Muốn nhắn người khác dùng tìm người; muốn xử lý yêu cầu khách dùng danh sách hội thoại. Nút được bổ sung tooltip giải thích.

**Phạm vi quyền nhân viên:** Quyền trang bao gồm xem và thao tác dữ liệu của trang trên toàn hệ thống. Chi nhánh phân công là thông tin công việc, chưa phải ranh giới dữ liệu theo chi nhánh. Điều này được ghi ngay trong giao diện cấp quyền. Các vai trò cũ mặc định chưa có quyền trang mới; quản trị chủ động chọn quyền. Menu cập nhật khi tải lại, backend kiểm tra quyền ở mỗi yêu cầu nên thu hồi quyền có hiệu lực ở server ngay. Không cấp quyền quản lý nhân viên/vai trò cho nhân viên.

## DB và cách cập nhật

Migration `20261113092348_tong_quan_danh_gia_quyen_lich.sql` đã áp dụng trên Supabase, bổ sung cấu hình và quyền, giữ dữ liệu cũ. Có script `npm.cmd run db:quan-tri-mo-rong` để đồng bộ môi trường DB khác; có kiểm tra đã chạy và TLS CA như các script trước. DB đang liên kết đã chạy rồi, không cần chạy SQL lại.

Trên máy đang làm:

```powershell
cd D:\DoAnTotNghiep
git pull origin main
cd may-chu
npm.cmd run build
# Khởi động lại backend đang chạy để nạp API/quyền mới.
cd ..\trang-web
npm.cmd run build
```

## Kiểm tra và giới hạn

- Build frontend/backend, 72 unit tests backend và lint.
- PostgreSQL/PGlite kiểm tra migration, quyền vai trò tạo/gán/thu hồi, từ chối truy cập trang không được cấp, RLS cấu hình, chống ghi đè, báo cáo qua mốc nửa đêm Việt Nam, ngày trống, loại đơn hủy/chờ khỏi doanh thu, lịch sử đổi phòng/ngày; các kiểm tra đặt phòng/chat/nhân viên/trang chủ trước đó.
- Kiểm thử DOM: giá giờ/phụ thu/đêm, check-in/out qua ngày, payload tạo đơn, preview đổi phòng, giữ giờ đã chốt của đơn cũ, liên kết Tổng quan/Báo cáo/Đánh giá đúng ngày; cấu trúc Combo mở chi tiết trong cột; thiết lập Trang chủ và Vai trò.
- Kiểm tra truy vấn báo cáo và cấu hình/RLS trên Supabase thật sau migration. Không tạo nhân viên, đơn hay đánh giá thử trong DB thật.
- Chưa xác minh trực quan bản build mới: kiểm duyệt tự động từ chối chuyển bundle sang máy chủ Playwright MCP vì nguy cơ lộ nội dung code; Chromium tại môi trường code cũng chưa khởi chạy được. Kiểm thử DOM không thay thế kiểm tra ảnh chụp/hình học và không chứng minh mọi trạng thái dữ liệu thật đều có bố cục đúng. Dữ liệu Playwright giả lập được lưu ở `kiem-thu/du-lieu-giao-dien.mjs` để kiểm tra tiếp sau khi có môi trường phù hợp.

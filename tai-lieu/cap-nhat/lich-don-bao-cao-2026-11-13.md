# Cập nhật lịch, đơn đặt phòng, tổng quan và báo cáo — 13/11/2026

## Đã thay đổi

- Tổng quan dùng lại các khối, biểu tượng và CSS `qt-stats`, `qt-main-grid`, `qt-bottom-grid` của bố cục cũ; bỏ chọn tháng phía trên. Nội dung lấy API tháng hiện tại theo giờ Việt Nam. Cột thống kê cao theo doanh thu, số đơn trong cột, tiền phía trên; các ngày không có đơn vẫn hiện 0. Khối đặt/hủy có ba phần giờ/ngày/đêm, không có tiền. Đơn mới đặt thời gian tạo ở góc phải, nhận → trả cùng dòng.
- Lịch giờ và ngày dùng chung nội dung thanh lịch khóa/đơn, tên trạng thái, màu và khoảng thời gian. Ô tạo lịch giữ popup cũ, có hai nút Tạo đơn đặt phòng / Khóa lịch. Tạo đơn dùng form chung với trang đơn, lưu vào `dat_phong`; khóa lưu riêng `chan_lich_phong`.
- Thiết lập tách hai danh mục tên/màu dùng chung trên DB. Máy khác tải lại trang sẽ nhận thiết lập đã lưu; có kiểm tra phiên bản để tránh ghi đè thiết lập của người khác.
- Combo mở chi tiết trải hết hàng phía dưới hàng thẻ đang chọn, ảnh và thông tin nằm cạnh nhau trên màn hình rộng. Hàng phía dưới dịch xuống; thẻ khác trong hàng giữ nguyên vị trí.
- Bảng đơn: mã không in đậm, trỏ chuột xem mã đầy đủ, hai biểu tượng Chat / Ảnh không mở chi tiết. Chi tiết có Xác nhận / Nhận phòng / Trả phòng / Không nhận phòng; nút hợp lệ có màu, nút còn lại tối. Sửa thao tác nhầm qua biểu tượng sửa, bắt buộc lý do và lưu nhật ký. Xóa chuyển Đã hủy, giữ lịch sử, không tự hoàn tiền. Bỏ nút Đóng cuối hộp; giữ X góc trên.
- Ảnh riêng theo đơn: tối đa 20 ảnh, 5 MB/ảnh JPG/PNG/WebP, kiểm tra chữ ký tệp; bucket riêng tư, URL ký 5 phút, quyền backend theo trang lịch/đơn.
- Báo cáo dùng bộ chọn từ ngày–đến ngày chung, có biểu đồ doanh thu ngày/phòng/chi nhánh/kiểu đặt và bảng từng phòng, kể cả phòng chưa có đơn.

## Trạng thái lưu ở đâu và hoạt động thế nào?

| Nội dung | DB | Quy tắc hiển thị |
|---|---|---|
| Vận hành phòng | `phong.trang_thai_van_hanh`, `trang_thai_cap_nhat_luc` | Bảo trì/Bị khóa thủ công được ưu tiên. Đến giờ của đơn xác nhận/đã nhận: Đang sử dụng. Sau giờ trả/đã trả: Đang vệ sinh cho đến khi nhân viên đánh dấu Trống. Đơn tương lai chưa làm phòng thành đang dùng. |
| Trạng thái phòng của lịch chặn | `chan_lich_phong.trang_thai_phong` | Có hiệu lực trong đúng thời gian chặn. Lý do lưu riêng `ly_do`, không dùng lý do thay trạng thái. |
| Màu và tên trên lịch | `cau_hinh_hien_thi_lich.mau_phong`, `trang_thai_phong`, `mau_thanh_toan`, `trang_thai_thanh_toan` | Hai danh mục độc lập. Giữ cột cũ để tương thích. |
| Thanh toán trên khoảng khóa | `chan_lich_phong.trang_thai_thanh_toan` | Nhãn/màu trên lịch; không tạo giao dịch thu tiền. |
| Vòng đời đơn | `dat_phong.trang_thai` | Xác nhận → nhận → trả; hoặc không nhận phòng. Sửa ngược chỉ trong form sửa có lý do. |
| Thanh toán đơn | `dat_phong.trang_thai_thanh_toan`, `tien_da_thanh_toan` | Giá trị có sẵn: Chưa thanh toán / Cọc / Đủ. Giao diện gọi Đủ là Đã thanh toán. |

Trạng thái phòng theo thời gian được tính khi đọc API (`trang_thai_hien_thi`), không tự ghi DB qua GET. Trang phòng tải lại âm thầm mỗi 30 giây khi đang hiển thị. Đánh dấu Trống sau vệ sinh sẽ ghi mốc cập nhật, không để đơn cũ tiếp tục ép trạng thái vệ sinh. Không có tác vụ tự chuyển phòng sang bảo trì; nhân viên chọn trạng thái đó.

Số tiền đã ghi nhận ở form tạo/sửa là thông tin do nhân viên nhập: chưa thanh toán = 0, cọc > 0 và < tổng, đã thanh toán = tổng. Không tự tạo giao dịch ngân hàng trong `thanh_toan`. Khi sửa đơn cũ, không tự nâng số tiền đã nhận; nếu tổng thay đổi trên đơn đã thanh toán, yêu cầu kiểm tra và chọn lại thanh toán. Không được giảm số tiền ghi nhận xuống dưới tổng giao dịch thực thu đã xác nhận. Các trạng thái tự thêm cho lịch không mở rộng tập trạng thái tài chính của đơn.

## Liên kết đơn và tài khoản / chat

Form tạo đơn hiện bắt buộc số điện thoại. Đơn nhập từ dữ liệu cũ mà thiếu số điện thoại không thể tự nhận chủ theo tên; cần sửa số đúng và khách xác minh số đó. Không cần khách có tài khoản lúc nhân viên tạo đơn.

Biểu tượng chat dùng `hoi_thoai_don_dat_phong` để lưu hội thoại của đơn. Chưa có tài khoản phù hợp: tạo hội thoại chờ liên kết, lưu số chuẩn hóa trong `cuoc_tro_chuyen.so_dien_thoai_lien_ket`. Khi khách đăng nhập và đã xác thực số điện thoại bằng OTP, danh sách chat nhận hội thoại chờ khớp đơn/số. Email đăng nhập hay số ghi tự do trong hồ sơ chưa đủ để nhận lịch sử. Muốn dùng được tính năng này phải cấu hình nhà cung cấp SMS/OTP trong Supabase Auth; chỉ đăng nhập Google/email không tự xác thực số điện thoại.

Đổi số ở form sửa đơn sẽ xóa liên kết tài khoản của đơn. Nút chat lần sau chọn/tạo hội thoại phù hợp số mới; hội thoại cũ giữ cho chủ cũ, không chuyển lịch sử riêng tư sang người khác. Cùng số đã xác thực mới được tự nhận lại. Muốn đổi sang tài khoản khác cùng số đang thuộc tài khoản cũ cần xử lý quyền sở hữu số qua Supabase Auth trước, không gán bằng tên khách hoặc ID tùy ý.

## Cách đọc báo cáo

Doanh thu trong biểu đồ là tổng giá trị đơn xác nhận/đã nhận/đã trả, theo ngày tạo đơn ở múi giờ Việt Nam. Đây không phải tiền mặt thực thu; ô Tiền đã thu lấy các giao dịch `thanh_toan` đã xác nhận. Đơn hủy/no-show không cộng doanh thu. Tần suất = tổng lượt tạo đơn của phòng / số ngày trong khoảng, không phải tỷ lệ lấp đầy. Bảng có số lượt hợp lệ và hủy để đối chiếu.

## Cập nhật và kiểm chứng

Migration `20261113111315_tach_trang_thai_phong_thanh_toan_anh_don.sql` đã áp dụng Supabase qua MCP ngày 13/11/2026; không xóa dữ liệu, hai đơn có trước vẫn được giữ. Hai bảng ảnh/liên kết chat bật RLS, bucket `anh-don` riêng tư. Script chạy bằng CA và kiểm tra registry nên có thể gọi lại trên DB đã đồng bộ.

```powershell
cd D:\DoAnTotNghiep
git pull origin main
cd may-chu
npm.cmd run db:lich-don-trang-thai
npm.cmd run build
# Khởi động lại backend đang chạy sau khi build/cập nhật code
cd ..\trang-web
npm.cmd run build
```

Đã kiểm chứng: build frontend/backend, lint backend, 82 unit tests, PostgreSQL PGlite integration và kiểm thử tương tác DOM. Playwright MCP đã mở/chụp website đang chạy với dữ liệu giả trong context riêng, không ghi vào dữ liệu thật. Website đó vẫn chạy bản trước cập nhật. Chưa xác nhận trực quan bản build mới: kiểm duyệt tự động chặn xuất toàn bộ artifact frontend sang máy chủ Playwright MCP khi chưa có đồng ý rõ cho việc chuyển artifact.

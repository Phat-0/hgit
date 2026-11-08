# Trang khách, đặt phòng và trò chuyện

## Giao diện đã chọn

Người dùng chọn **thẻ kính tương tác**: nền tím chuyển sắc, thẻ ảnh nổi với hiệu ứng nhẹ, thông tin giá/sức chứa rõ ràng, tự chuyển một cột trên điện thoại và tôn trọng thiết lập giảm chuyển động. Ảnh lấy từ phòng đã lưu, không tạo ảnh giả hay số đánh giá giả.

Các hướng hình ảnh khác có thể đổi về sau:

| Kiểu | Thể hiện | Phù hợp |
|---|---|---|
| Tạp chí nghỉ dưỡng | Ảnh khổ lớn, chữ thanh, lưới thoáng | Nhấn mạnh trải nghiệm và hình ảnh |
| Thẻ kính tương tác — đã chọn | Mảng trong mờ, chiều sâu, hover nhẹ | Trang đặt phòng hiện đại, có cá tính |
| Bản đồ + danh sách | Chi nhánh trên bản đồ, phòng ở cột bên | Nhiều cơ sở phân bố xa nhau |
| Bộ sưu tập ảnh lệch nhịp | Một ảnh lớn cạnh hai ảnh nhỏ | Bộ ảnh phòng đẹp, nhiều góc chụp |
| Dải thời gian đặt phòng | Phòng thành từng hàng, thời gian ở phía trên | Khách ưu tiên tìm giờ trống nhanh |
| Phòng dạng vé hành trình | Thẻ giống vé, giờ nhận/trả và giá nổi bật | Đặt theo giờ, trải nghiệm ngắn |

## Chạy và cập nhật

```powershell
cd D:\DoAnTotNghiep
git pull origin main
cd may-chu
npm.cmd run db:dong-bo-dat-phong
npm.cmd run db:dong-bo-combo
npm.cmd run db:anh-combo
npm.cmd run db:trang-khach-chat
npm.cmd run start:dev
```

Frontend ở terminal khác:

```powershell
cd D:\DoAnTotNghiep\trang-web
npm.cmd run dev
```

Trang khách ở `/`; quản trị ở `/quan-tri`, menu **Tin nhắn**. Các bước migration cũ đã chạy sẽ được bỏ qua theo bảng phiên bản. Migration mới giữ nguyên đơn, giá, các khóa ngoại cũ; mở rộng hội thoại cho khách vãng lai và thành viên riêng tư, bổ sung khóa chống gửi trùng, giới hạn truy cập. Không thực thi SQL trên Supabase từ phiên chỉnh mã nguồn này.

Backend cần DATABASE_URL, CA hợp lệ, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY. Service role chỉ đặt tại backend để ký URL ảnh riêng tư. Nên đặt RATE_LIMIT_SECRET ngẫu nhiên. Nếu có reverse proxy, khai báo TRUST_PROXY bằng đúng IP/CIDR của proxy tin cậy; không tin mọi X-Forwarded-For từ Internet. Mặc định không tin header IP do client tự gửi.

**OTP thật:** bật Phone Auth và cấu hình nhà cung cấp SMS trong Supabase. Chỉ thêm code không tự bật dịch vụ SMS. Không dùng mã OTP thử nghiệm công khai ở production. Tài liệu: https://supabase.com/docs/guides/auth/phone-login

Triển khai production cần build frontend/backend, phục vụ frontend qua HTTPS và chuyển `/api` đến NestJS. Không có domain/hosting được cấu hình hoặc triển khai bởi commit này.

## Nghiệp vụ hiện có

- Tự tải phòng phù hợp với khung theo ngày sắp tới khi mở trang. Khách có thể đổi chi nhánh, Theo giờ/Theo ngày/Qua đêm, khoảng ngày và giờ; kết quả tự cập nhật sau một khoảng chờ ngắn, không để phản hồi cũ ghi đè bộ lọc mới.
- Dùng khung giờ lấy từ thiết lập Lịch, UTC+7, mốc 30 phút. Với ngày/đêm, ngày cuối là ngày bắt đầu khung cuối; nếu qua nửa đêm thì trả vào ngày sau.
- Tìm phòng loại trừ đơn đang hiệu lực và khóa lịch; loại phòng bảo trì/bị khóa, chi nhánh chưa hoạt động. Tối đa 200 phòng mỗi kết quả, cần thêm phân trang khi mở rộng lớn hơn.
- API tính giá từ phòng và quy tắc giá lịch. Với giá lịch, ưu tiên cao hơn, mới hơn được chọn tại đầu mỗi khối tính tiền. Theo giờ tính giá số giờ đầu và phụ thu từng giờ vượt; ngày/đêm tính từng khung. Combo giờ thay giá giờ đầu, combo dịch vụ cộng thêm. Không chấp nhận giá hay trạng thái xác nhận từ client.
- Chọn phòng mở tab Thông tin đặt phòng; tab Combo hiển thị tên, mô tả, ảnh, số giờ, hiệu lực và tổng giá. Chỉ có combo đúng phòng/chi nhánh, kiểu đặt, thời gian.
- Nhập số điện thoại khi chưa đăng nhập hiện lời mời tham gia, vẫn cho gửi đơn khách. Không tiết lộ số đó có tài khoản hay chưa.
- Đơn khách **Chờ xác nhận**, giữ phòng 15 phút. Khóa hàng phòng, kiểm tra lại lịch, khóa chống trùng trong PostgreSQL; mã yêu cầu ngăn việc bấm/gửi lại tạo nhiều đơn. Nhân viên xác nhận trước hạn; không tự đánh dấu đã thanh toán.
- Đơn khách chưa xác nhận quá hạn được chuyển Hết hạn khi tìm/đặt/xem lịch sử và bởi tác vụ nền mỗi 30 giây khi NestJS đang chạy. Ghi nhật ký hết hạn, không xóa đơn/chứng từ. Đơn quản trị không bị tác vụ này tác động.
- Đăng nhập bằng OTP số điện thoại; chuẩn hóa 090…/84…/+84… về cùng dạng. Chỉ phone và phone_confirmed_at do Supabase Auth trả về được tin cậy, không tin user_metadata hay số client gửi để nhận đơn.
- Đơn chưa có chủ tài khoản được gắn cho đúng tài khoản sau xác minh; không chuyển đơn đã thuộc tài khoản khác. Đơn của tôi chỉ đọc theo UID đã xác thực. Đơn đã đặt trước khi đăng ký vẫn xuất hiện khi số điện thoại đã xác minh khớp.
- Access token nằm trong bộ nhớ, refresh token ở sessionStorage riêng cho khách; tách với phiên quản trị. HTTPS và bảo vệ XSS vẫn cần ở hạ tầng triển khai.

## Chat hiện có

- Khách chưa đăng nhập mở hội thoại hỗ trợ theo chi nhánh. Mỗi phiên có token ngẫu nhiên 256 bit, DB chỉ lưu SHA-256. Token lưu ở sessionStorage theo chi nhánh, mất phiên khi đóng tab không thể tìm lại chỉ bằng việc nhập một số điện thoại.
- Khách đăng nhập và tài khoản nhân viên có thể nhắn trực tiếp bằng mã liên hệ được chia sẻ. Mỗi cặp tài khoản chỉ có một hội thoại trực tiếp. Không công khai danh bạ email/SĐT của toàn bộ người dùng.
- Nhân viên dùng mục Tin nhắn trong quản trị để nhận/phản hồi. Quản trị hệ thống xem hội thoại hỗ trợ; Quản lý/CSKH chỉ xem hỗ trợ thuộc chi nhánh đã cấp quyền. Hội thoại trực tiếp chỉ thành viên xem, kể cả quản trị cũng không mặc nhiên đọc được.
- Có thể tiếp tục/nhận lại phiên chat khách bằng chính bí mật phiên khi đăng nhập. Phiên đã nhận thuộc tài khoản đó, không cho tài khoản khác lấy lại bằng token cũ.
- Tin nhắn văn bản tối đa 4.000 ký tự, lưu lịch sử; chỉ lấy 60 tin mới nhất mỗi yêu cầu, API có cursor ID để tải cũ. Không render HTML do người gửi nhập. Sender ID/loại người gửi lấy từ server.
- Tin nhắn cập nhật mỗi 5 giây khi khung chat mở và trang đang hiển thị; danh sách cập nhật mỗi 10 giây. Đây là polling, **chưa phải WebSocket**. Hiện UI chủ yếu hiển thị 60 tin gần nhất; cần bổ sung nút tải cũ khi sử dụng lâu dài.
- Giới hạn theo IP cho gửi tin, mở hội thoại, OTP và đặt phòng; lưu trong DB nên không mất ngay khi restart. Khóa client chống gửi trùng tin. Chưa có ảnh/tệp, đã đọc, đang nhập, báo cáo/chặn, notification hoặc AI.

## Các mục bổ sung để chat hoàn thiện

| Mức ưu tiên | Mục | Chi tiết triển khai cần có |
|---|---|---|
| 1 | Realtime thật | WebSocket hoặc kênh riêng; kiểm tra thành viên trước join/send; khôi phục kết nối và đồng bộ tin bị lỡ; không mở kênh chat công khai. Nếu dùng Supabase Realtime, cần private channels và Realtime Authorization: https://supabase.com/docs/guides/realtime/authorization |
| 1 | Đã gửi/đã nhận/đã đọc | ID phía client, ACK phía server, last_read_message_id theo thành viên; số chưa đọc và badge; không coi mở trang là đã đọc toàn bộ. |
| 1 | Hộp thư CSKH | Chờ tiếp nhận/đang xử lý/đã đóng, người phụ trách, chuyển nhân viên, lọc chi nhánh, phản hồi mẫu và giờ làm việc. Ghi nhật ký phân công. |
| 1 | Chống lạm dụng | CAPTCHA khi khách mở phiên/đặt nhiều, chặn tài khoản, báo cáo tin, giới hạn tệp/tần suất, chống tự động tạo phiên hàng loạt. Bổ sung hạn mức theo tài khoản và điều chỉnh IP cho mạng dùng chung. |
| 1 | Trao đổi tài khoản dễ hơn | Hồ sơ tên hiển thị, link/mã QR liên hệ, tìm chính xác theo mã được chia sẻ, lời mời nhắn tin và quyền từ chối; không mở tìm kiếm số điện thoại đại trà. |
| 2 | Đang nhập/trực tuyến | Trạng thái tạm thời có TTL, debounce, heartbeat; tùy chọn ẩn hoạt động. Không ghi trạng thái gõ thành bản ghi bền vững liên tục. |
| 2 | Ảnh/tệp/ghi âm | Bucket riêng tư, kiểm MIME + chữ ký tệp, giới hạn số lượng/kích thước, quét mã độc, nén ảnh, ký URL, dọn tệp mồ côi; thanh tiến trình và thử lại khi mạng yếu. |
| 2 | Gắn ngữ cảnh đơn/phòng | Thẻ phòng/đơn trong chat, quyền kiểm tra theo từng đơn; không gửi số điện thoại/giá trị đơn vào hội thoại mà người nhận không được xem. |
| 2 | Thông báo | Âm thanh có bật/tắt, badge, thông báo trình duyệt có xin quyền, push khi đóng web, chống gửi lặp và tùy chọn giờ yên lặng. |
| 2 | Lịch sử và tìm kiếm | Tải cũ bằng cursor, tìm nội dung trong hội thoại được phép, đánh dấu tin, trả lời/trích dẫn, chỉnh sửa/thu hồi có chính sách và dấu thời gian. |
| 3 | Gọi thoại/video | Báo cuộc gọi, quyền microphone/camera, signaling, STUN/TURN, xử lý NAT và chống làm phiền; nên làm sau chat văn bản ổn định. |
| 3 | AI hỗ trợ | Tra cứu dữ liệu phòng/quy định đã công bố, hiển thị nguồn, chuyển nhân viên khi thiếu chắc chắn; không tự xác nhận thanh toán, hoàn tiền hoặc thay đổi đơn. |
| Vận hành | Dữ liệu và bảo mật | Chính sách lưu/xóa, yêu cầu xuất dữ liệu, kiểm toán, giám sát lỗi/độ trễ, sao lưu/khôi phục, kiểm thử xuyên quyền/IDOR và phân quyền chi nhánh. Không ghi raw token vào log. |
| Vận hành | Mở rộng | Hàng đợi gửi push/scan tệp, kho presence khi chạy nhiều máy, pool DB có giới hạn, metric số kết nối và SLA phản hồi; kiểm thử tải thực tế. |

Thứ tự đề xuất: **realtime riêng tư → unread/đã đọc → hộp thư nhân viên → chống spam → ảnh/tệp → push → AI/gọi**. Các mục này là đề xuất, không phải tính năng đã có trong commit.

## Kiểm tra

```powershell
cd D:\DoAnTotNghiep\may-chu
npm.cmd run build
npm.cmd test -- src/quan-tri src/khach-hang
npm.cmd run lint
cd ..\kiem-thu
npm.cmd ci
npm.cmd test
cd ..\trang-web
npm.cmd run build
```

Kiểm thử tích hợp dùng PostgreSQL WASM cục bộ, dữ liệu thử và mock lớp xác thực đã kiểm soát; không gửi SMS thật, không chạm Supabase của dự án. Kiểm tra truy cập thực trên domain, OTP/SMS, proxy, ảnh Storage và tải đồng thời phải được thực hiện sau khi cấu hình môi trường online.

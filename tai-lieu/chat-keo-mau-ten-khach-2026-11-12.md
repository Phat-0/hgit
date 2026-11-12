# Căn hộp thư, ô trả lời, kéo bong bóng và tên khách — 12/11/2026

## Đã sửa

- Cột hội thoại bên trái lùi xuống dưới header chung, cùng hàng bắt đầu với dữ liệu hội thoại bên phải. Khung vẫn kéo đến đáy màn hình, có cuộn riêng.
- Biểu tượng câu trả lời trong hội thoại mở bảng dạng ô. Header có biểu tượng thêm, chọn ô sửa, chọn ô xóa và bật sắp xếp. Chế độ thường bấm ô để gửi; chuyển chế độ sửa/xóa thì không tự gửi nội dung.
- Trong chế độ sắp xếp, kéo thả ô hoặc dùng phím mũi tên khi ô có focus. Thứ tự lưu vào DB và dùng lại ở các phiên/thiết bị. Sắp xếp một nhóm/những ô đang lọc không làm mất mẫu ngoài nhóm đó.
- Biểu tượng thêm mở form mới; chọn sửa rồi bấm ô mở đúng mẫu. Đã sửa cách gửi DTO chỉnh mẫu: không gửi kèm id hoặc các trường DB ngoài phạm vi cho phép. Xóa vẫn hỏi xác nhận và không xóa tin đã gửi.
- Bong bóng kéo tự do bằng chuột/cảm ứng, bị chặn trong giới hạn màn hình. Kéo không bị hiểu là click mở/đóng; hỗ trợ phím mũi tên (Shift tăng bước). Vị trí lưu localStorage riêng cho giao diện khách/quản trị, dùng lại trên cùng trình duyệt; tự căn lại khi đổi kích thước.
- Nút thu gọn đẩy bong bóng vào mép gần nhất, còn tay nắm và số chưa đọc; bấm tay nắm hiện lại. Nút Hỗ trợ/mục Tin nhắn vẫn mở lại được như trước. Ẩn bong bóng không xóa tin.
- Hai biểu tượng độc lập **ảnh** và **kẹp tệp**, mỗi nút mở trình chọn tệp hệ điều hành ngay. Vẫn kiểm tra loại/dung lượng ở server.
- Khách chưa đăng nhập hiện với mẫu **Khách #000001** ở hộp thư/tin phía nhân viên. Số cấp bằng identity PostgreSQL, không trùng, ổn định khi mở lại cùng cuộc chat. Tin của chính khách vẫn ghi Bạn; phía khách vẫn thấy Hỗ trợ HomeStay.
- Số là mã hiển thị của cuộc chat, không phải mật khẩu, định danh đã xác minh hay tổng số người. Có thể nhảy số khi rollback/chat loại khác được tạo. Khi đã gắn tài khoản có tên, tiếp tục ưu tiên tên hồ sơ.

## Database và kiểm thử

Migration `20261112-thu-tu-mau-ten-khach.sql` bổ sung số chat và thứ tự mẫu; không thay đổi chính sách lưu lịch sử, không xóa tin/tệp. Chạy lại không đặt lại thứ tự người dùng đã chọn. Backend giới hạn quyền sửa thứ tự ở quản trị, kiểm tra UUID/tính duy nhất, dùng transaction/khóa chung khi thêm/sửa/xóa/sắp xếp, giữ nguyên các ô không nằm trong tập đang sắp xếp và ghi nhật ký.

Migration đã áp dụng vào homestay-db. Trước/sau: 2 hội thoại, 4 tin, 3 mẫu; số chat không trùng và có cột thứ tự. Không gửi tin thử hay tạo tài khoản thật. API/migration mới không cấp quyền công khai cho bảng/sequence.

Build frontend/backend, 72 unit test, lint, PostgreSQL cục bộ và UI DOM đều đạt. Đã mở rộng kiểm thử kéo/thụt/mở lại, lưu vị trí, phím di chuyển, sắp xếp qua UI/backend, sửa đúng mẫu/DTO không kèm id, xóa từ ô, số khách tăng/không đổi khi nối lại, giữ thứ tự sau sửa và migration lặp. Chưa có ảnh chụp browser/kiểm thử pixel trên thiết bị Windows; DOM xác minh luồng tương tác, không thay thế kiểm tra độ mượt trên thiết bị thật.

## Hiện lịch sử tồn tại bao lâu?

Hiện **không có tác vụ tự xóa hội thoại** hoặc thời hạn xóa sau N ngày. Tin nằm trong PostgreSQL; phiên nhận diện khách và dữ liệu tin là hai thứ khác nhau:

- Khách chưa đăng nhập dùng sessionStorage theo chi nhánh. Tải lại cùng tab/phiên còn token thì tiếp tục cuộc đó. Đóng tab, xóa dữ liệu trình duyệt, dùng ẩn danh hoặc máy khác không bảo đảm nhận lại phiên, mặc dù tin vẫn còn trong DB cho nhân viên.
- Khách có tài khoản cần đăng nhập lại đúng tài khoản để lấy cuộc hỗ trợ đang mở. Tin không bị xóa khi access token hết hạn. Nhận diện có xác thực mới là cơ sở truy cập từ thiết bị khác; không dùng tên Khách #... hoặc SĐT nhập tay để mở lại lịch sử.
- Khung khách hiện giữ thiết kế đơn giản với cuộc hỗ trợ hiện tại; xem tất cả các cuộc đã đóng như một hộp thư khách riêng là phạm vi bổ sung, không đồng nghĩa lưu DB đã bị mất.
- localStorage mới trong đợt này chỉ lưu **tọa độ bong bóng**, không nâng thời hạn nhận diện khách chat lên 30 ngày.

## Đề xuất theo cách vận hành chuyên nghiệp — chưa áp dụng

Nên tách **nhớ phiên khách**, **đóng/lưu trữ cuộc chat** và **xóa dữ liệu**. Không nên tự xóa chỉ vì khách đóng trình duyệt hoặc vài ngày không ghé lại.

Đối chiếu nguồn chính thức: Intercom tách anonymous identifier, session và device identifier; session có TTL mặc định 1 tuần nhưng thời hạn nhận diện khác. Zendesk dùng session token trong bộ nhớ bền vững để tiếp tục sau reload; người đã xác thực có thể tiếp tục trên thiết bị đã xác thực khác. Đây không phải quy định giữ chat chung cho mọi website, và không thể lấy thời hạn cookie làm thời hạn phải xóa DB.

Nguồn:
- https://www.intercom.com/help/en/articles/2361922-intercom-messenger-cookies
- https://developer.zendesk.com/documentation/conversations/messaging-platform/users/intro-to-users/

Phương án phù hợp để chốt cho Homestay (đề xuất sản phẩm, không phải một thời hạn bắt buộc của ngành):

| Đối tượng/quy trình | Đề xuất |
|---|---|
| Nhận lại khách chưa đăng nhập | Token nhớ tối đa 30 ngày trên cùng trình duyệt; nút Quên cuộc trò chuyện trên thiết bị. Đổi thiết bị thì đăng nhập/xác minh hoặc chuyển phiên an toàn |
| Cuộc đã giải quyết, không hoạt động | Đóng/lưu trữ sau 30 ngày; có tin mới thì mở lại theo quy tắc. Lưu trữ không xóa nội dung |
| Chat vãng lai không liên quan đơn/tranh chấp | Giữ 180 ngày từ hoạt động cuối, sau đó mới xét dọn |
| Chat gắn tài khoản/đơn | Giữ 12 tháng sau khi hoàn tất xử lý; không tự xóa nếu còn đơn đang xử lý/khiếu nại |
| Ảnh/tệp | Dùng cùng chính sách của hội thoại để không còn tin mà mất chứng từ đính kèm bất ngờ |

Trước khi bật cần có cấu hình quản trị, thông báo chính sách, loại trừ vụ việc chưa xong, nhật ký và xóa cả metadata/blob theo quy trình có thể kiểm tra. Với máy dùng chung phải có nút quên phiên và quy tắc xóa nhận diện khi đăng xuất. Chưa tạo lịch cron hoặc đổi sessionStorage trong đợt này; chờ người dùng chốt chính sách lưu giữ riêng.

## Cập nhật

```powershell
cd D:\DoAnTotNghiep
git pull origin main
npm.cmd --prefix may-chu run build
npm.cmd --prefix trang-web run build
```

Khởi động lại backend/frontend. homestay-db đã áp dụng migration, không cần chạy lại. DB khác đã có các migration chat trước có thể chạy `npm.cmd run db:chat-bo-cuc` trong may-chu.

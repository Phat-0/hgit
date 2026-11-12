# Trang chủ, tài khoản và chat — cập nhật 12/11/2026

## Đã làm

- Nền chung tím đậm hơn, có lớp sáng bóng; chữ tên trang/hero sáng để giữ độ tương phản.
- Mục quản trị Trang chủ thay phần giữ chỗ bằng trình sửa nội dung: banner đầu trang, giới thiệu, tối đa 8 thẻ ảnh/nội dung có thứ tự, chân trang và bật/tắt bộ lọc/danh sách phòng.
- Mỗi phần có bật/tắt, tiêu đề, nội dung văn bản và tải ảnh tệp JPEG/PNG/WebP tối đa 5 MB. Bấm ảnh ở trang khách xem ảnh nổi.
- Lưu nháp giữ riêng với bản đã xuất bản. Xuất bản lưu biểu mẫu hiện tại và công khai trong một transaction; chống ghi đè khi có hai phiên cùng sửa bằng số phiên bản.
- API công khai không trả khối ẩn hoặc dữ liệu bản nháp. Tắt danh sách phòng chỉ ẩn giao diện Trang chủ, không đóng phòng hay thay đổi quyền/API đặt phòng.
- Bổ sung đăng nhập email/mật khẩu trên trang khách, bên cạnh SMS OTP, để tài khoản tạo sẵn dùng chat được. Không thêm tự đăng ký email trên trang khách. Backend có giới hạn đăng nhập theo IP.

## Xem trang khách

- Máy phát triển theo Vite config: http://localhost:5173/
- Quản trị: http://localhost:5173/quan-tri
- Mục Trang chủ có nút “Xem trang khách” mở `/` trên đúng domain/cổng đang dùng. Địa chỉ đầy đủ được hiện ngay trong trình sửa.
- Chưa tìm thấy domain/hosting triển khai trong repo; không coi URL GitHub hoặc URL API Supabase là website khách. localhost chỉ dùng trên máy chạy frontend. Khi triển khai, URL khách là gốc domain, quản trị thêm `/quan-tri`; cần proxy `/api` tới NestJS và cấu hình SPA fallback.

## Cách dùng Trang chủ

1. Mở Trang chủ trong quản trị; sửa nội dung/tải ảnh, chọn các phần được hiển thị.
2. Thêm thẻ, chuyển Lên/Xuống hoặc xóa thẻ khỏi bản nháp.
3. “Lưu nháp” để giữ bản đang soạn. Khách không thấy thay đổi này.
4. “Xuất bản trang chủ” để công khai nội dung biểu mẫu hiện tại.
5. Bấm “Xem trang khách”, tải lại trang khách nếu trang đã mở từ trước. Không tự đẩy thay đổi CMS lên tab khách đang mở.

Ảnh trong bucket `anh-trang-chu` là ảnh marketing công khai, kể cả ảnh đã tải nhưng chưa gắn vào bản xuất bản. Không dùng cho giấy tờ/thông tin riêng tư. Bỏ ảnh khỏi phần nội dung không xóa tệp vật lý vì bản đã xuất bản có thể còn dùng ảnh đó. Không cấp policy upload cho anon/authenticated; chỉ backend đã kiểm tra quản trị dùng service-role tải lên. Nội dung hiển thị React text, không cho chạy HTML/JavaScript.

Migration `20261112-quan-ly-trang-chu.sql` tạo singleton `cau_hinh_trang_chu` (nháp, bản xuất bản, phiên bản, người sửa, thời điểm) và bucket. RLS bật, thu hồi quyền bảng từ anon/authenticated; công khai qua API chỉ đọc bản xuất bản. Ghi nhật ký khi lưu/xuất bản. Migration đã áp dụng vào homestay-db qua MCP; kiểm tra có 1 dòng cấu hình, RLS bật, bucket đúng giới hạn 5 MB và migration đã được ghi nhận. Không sửa/xóa tài khoản, đơn, combo hoặc giá hiện có.

## Tạo tài khoản có cần Gmail thật không?

**Tài khoản Homestay trong Supabase Auth khác tài khoản Gmail/Google.** Hiện đăng nhập bằng email + mật khẩu của ứng dụng, chưa phải nút Đăng nhập bằng Google. Không nhập mật khẩu Gmail vào ô mật khẩu Homestay.

| Luồng | Cần gì | Có cần mở email nhận mã? |
|---|---|---|
| Quản trị → Nhân viên → tài khoản mới | Họ tên, email, mật khẩu ban đầu 12–128 ký tự, vai trò, ít nhất một chi nhánh; điện thoại không bắt buộc | Không. Backend tạo với `email_confirm: true`, không gửi thư mời |
| Quản trị → Nhân viên → tài khoản đã có | UUID Auth, hồ sơ, vai trò, chi nhánh | Không xác nhận lại email hoặc đổi mật khẩu |
| Tự đăng ký ở màn hình quản trị | Email + mật khẩu | Khi bật Confirm Email phải xác nhận thư; thường là bấm liên kết theo template. Đăng ký không tự có quyền quản trị |
| Đăng nhập bằng email/mật khẩu | Tài khoản đã xác nhận + mật khẩu của ứng dụng | Không phải lấy mã email mỗi lần |
| Khách → SMS OTP | Số điện thoại và mã SMS | Cần SMS, không phải email; phải cấu hình Phone Auth/SMS provider |
| Khách đặt phòng hoặc chat vãng lai | Thông tin đặt phòng/phiên trình duyệt | Không cần tạo tài khoản trước |

Có thể cấp tài khoản thử với email hợp lệ về định dạng, ví dụ `nv01@example.com`, qua luồng quản trị xác nhận sẵn (tùy validation/policy Supabase). Việc này tạo người dùng Homestay, không tạo hộp thư Gmail thật. Không dùng địa chỉ Gmail bịa có thể thuộc người khác. Email không nhận thư sẽ không dùng được các luồng khôi phục mật khẩu/xác nhận qua email; tài khoản thật nên dùng email do chủ tài khoản quản lý. Đợt này không tự tạo tài khoản demo thật hoặc gửi email/SMS.

Nhân viên đăng nhập trang khách bằng tab Email/Mật khẩu để dùng chat. CSKH/Quản lý có quyền hỗ trợ theo chi nhánh; Nhân viên vệ sinh không tự có quyền đọc hỗ trợ. Chỉ Quản trị hệ thống vào dashboard hiện tại. Không cấp quyền Quản trị hệ thống bằng form Nhân viên.

Đăng nhập email không chứng minh sở hữu số điện thoại nhập trong hồ sơ. Chỉ số điện thoại được Supabase xác minh mới dùng để nhận lại đơn vãng lai theo số điện thoại. Không bỏ điều kiện này khi thêm email login.

Tài liệu Auth chính thức: https://supabase.com/docs/reference/javascript/auth-admin-createuser và https://supabase.com/docs/guides/auth/passwords.

## Tin nhắn hiện hoạt động như thế nào?

Giao diện đã theo dạng ứng dụng chat: danh sách hội thoại, vùng tin nhắn, ô soạn, nút gửi và bong bóng góc dưới phải. Tuy nhiên chức năng hiện mới là chat văn bản cơ bản, chưa tương đương Zalo/Messenger.

### Hai tài khoản

1. Đăng nhập, mở bong bóng hoặc mục Tin nhắn.
2. Bấm Sao chép mã liên hệ của tôi, chia sẻ UUID này cho người nhận.
3. Người kia dán vào Mã liên hệ người nhận rồi Bắt đầu trò chuyện.
4. Backend tạo/tìm hội thoại trực tiếp giữa hai tài khoản; kiểm tra thành viên khi đọc/gửi. Quản trị không được đọc mặc định các cuộc chat riêng này.
5. Tin được lưu PostgreSQL; đóng/mở cửa sổ không xóa tin. Tài khoản đăng nhập lại có thể lấy hội thoại từ DB.

Chưa có tìm người theo SĐT, danh bạ, lời mời kết bạn, nhóm hoặc tên người nhận ở mức tiện dụng như Zalo.

### Khách chưa đăng nhập và chat hỗ trợ

- Bấm Hỗ trợ đặt phòng để tạo/mở cuộc chat hỗ trợ của chi nhánh đang chọn. Nếu không chọn chi nhánh, chat hỗ trợ chung được quản trị hệ thống xử lý.
- Backend cấp token vãng lai ngẫu nhiên; DB lưu hash, trình duyệt lưu token ở sessionStorage theo chi nhánh. Token là quyền truy cập phiên, không phải tài khoản được xác minh.
- CSKH/Quản lý chỉ xem hỗ trợ của chi nhánh đang được phân công; Quản trị hệ thống xem hỗ trợ toàn hệ thống. Nhân viên vệ sinh không được cấp quyền hỗ trợ mặc định.
- Trong cùng phiên trình duyệt, sau đăng nhập bấm lại Hỗ trợ đặt phòng để gắn hội thoại guest hợp lệ vào tài khoản. Không cho gắn nếu hội thoại đã thuộc người khác.
- Mất token/đóng phiên trình duyệt trước khi gắn tài khoản có thể mất cách truy cập chat cũ; không tự khôi phục guest chat trên máy khác chỉ bằng tên/SĐT nhập tay.

### Gửi/nhận và đồng bộ

- Gửi nội dung tới API, backend xác minh quyền, độ dài và giới hạn tần suất; lưu tin vào DB. Mã yêu cầu phía khách giúp thử lại mà không nhân đôi tin.
- Khi cửa sổ mở, lấy tin lại mỗi 5 giây; danh sách hội thoại mỗi 10 giây. Khi tab bị ẩn tạm dừng polling, đóng cửa sổ không polling nền. Người nhận có thể chờ đến vòng polling tiếp theo mới thấy tin.
- Một component chat được giữ khi chuyển menu quản trị nên không mất hội thoại đang chọn hoặc mở trùng cửa sổ. Ở mục Tin nhắn dùng hộp thư đầy trang; nút bong bóng tập trung ô nhập.
- Giao diện hiện lấy tối đa 100 hội thoại và 60 tin mới nhất của cuộc đang chọn. Backend có tham số phân trang tin cũ, nhưng giao diện chưa có tải thêm tin cũ.
- Chưa có WebSocket/Supabase Realtime, badge chưa đọc, đã xem, đang nhập, online/offline, đính kèm, thoại/video, thông báo đẩy hoặc mã hóa đầu cuối. “Lưu ở DB/kiểm tra quyền” không đồng nghĩa mã hóa đầu cuối.

Nâng tiếp theo nên là: realtime có phân quyền → chưa đọc/đã xem và phân trang lịch sử → tìm người nhận an toàn và phân công hỗ trợ → ảnh/tệp → push. Chưa triển khai các tính năng này trong đợt chỉnh CMS.

## Kiểm tra và cập nhật

- Build backend/frontend, 65 unit test backend và lint: đạt.
- PostgreSQL cục bộ: nghiệp vụ đặt phòng/chat/nhân viên cũ đạt; bổ sung nháp tách xuất bản, ẩn dữ liệu public, quyền quản trị, xung đột phiên, URL/tệp ảnh không hợp lệ, migration lặp giữ cấu hình: đạt.
- DOM/API giả lập: mở trình sửa, lưu nháp, xuất bản, link `/`, render nội dung công khai dạng text, đăng nhập email, các luồng đặt phòng/OTP/chat và giữ chat xuyên menu: đạt.
- Supabase sau migration: RLS và Storage đúng; không có policy ghi Storage cho người dùng trực tiếp. Advisor còn cảnh báo extension btree_gist trong public và leaked-password protection tắt như trước; không tự đổi hai cấu hình ngoài phạm vi này. INFO cấu hình Trang chủ chưa có policy là chủ đích vì truy cập qua backend và public endpoint đã lọc.
- Chưa kiểm thử ảnh chụp browser/hosting thật hoặc upload qua ứng dụng trên Windows; không coi DOM là kiểm thử bố cục pixel. Không tạo tài khoản thật để thử đăng nhập.

```powershell
cd D:\DoAnTotNghiep
git pull origin main
npm.cmd --prefix may-chu run build
npm.cmd --prefix trang-web run build
```

Khởi động lại backend/frontend đang chạy. Với project Supabase homestay-db hiện tại migration đã áp dụng; không cần chạy lại. Với DB khác chưa đồng bộ, chạy `cd may-chu` rồi `npm.cmd run db:trang-chu` sau các migration cũ. Script dùng CA hiện có, transaction và có thể chạy lại mà không ghi đè cấu hình.

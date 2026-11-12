# Chat gọn, ảnh/tệp, câu trả lời và chuông đơn — 12/11/2026

## Giao diện và cách dùng

### Khách

- Chỉ mở khung hỗ trợ nhỏ: tên HomeStay, nội dung và ô soạn. Không có cột danh bạ/hội thoại lớn hoặc nhãn khách vãng lai/quản trị. Khi mở khung tự nối cuộc hỗ trợ của chi nhánh đang chọn.
- Bong bóng chỉ là biểu tượng kèm số chưa đọc. Bấm để thu gọn/mở; nút × nhỏ cạnh bong bóng ẩn cả biểu tượng cho phiên trình duyệt này. Bấm **Hỗ trợ** trên thanh điều hướng trang khách để mở lại.
- Đổi chi nhánh dùng phiên hỗ trợ tương ứng; backend không nhận token hỗ trợ của chi nhánh khác.

### Quản trị

- Vào Tin nhắn để dùng hộp thư đầy trang. Cột hội thoại kéo lên mép trên workspace, tên trang nằm trên khu vực nội dung bên phải. Khung kéo hết chiều cao đến đáy, không giữ khoảng trống dưới; danh sách và tin có vùng cuộn riêng.
- Bong bóng xuyên các trang vẫn chỉ là biểu tượng; có thể ẩn. Vào lại mục Tin nhắn sẽ hiện lại.
- Kéo gần đầu khung tin để tự tải lịch sử, có khóa tránh gọi trùng và giữ vị trí đọc sau khi chèn tin cũ. Không cần nút Tải tin trước.
- Đang đọc phía trên mà có tin mới: hiện **Tin mới ↓**; bấm mới về cuối. Không ép cuộn xuống trong khi đọc lịch sử.

## Ảnh và tệp

- Nút **＋** cạnh ô nhập chọn một ảnh hoặc tệp cho mỗi tin; cũng có thể kéo thả vào khung. Có xem trước tên/dung lượng, thumbnail ảnh và nút bỏ trước khi gửi.
- Có trạng thái đang gửi, lỗi và thử lại. Cùng mã yêu cầu không nhân đôi tệp/tin khi gửi lại. Không ghi đè tệp cũ; nếu DB rollback trước COMMIT thì dọn tệp mới vừa tải.
- Ảnh JPG/JPEG, PNG, WebP tối đa **10 MB**. PDF, TXT, CSV, DOCX, XLSX tối đa **20 MB**. Backend kiểm tra dung lượng thật, loại tệp/chữ ký, phần mở rộng; văn bản phải là UTF-8 không chứa NUL; tên tệp được bỏ đường dẫn/ký tự điều khiển. Không nhận SVG/HTML/tệp thực thi.
- Giới hạn 20 tệp/200 MB cho mỗi cuộc trong một giờ và giới hạn endpoint tải lên theo IP. Đây là kiểm tra định dạng/giới hạn sử dụng, chưa có dịch vụ quét virus hoặc phân tích sâu nội dung Office/PDF.
- Ảnh bấm phóng lớn bằng trình xem ảnh hiện có. Tài liệu là liên kết tải xuống, không nhúng HTML/tài liệu vào trang.
- Nút **▧** mở kho ảnh; **▤** mở kho tệp. Tìm theo tên, có tải thêm và làm mới.
- Kho `tep-chat` ở chế độ **riêng tư**, không có policy truy cập trực tiếp cho người dùng. Mọi lần lấy lịch sử/kho đều kiểm tra quyền hội thoại ở backend trước khi ký liên kết. URL có hạn 15 phút; bộ nhớ đệm URL tối đa 10 phút, không bỏ bước kiểm tra quyền. Liên kết đã cấp có thể tiếp tục dùng đến lúc hết hạn nên không chia sẻ ra ngoài người nhận dự kiến.
- Dùng `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` ở máy chủ như các chức năng quản lý ảnh hiện có; không đưa key vào trình duyệt hoặc GitHub.

## Tìm tin

- Kính lúp trong header cuộc chat mở tìm nội dung/tên tệp, ít nhất 2 ký tự, có tải thêm.
- Chọn kết quả tải các tin đến đúng mốc trong cuộc đó, đưa đến tin tìm thấy. Chế độ này tạm dừng gộp tin mới vào đoạn lịch sử; **Về tin mới ↓** trở lại bình thường.
- API kiểm tra mốc thuộc đúng cuộc chat, không cho dùng UUID tin ở cuộc khác. Đoạn đang xem kết quả không tự xóa badge của các tin mới chưa xem.

## Câu trả lời soạn sẵn

- Nhân viên hỗ trợ mở nút **≡** cạnh ô nhập, tìm theo tiêu đề/nhóm/nội dung, **bấm mẫu để gửi ngay**.
- Quản trị có thể mở nút **⚙** ở đầu cột hội thoại để quản lý mẫu, kể cả chưa chọn cuộc nào; trong bảng mẫu cũng có nút Quản lý.
- Đầy đủ tạo/sửa/xóa, nhóm, chi nhánh riêng hoặc dùng chung, bật/tắt. Xóa mẫu không làm thay đổi các tin đã gửi. Các thao tác quản lý ghi nhật ký và chỉ quản trị hệ thống đang hoạt động được dùng.
- Mẫu hỗ trợ `{{ten_khach}}` và `{{chi_nhanh}}`. Nếu thiếu dữ liệu hoặc còn biến khác như `{{ma_dat_phong}}`, đưa vào ô soạn và nhắc kiểm tra, không tự suy đoán rồi gửi.
- Có 3 mẫu chung ban đầu: chào, hỏi nhu cầu, chờ nhân viên kiểm tra. Không tự gửi các mẫu này khi chưa bấm.

## Thông báo đơn

- Bỏ mục Thông báo khỏi sidebar. Chuông phía trên hiển thị số chưa đọc và bảng gồm Tất cả/Đơn mới/Đơn hủy, thời gian, Đọc tất cả và tải thêm.
- Bấm thông báo đánh dấu đã đọc cho chính người nhận rồi mở chi tiết đúng đơn; sửa/xóa đơn vẫn dùng các quyền và xác nhận hiện có.
- Sự kiện được ghi vào bảng `thong_bao` qua trigger trong cùng transaction với đơn: INSERT tạo Đơn mới; chuyển sang `Đã hủy` tạo Đơn hủy. Cập nhật lại cùng trạng thái hủy không tạo thêm; đổi trường khác không tạo sự kiện hủy.
- Người nhận là quản trị hệ thống toàn cục đang hoạt động và quản lý đang được phân công chi nhánh. Dashboard hiện vẫn dành cho quản trị hệ thống. Không phát lại thông báo giả cho các đơn lịch sử khi chạy migration.
- Chuông lấy lại mỗi 10 giây khi tab hiển thị. Chat vẫn lấy tin khoảng 5 giây, danh sách/badge 10 giây; chưa chuyển sang WebSocket/push.

## Database/MCP

- `20261112-chat-tep-mau-thong-bao.sql`: bảng metadata tệp, bảng câu mẫu, bucket riêng và trigger; không xóa tin/đơn/trigger nghiệp vụ cũ. Trigger mới chỉ tạo nếu chưa có; hàm dùng search_path cố định.
- `20261112-quyen-trigger-thong-bao.sql`: thu hồi quyền gọi hàm trigger trực tiếp của anon/authenticated/PUBLIC để tránh quyền mặc định Supabase. Trigger nội bộ vẫn hoạt động.
- Cả hai đã áp dụng trên homestay-db qua MCP. Đã đối chiếu trước/sau: 3 tin, 1 đơn, 0 thông báo cũ được giữ; tạo 3 mẫu khởi đầu, bucket private, trigger đúng. Không gửi tin thử hoặc tạo đơn/tài khoản thử trên DB thật.
- RLS cả hai bảng mới bật; quyền gọi hàm trigger của anon/authenticated đã kiểm tra là false. Security advisor không còn cảnh báo mới về hàm. Hai cảnh báo có sẵn còn lại: [btree_gist ở public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public), [leaked password protection đang tắt](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). INFO thiếu policy ở bảng backend-only là chủ đích, không mở quyền công khai để tắt INFO.
- Lần migration đầu hết hạn xác nhận nên chưa áp dụng; lần thử sau đã thành công, sau đó thêm migration quyền hàm. Không coi lần hết hạn là thành công.

## Kiểm thử và giới hạn

- Build frontend/backend, lint không cảnh báo và **72 unit test**: đạt.
- PostgreSQL cục bộ: các ca giá/đặt phòng/chat/nhân viên/Trang chủ cũ tiếp tục đạt; bổ sung ACL tệp, URL private, chống gửi lặp, dọn tệp mới khi rollback, tìm tin/ngữ cảnh, thư viện tệp, CRUD mẫu/quyền/biến thiếu, chế độ khách, trigger mới/hủy không lặp và đánh dấu đúng chủ.
- Bộ DOM chạy lại được: khách gọn, icon/ẩn/mở lại, tự tải lịch sử giữ vị trí và không gọi lặp, gửi/xem tệp, tìm tin, mẫu gửi ngay/biến thiếu/quản lý và chuông mở chi tiết.
- Chạy: `npm.cmd ci` trong kiem-thu, cài dependencies frontend/backend, build backend rồi `npm.cmd test` và `npm.cmd run test:ui` trong kiem-thu. Storage và API ở kiểm thử là giả lập, PostgreSQL dùng PGlite.
- Chưa kiểm tra bằng ảnh chụp browser trên máy Windows/hosting hoặc upload bằng service key thật từ ứng dụng; các MCP trình duyệt trước đó báo hết phiên. Không coi DOM là kiểm chứng pixel/độ mượt thực trên mọi thiết bị.
- AI **chưa tích hợp**. Xem phương án riêng; không có gọi model, không gửi hội thoại/tệp sang dịch vụ AI và không có phản hồi AI tự động mới.

## Cập nhật trên Windows

```powershell
cd D:\DoAnTotNghiep
git pull origin main
npm.cmd --prefix may-chu run build
npm.cmd --prefix trang-web run build
```

Khởi động lại backend/frontend. homestay-db đã có hai migration, không cần chạy lại. Với DB khác đã có các migration chat trước, chạy `npm.cmd run db:chat-tien-ich` trong may-chu (script dùng CA hiện có và áp dụng cả hai migration). Nếu muốn chạy bộ kiểm thử UI mới, chạy `npm.cmd ci` trong kiem-thu trước vì có thêm jsdom.

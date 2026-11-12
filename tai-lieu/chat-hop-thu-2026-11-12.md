# Hộp thư, tìm người và số chưa đọc — 12/11/2026

## Thay đổi

- Đồng nhất hộp thư đầy trang và bong bóng chat: nền trắng/tím, ảnh đại diện chữ cái, cột hội thoại bên trái, nội dung bên phải, ô soạn cố định phía dưới; bố cục thu gọn trên điện thoại.
- Mỗi hội thoại có tên, xem trước tin cuối, giờ gửi/ngày của tin gần nhất, chi nhánh nếu có và số tin chưa đọc chính xác (không giới hạn nhãn ở 99+). Tin chưa đọc được nhấn đậm.
- Bong bóng có tổng số chưa đọc trên tất cả hội thoại được phép, kể cả khi cửa sổ đóng. Bộ lọc danh sách không làm giảm tổng này.
- Danh sách lấy từng 40 cuộc, có Tải thêm hội thoại để xem hết; không còn dừng cứng tại 100. Tin lấy 60 mỗi lần và có Tải tin trước.
- Khách thấy tên đối thoại/“Hỗ trợ HomeStay” và “Bạn” ở tin của mình. API tin nhắn không trả nhãn loại người gửi để frontend hiển thị; không dùng “Khách vãng lai” hoặc vai trò quản trị làm tên hỗ trợ phía khách.
- Khi chuyển từ phiên chưa đăng nhập sang tài khoản trong cùng trình duyệt qua luồng gắn hội thoại, tin cũ vẫn thuộc phía “Bạn”, mốc đọc của phiên được chuyển tiếp. Không cho người khác nhận hội thoại đã có chủ.

## Tìm kiếm như thế nào?

### Tất cả

Ô “Tìm cuộc trò chuyện” tìm trên toàn bộ hội thoại được phép theo tên người đối thoại hoặc tên chi nhánh; hỗ trợ tiếng Việt không dấu, ví dụ `tran binh` tìm được `Trần Bình`. Tin mới nhất được xếp lên trên.

“Tất cả” không có nghĩa quản trị được đọc mọi cuộc chat riêng của người khác. Quyền chat riêng chỉ dành cho thành viên; chat hỗ trợ giữ phạm vi chi nhánh hiện có.

### Nhắn mới

- Người đã đăng nhập chọn Nhắn mới, gõ ít nhất 2 ký tự, chọn kết quả để bắt đầu/mở lại hội thoại. Không phải sao chép UUID bằng tay nữa; API cũ vẫn tương thích với mã người nhận.
- Tìm tên không dấu trong người từng liên hệ và các tài khoản hỗ trợ đang hoạt động (CSKH/Quản lý/Quản trị). Không mở danh bạ toàn bộ khách hàng theo tên.
- Có thể tìm người khác bằng **SĐT đầy đủ**, hỗ trợ chuẩn hóa 0/+84. Đây là tìm khớp số, không tìm bằng vài chữ số cuối. Không tìm thấy nếu hồ sơ không có số phù hợp.
- Kết quả chỉ có mã dùng nội bộ để mở chat và tên hiển thị; không trả email, số điện thoại đầy đủ, vai trò hoặc thông tin đơn đặt phòng.
- Tối đa 20 kết quả/lần; debounce ô nhập 350 ms, giới hạn tìm người 20 lần/phút theo IP. Không hỗ trợ tìm người khi chưa đăng nhập; khách vẫn dùng Hỗ trợ đặt phòng.

## Số chưa đọc hoạt động

Mỗi tài khoản hoặc phiên khách có mốc đọc riêng theo cuộc chat. Mốc gồm thời điểm + UUID tin cuối đã xem để phân biệt cả những tin có cùng thời điểm. Không dùng một cờ “đã đọc” chung cho tất cả người tham gia.

- Chỉ tính tin do phía khác gửi sau mốc đọc; không tính tin mình gửi.
- GET danh sách/GET tin không tự đánh dấu đọc.
- Frontend gửi mốc khi cuộc chat mở, tab đang hiển thị và người dùng xem đến gần cuối khung tin. Đang đọc tin cũ hoặc đóng cửa sổ không tự xóa badge.
- Endpoint xác minh quyền hội thoại và tin có thuộc đúng hội thoại; không nhận UUID tùy ý ở cuộc khác. Mốc chỉ tiến, không lùi khi request cũ tới chậm.
- Đánh dấu một cuộc không xóa số chưa đọc của cuộc khác hoặc tài khoản khác.
- Mốc tài khoản lưu DB nên dùng lại khi đăng nhập trên thiết bị khác; phiên khách dùng mã băm phiên, không dùng số điện thoại tự nhập để chứng minh quyền đọc.
- Các tin cũ chưa từng có mốc trong tính năng mới có thể xuất hiện là chưa đọc. Không tự tạo mốc giả cho người dùng.

Hiện vẫn là polling: danh sách/tổng badge khoảng **10 giây**, cuộc đang mở khoảng **5 giây**; tạm dừng khi tab trình duyệt ẩn và lấy lại khi quay về. Chưa phải WebSocket/realtime tức thời, chưa có dấu “người kia đã xem”, đang nhập, online, gọi điện, nhóm hoặc tệp. Số chưa đọc của chính mình không đồng nghĩa trạng thái đã xem của người nhận đã được triển khai.

## Backend và Supabase

- `GET /api/khach/chat?tim=...&bo_qua=...`: danh sách có phân trang, thời điểm tin cuối, số chưa đọc từng cuộc và tổng chưa đọc trên các cuộc được phép.
- `GET /api/khach/chat/nguoi-dung?tim=...`: tìm người, yêu cầu đăng nhập.
- `POST /api/khach/chat/:id/da-doc`: `{ "tin_nhan_id": "UUID" }`, tự xác định người đọc qua JWT/phiên khách.
- `GET /api/khach/chat/:id/tin-nhan?truoc=...`: tải tin trước theo mốc (thời gian, id).
- Migration `20261112-chat-tim-kiem-va-chua-doc.sql`: thêm `trang_thai_doc_chat`, 2 khóa ngoại và chỉ mục tin mới. RLS bật, thu hồi quyền bảng khỏi anon/authenticated, truy cập qua backend đã kiểm tra quyền. Không thay đổi/xóa nội dung tin hoặc hội thoại cũ.
- Đã áp dụng migration vào homestay-db qua MCP. Trước/sau đều giữ 3 tin và 2 hội thoại hiện có; RLS bật và đủ 2 khóa ngoại. Không tạo tài khoản hoặc gửi tin thử trên DB thật.
- Security advisor: INFO chưa có policy cho bảng mốc đọc là chủ đích backend-only. Hai cảnh báo cũ không đổi: [btree_gist ở public](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public), [kiểm tra mật khẩu bị lộ đang tắt](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Không tự đổi cấu hình Auth/di chuyển extension ngoài phạm vi.

## Kiểm thử

- Build backend/frontend, lint backend và 65 unit test: đạt.
- PostgreSQL cục bộ: đếm chưa đọc, loại trừ tin tự gửi, GET không đánh dấu, không lùi mốc, chặn IDOR/tin ở cuộc khác, quyền chat riêng, gắn phiên khách giữ mốc và tác giả, tìm tên không dấu/SĐT không lộ danh bạ, thời điểm tin cuối, tải >40 hội thoại và >60 tin: đạt; các ca đặt phòng/nhân viên/Trang chủ trước đó tiếp tục đạt.
- DOM + API giả lập: badge khi đóng, danh sách/giờ, nhãn thân thiện, đánh dấu khi mở, tìm người/chọn hội thoại, tải tin cũ và nội dung chống HTML: đạt.
- MCP html2 đã thử lại trang quản trị nhưng vẫn “Session terminated”; chưa có ảnh chụp kiểm chứng bố cục/đa thiết bị thực hoặc thử chat giữa tài khoản thật trên hosting. Không coi polling là realtime.

## Cập nhật máy Windows

```powershell
cd D:\DoAnTotNghiep
git pull origin main
npm.cmd --prefix may-chu run build
npm.cmd --prefix trang-web run build
```

Khởi động lại backend và frontend. DB homestay-db đã áp dụng migration, không cần chạy lại. Với DB khác đã có migration chat cũ, chạy `npm.cmd run db:chat-hop-thu` trong may-chu; script dùng CA hiện có và transaction, không xóa tin.

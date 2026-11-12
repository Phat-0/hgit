# Nhân viên, bố cục và chat — 12/11/2026

## Phạm vi đã cập nhật

- Nền tím bóng đậm dùng chung trang khách, đăng nhập quản trị và toàn bộ qt-layout; giữ các bảng/thẻ trắng để đọc rõ.
- Tên trang quản trị lên cùng hàng với hai nút tiện ích. Tên cuộn theo nội dung; chỉ cụm hai nút cố định góc trên phải. Dành khoảng trống bên phải, cho tìm kiếm xuống hàng khi thiếu chỗ và giữ cả hai nút trên điện thoại.
- Bỏ tiêu đề Combo trùng ở hàng dưới; giữ bộ lọc và nút tạo mới.
- Trang Nhân viên có tìm kiếm, lọc chi nhánh, phân trang, chi tiết, tạo, sửa và xác nhận gỡ. Bảng cuộn ngang riêng, biểu mẫu hai cột và co về một cột trên màn hình nhỏ.
- Một component chat tồn tại xuyên các mục quản trị. Bong bóng cố định góc dưới phải; vào Tin nhắn chuyển sang hộp thư đầy trang. Bấm bong bóng khi đang ở Tin nhắn đưa con trỏ vào ô soạn, không tạo cửa sổ thứ hai. Trang khách tiếp tục có bong bóng chat.

## Nhân viên và phân quyền

API `/api/quan-tri/nhan-vien`: GET danh sách; GET `/:id` chi tiết; POST tạo; PUT `/:id` cập nhật; DELETE `/:id` thu hồi quyền. Mọi API kiểm tra JWT và quyền Quản trị hệ thống đang hoạt động ở backend.

Tạo mới chọn một trong hai cách:

1. **Tài khoản mới**: email, mật khẩu ban đầu ít nhất 12 ký tự, họ tên, điện thoại, vai trò và ít nhất một chi nhánh. Backend dùng Supabase Auth Admin API; khóa service role chỉ ở máy chủ. Tài khoản do quản trị cấp được xác nhận email sẵn, không gửi thư mời. Quản trị cần chuyển thông tin đăng nhập riêng cho nhân viên.
2. **Tài khoản có sẵn**: nhập UUID tài khoản Supabase Auth; phân công vào các chi nhánh. Không đổi email/mật khẩu của tài khoản cũ.

Chỉ cho chọn Quản lý, Chăm sóc khách hàng hoặc Nhân viên vệ sinh. Một vai trò áp dụng cho các chi nhánh đã chọn; khi sửa thay thế phân công nhân viên cũ bằng danh sách mới, vẫn giữ lịch sử thu hồi. Không cho cấp quyền Quản trị hệ thống, sửa/gỡ tài khoản quản trị hoặc tự sửa tài khoản đang đăng nhập tại trang này.

**Gỡ nhân viên là thu hồi quyền công việc**, không xóa `auth.users`/`nguoi_dung`. Giữ đơn đặt phòng, cuộc trò chuyện, khóa ngoại và nhật ký. Hồ sơ đã gỡ còn trong danh sách và có thể sửa để phân công lại. Tạm khóa áp dụng toàn bộ tài khoản, khác với gỡ quyền nhân viên.

Dùng bảng có sẵn `nguoi_dung`, `nguoi_dung_vai_tro`, `vai_tro`, `homestay`, `nhat_ky_he_thong`; không cần migration mới. Tên cột điện thoại hiện tại là `so_dien_thoai`. Lưu phân công trong transaction, khóa theo tài khoản, ghi nhật ký, bù trừ tài khoản Auth vừa tạo nếu lưu DB thất bại. Nếu lỗi mạng làm chưa rõ COMMIT đã thành công, báo quản trị kiểm tra trước khi thử lại và không tự xóa tài khoản.

Máy chủ cần `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` và chứng chỉ CA như cấu hình hiện có. Không thêm những khóa này vào frontend/GitHub. Chỉ Quản trị hệ thống vào dashboard quản trị hiện tại; tạo vai trò nhân viên không tự cấp quyền vào toàn bộ dashboard. CSKH/Quản lý dùng chat hỗ trợ theo phạm vi chi nhánh; Nhân viên vệ sinh không mặc nhiên đọc chat hỗ trợ.

## Cách phần Tin nhắn hoạt động

- **Khách chưa đăng nhập** bấm Hỗ trợ đặt phòng: backend cấp mã phiên ngẫu nhiên, chỉ lưu mã băm trong DB; trình duyệt giữ mã phiên trong sessionStorage theo chi nhánh. Ai có mã phiên có thể dùng phiên đó nên không chia sẻ mã. Mất phiên trình duyệt thì khách không có bảo đảm khôi phục cuộc chat vãng lai.
- **Tài khoản đã đăng nhập** dùng JWT để lấy các hội thoại được phép. Có thể chia sẻ mã liên hệ (UUID) để bắt đầu chat trực tiếp giữa hai tài khoản.
- **Chat hỗ trợ** được CSKH/Quản lý xem theo chi nhánh phân công; quản trị toàn hệ thống xem các chat hỗ trợ. Chat riêng giữa hai tài khoản chỉ thành viên được xem; quản trị không có quyền đọc mặc định.
- Tin gửi lưu vào DB; có mã chống gửi lặp khi thử lại, giới hạn tần suất và kiểm tra quyền ở backend. Nội dung hiển thị dạng văn bản để không chạy HTML/script.
- Khi cửa sổ/hộp thư mở: tin nhắn được lấy lại mỗi **5 giây**, danh sách hội thoại mỗi **10 giây**; tạm dừng polling khi tab trình duyệt bị ẩn. Đóng cửa sổ không polling nền. Đây chưa phải WebSocket/Supabase Realtime.
- Chưa có số tin chưa đọc, trạng thái đã xem/đang nhập, đính kèm, thông báo đẩy hoặc mã hóa đầu cuối. Không gắn nhãn “realtime” hay “đã đọc” khi chưa triển khai.

## MCP và Supabase đã kiểm tra

| Kết nối | Kết quả quan sát |
|---|---|
| GitHub Phat-0/hgit | Đọc/cập nhật mã nguồn qua GitHub |
| Tập tin dự án | Liệt kê được D:\DoAnTotNghiep; chỉ đọc máy Windows |
| Hỗ trợ phân tích think2 | Phản hồi thành công |
| Supabase | Project homestay-db ACTIVE_HEALTHY; đọc được schema, vai trò, migration và security advisors |
| html | Lỗi SSE 429 |
| html2 | Session terminated |
| mcpduan | Tunnel-client không được nhìn thấy trong 300 giây |

Supabase đã ghi nhận migration `20261108-trang-khach-va-chat` cùng ba migration đồng bộ trước đó. Lần này chỉ chạy truy vấn đọc trên project thật, không tạo nhân viên thử hoặc ghi dữ liệu thật. Kết nối MCP qua chat không thay thế đăng nhập người dùng của website.

Security advisor báo nhiều bảng bật RLS nhưng chưa có policy (INFO): kiến trúc hiện truy cập qua backend pg và kiểm tra quyền; không tự mở policy public để tắt cảnh báo. Hai cảnh báo cần xem riêng: extension btree_gist nằm public và kiểm tra mật khẩu bị lộ đang tắt. Chưa tự đổi cấu hình hoặc di chuyển extension vì liên quan ràng buộc chống trùng lịch.

Tham khảo: https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public và https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

## Xác minh và giới hạn

- Build frontend/backend, lint backend: đạt.
- 65 unit test backend: đạt; sửa kỳ vọng khởi tạo cũ `Hello World!` cho đúng thông báo health hiện hành.
- PostgreSQL cục bộ: các ca migration/đặt phòng/chat cũ đạt; thêm CRUD nhân viên, bảo vệ quản trị, phân công, thu hồi giữ lịch sử/khóa ngoại, nhật ký, rollback và bù trừ Auth (Auth giả lập, không gửi email thật).
- DOM với API giả lập: tạo/sửa/chi tiết/gỡ nhân viên, chỉ một tiêu đề và một component chat; hội thoại giữ khi chuyển menu/inbox: đạt. DOM không chứng minh bố cục pixel hoặc cuộn trên thiết bị thật.
- Chưa kiểm thử bằng ảnh chụp trình duyệt vì MCP browser lỗi; chưa chạy luồng tạo tài khoản thật/đăng nhập nhân viên thật hoặc e2e trên hosting. E2E khởi tạo cũ còn kỳ vọng Hello World, chưa sửa/chạy trong phạm vi này.
- Chưa thể kết luận toàn bộ đồ án đã được rà soát hết: báo cáo, cài đặt, hồ sơ và một số nội dung Tổng quan vẫn còn giữ chỗ/minh họa.

## Cập nhật máy Windows

```powershell
cd D:\DoAnTotNghiep
git pull origin main
cd may-chu
npm.cmd ci
npm.cmd run build
# Khởi động lại máy chủ theo cách đang dùng
cd ..\trang-web
npm.cmd ci
npm.cmd run build
```

Không cần chạy SQL/migration mới cho thay đổi này. Không ghi đè file .env hiện có.

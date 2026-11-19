# Tóm tắt khách và lỗi thư viện máy chủ — 19/11/2026

## Máy chủ

Đã xác minh `iceberg-js@0.8.1/dist/index.mjs` thiếu trên Windows, trong khi package.json khai báo ESM trỏ tới file này. Gói npm gốc có file; đã khôi phục đúng file từ tarball npm (đối chiếu SHA-256 `15ed0530ab67a7bfb541eb2cea764023c159312b7f1888e42c029840fafd381d`). Không đổi import sang CJS hoặc viết lại mã nhà cung cấp. File khôi phục thuộc node_modules, không đưa vào Git.

Cố định `@supabase/supabase-js` ở phiên bản 2.119.0 và tái tạo package-lock đầy đủ (lock cũ thiếu các dependency backend đã thêm). Cài sạch để tái lập bộ phiên bản bằng:

```powershell
cd D:\DoAnTotNghiep\may-chu
npm ci --ignore-scripts
npm run kiem-tra:thu-vien
npm run start:dev
```

Dừng server trước khi cài sạch. Nếu file lại bị mất, kiểm tra lịch sử cách ly của phần mềm bảo vệ và lỗi giải nén/cài đặt; không tắt bảo vệ toàn bộ hoặc đổi mã thư viện để che lỗi. Không cần nâng Node để xử lý riêng lỗi thiếu file này.

Sau khôi phục đã kiểm tra server đang chạy: `/api/suc-khoe/co-so-du-lieu` trả 200, kết nối DB đạt; route tóm tắt mới trả 401 khi thiếu đăng nhập.

## Cách dùng

**Khách hàng → chọn tài khoản khách → Tóm tắt AI**. Khung gọn có ba nhóm:

- **Phòng thường đặt:** tính trực tiếp từ đơn xác nhận/nhận/trả phòng, nhóm theo phòng và chi nhánh; không nhờ AI suy đoán.
- **Khách thường hỏi:** AI gom chủ đề trong lời khách.
- **Yêu cầu của khách:** các yêu cầu lưu trú khách đã nói; có mục Nguồn để xem trích dẫn.

Bấm **Tóm tắt chat** lần đầu, **Cập nhật** khi muốn đọc tin mới. Kết quả cũ được tải lại khi mở, không gọi Gemini mỗi lần mở.

Hồ sơ cần lưu xác nhận khách đồng ý phân tích AI và nguồn xác nhận trước khi gửi chat đến mô hình. Chỉ áp dụng cho tài khoản khách đã liên kết đúng hội thoại; không tự ghép tài khoản theo tên/số điện thoại. Tin trực tiếp giữa tài khoản/nhân viên, lời nhân viên và lời AI không được dùng để suy ra yêu cầu của khách.

## Dữ liệu và giới hạn

- Dùng bảng **`phan_tich_ai` hiện có**, không thêm bảng/schema. Kết quả mang loại `tom_tat_khach`; lưu trạng thái đang tạo/xong/lỗi trong JSON, số tin, kết quả và nguồn. Cột trạng thái duyệt mặc định vẫn giữ Chờ kiểm tra vì đây là dữ liệu AI tham khảo, không tự cập nhật hồ sơ. Không thêm quy trình duyệt phức tạp vào giao diện.
- Đọc tối đa 80 tin văn bản gần nhất của khách trong hội thoại hỗ trợ, tối đa 24.000 ký tự; ẩn email/số điện thoại trước khi gửi. Không đọc ảnh, tệp, chat riêng hoặc chat khách khác. Không gửi danh tính/số đơn/giá trị đơn cho mô hình để tính thống kê phòng.
- Mô hình dùng GEMINI_MODEL và khóa máy chủ hiện có; gọi REST JSON không có tool. Mỗi nhóm tối đa 5 mục. Backend kiểm tra định dạng, giới hạn và trích dẫn phải khớp nguyên văn tin đã gửi; bỏ phản hồi bị cắt, nguồn giả hoặc lỗi.
- Chỉ quản trị hệ thống có quyền; kiểm tra lại đồng ý và chủ hội thoại trước khi lưu. Không tự sửa sở thích/ngân sách/tài khoản/đơn/thanh toán. Chỉ bản tóm tắt và nhật ký thao tác được lưu; không ghi khóa hoặc phản hồi lỗi thô.
- Mỗi tài khoản tối đa một yêu cầu/phút; toàn hệ thống tối đa 100 yêu cầu tóm tắt/ngày theo giờ Việt Nam, gồm cả lượt lỗi đã gọi mô hình. Đây là giới hạn của tính năng tóm tắt, tách bộ đếm chatbot; cả hai vẫn dùng quota của nhà cung cấp. Chỉ gọi khi quản trị bấm nút, không chạy nền.

## Kiểm thử

- Import ESM Supabase và build backend/frontend.
- Unit: nguồn giả, trường ngoài phạm vi, phản hồi bị cắt, lỗi quota, bảo vệ khóa, bỏ thought, không có tool.
- PostgreSQL giả lập: phân quyền/đồng ý, đúng chủ hội thoại, loại chat riêng/nhân viên/khách khác, che thông tin liên hệ, cache/chặn lặp, không tự sửa sở thích, rút đồng ý trong lúc chạy.
- Playwright: mở/tạo/xem nguồn/đóng tóm tắt, không tràn ngang ở 1440/768/390/360px. Kết quả Gemini được giả lập trong kiểm thử, không gửi chat khách thật để kiểm thử mô hình.

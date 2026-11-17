# Chatbot tư vấn khách hàng

## Phạm vi đã triển khai

Theo đề cương: Gemini 2.5 Flash + Function Calling, dữ liệu nghiệp vụ qua máy chủ, nhân viên tiếp quản và tóm tắt nhu cầu thành bản nháp. Không tự tạo/chỉnh/hủy đơn, giữ phòng, xác nhận thanh toán hoặc thay trạng thái phòng. Không gửi tin nhắn riêng giữa tài khoản, tệp, hồ sơ hoặc đơn của khách sang Gemini.

Quản trị hệ thống có mục **Chatbot AI**: thiết lập, kho kiến thức, thử trả lời, hội thoại, nhật ký. Đây là thiết lập dùng chung toàn hệ thống nên chỉ quản trị hệ thống được sửa; nhân viên vẫn tiếp quản bằng cách gửi tin trong trang Tin nhắn. FAQ/quy định do quản trị xác minh và xuất bản; bản nháp không được bot dùng. Giá/phòng/lịch/combo dùng dịch vụ đang phục vụ trang khách, không nhập lại trong FAQ. Chỉ xuất bản thông tin có thể công khai.

## Vận hành

1. Chạy `cd may-chu` rồi `npm run db:chatbot` hoặc áp dụng `co-so-du-lieu/migrations/20261118-chatbot.sql` bằng công cụ migration. Migration thêm 3 bảng riêng có RLS và không cấp quyền anon/authenticated, không đổi hoặc xóa dữ liệu cũ. Có thể chạy lại, không ghi đè thiết lập đã lưu.
2. Đặt `GEMINI_API_KEY` trong môi trường máy chủ hoặc `may-chu/.env`, khởi động lại backend. Có thể đặt `GEMINI_MODEL=gemini-2.5-flash` (mặc định theo đề cương), `gemini-2.5-flash-lite` hoặc `gemini-3.5-flash-lite`. Không tự đổi model khi API lỗi. Thông báo Google kiểm tra ngày 18/11/2026 cho biết 2.5 Flash đã hạn chế tài khoản mới và sẽ tự chuyển sang 3.5 Flash-Lite từ 01/12/2026; chọn model tài khoản hỗ trợ rồi thử và đánh giá trước khi bật. Nguồn: https://ai.google.dev/gemini-api/docs/deprecations . Không gửi khóa trong chat, frontend, SQL, ảnh chụp hay Git. Kiểm tra nhà cung cấp cho phép model `gemini-2.5-flash` trên tài khoản; lỗi model/quota sẽ chuyển nhân viên, không tự đổi model.
3. Mở Quản trị → Chatbot AI, nhập phong cách tư vấn và tin chuyển nhân viên; thêm bài kiến thức rồi xuất bản. Thử trả lời thực tế trước khi bật.
4. Bật tự động và lưu. Hội thoại hỗ trợ **mới** bắt đầu ở chế độ AI; hội thoại cũ giữ chế độ đang có. Có thể chọn lại ở tab Hội thoại; bot xử lý tin khách tiếp theo, không tự trả lời lại lịch sử.
5. Nhân viên gửi tin/ảnh/tệp: tự tiếp quản. Khách gửi ảnh/tệp: chuyển nhân viên, không đọc tệp bằng AI. Yêu cầu đổi/hủy đơn, thanh toán, khiếu nại hoặc không đủ dữ liệu: chuyển nhân viên. Không có số liệu đánh giá chất lượng thật khi chưa chạy với khóa Gemini.

## Luồng xử lý và giới hạn

Tin khách và tác vụ ghi cùng transaction, khóa chống gửi lặp theo mã phía khách. Worker nhận tác vụ bằng `SKIP LOCKED` + lease 90 giây, tối đa 2 lần nhận lại sau crash. Tác vụ quá 5 phút hoặc bị tin mới thay thế được bỏ qua. Gọi Gemini ngoài transaction, tối đa 5 lượt và 5 công cụ/lượt, timeout mạng toàn phiên 35 giây; kiểm tra lại sau công cụ. Trước khi ghi câu trả lời, khóa hội thoại và kiểm tra nguồn tin còn mới nhất, chế độ AI, hội thoại mở, phiên bản cấu hình và lease còn hợp lệ. Nhân viên tiếp quản sẽ chặn câu trả lời đang chờ.

Mặc định tối đa 300 tác vụ tự động/ngày theo múi giờ Việt Nam (điều chỉnh 1–5000); tối đa 6 lượt/hội thoại/phút. Vượt ngưỡng chuyển nhân viên. Thử câu trả lời có giới hạn 6 yêu cầu/phút/quản trị và tính phí API riêng. Mỗi worker chỉ xử lý một tác vụ tại một thời điểm. Khi tắt bot, worker dừng nhận; tác vụ cũ hết hạn sẽ bỏ qua khi bật lại. Theo dõi nhật ký để phát hiện backlog; đây là hàng đợi PostgreSQL phù hợp quy mô đồ án, chưa có dịch vụ điều phối phân tán riêng.

Tên bot/hướng dẫn không thể cấp thêm công cụ. Chỉ cho phép danh mục, FAQ đã xuất bản, tìm phòng trống, báo giá, combo, chuyển nhân viên, bản nháp nhu cầu. Tham số được kiểm tra server và phạm vi chi nhánh; email/số điện thoại được che trước khi đưa vào ngữ cảnh tối đa 12 tin. Vẫn cần kiểm thử nội dung: mô hình ngôn ngữ có thể trả lời sai; kiểm soát công cụ không bảo đảm mọi câu tự nhiên đều đúng. Bản nháp nhu cầu không tự cập nhật hồ sơ khách; nhân viên đối chiếu trước khi sử dụng. Chưa có quy trình duyệt tự ghi hồ sơ hoặc tính F1 từ dữ liệu khách thật.

## Kiểm thử và nghiệm thu theo đề cương

- `npm --prefix may-chu run build` và `npm --prefix may-chu test`: adapter Gemini mô phỏng, hạn chế công cụ, validation, bảo mật quyền.
- `node kiem-thu/trang-khach-chat.integration.mjs`: PGlite biệt lập chạy migration thật + hàng đợi, chống lặp, tin mới, takeover trong lúc gọi, lỗi nhà cung cấp, phiên bản, lease và RLS; không gọi Gemini thật.
- `kiem-thu/chatbot.playwright.mjs`: fixture biệt lập kiểm tra 5 mục quản trị và bố cục.
- `kiem-thu/chatbot-100-tinh-huong.json`: 100 tình huống cố định để đánh giá thật sau khi có khóa. Chấm câu trả lời đúng, dùng đúng công cụ, bịa thông tin và trích xuất nhu cầu. Không coi test mô phỏng là độ chính xác AI. Ghi câu trả lời/model/thời gian/công cụ thực tế, chấm độc lập; tính precision/recall/F1 từng trường dựa vào nhãn người kiểm tra. Không tạo kết quả giả.

API nhà cung cấp: https://ai.google.dev/gemini-api/docs/function-calling (REST generateContent). Không cần SDK mới. Không có khóa trong mã nguồn.

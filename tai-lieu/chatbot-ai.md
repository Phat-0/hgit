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

## Giao diện tình huống và nút AI trong chat

Quản trị có hai mục chính: Thiết lập và Tình huống trả lời. Kho kiến thức cũ vẫn được giữ, không xóa dữ liệu. Thêm tình huống có 6 mẫu: Chào hỏi, Thiếu thông tin, Tư vấn phòng, Báo giá, Không có kết quả, Chuyển nhân viên; hoặc chọn Tự thiết lập. Mỗi tình huống gồm tên, hướng dẫn tối đa 1.000 ký tự và công tắc bật/tắt; tối đa 20 tình huống. Lưu rồi mở ô Thử tình huống đã lưu ngay dưới danh sách để kiểm tra. Những hướng dẫn đã bật được nạp vào cả luồng thử và luồng chat thật, nhưng không thay thế quyền truy cập, quy tắc bảo mật hoặc giá/lịch của hệ thống. Các bài kiến thức cũ vẫn được tra cứu như trước. Nhật ký và danh sách hội thoại nằm trong Nâng cao.

Trong Tin nhắn, nhân viên có quyền với hội thoại hỗ trợ thấy nút Tắt AI/Bật AI. Tắt AI hủy cả tác vụ chờ và đang xử lý; bật lại chỉ áp dụng cho tin khách tiếp theo. Nhân viên gửi tin vẫn tự tiếp quản. Khách và các hội thoại trực tiếp giữa tài khoản không có quyền điều khiển AI; backend kiểm tra quyền và phạm vi chi nhánh. Bật lại chỉ được khi chatbot chung đã bật và máy chủ có khóa. Không thay đổi giới hạn 1–5.000 lượt/ngày.

## Bộ trả lời theo câu hỏi mẫu và từ khóa

Mỗi tình huống thêm Câu hỏi mẫu (mỗi dòng một cách hỏi), Từ khóa liên quan (mỗi dòng một từ/cụm từ), Cách khớp một hoặc đủ các từ khóa, Ưu tiên 0–100, và nội dung bot nên trả lời. Tối đa 20 câu mẫu và 20 từ khóa/tình huống. Câu mẫu tối đa 200 ký tự, từ khóa 80 ký tự. Không phân biệt hoa/thường hoặc dấu tiếng Việt; khớp từ/cụm từ theo ranh giới từ, không lấy chuỗi con trong từ khác. Câu mẫu gần giống dùng độ phủ từ quan trọng, không phải tìm kiếm ngữ nghĩa/embedding và không bảo đảm nhận mọi cách diễn đạt. Câu mẫu khớp là một điều kiện thay thế cho nhóm từ khóa. Nhập nhiều cách hỏi và kiểm tra bằng ô thử.

Server chỉ đưa các tình huống đang bật và có điều kiện phù hợp vào hướng dẫn Gemini. Nếu nhiều mục khớp, số ưu tiên lớn được chọn trước rồi đến điểm khớp; tối đa 3 mục cụ thể/lượt. Nếu chưa khớp, chỉ dùng các hướng dẫn chung không có câu mẫu/từ khóa; giữ tương thích với tình huống cũ. Bộ điều kiện không cấp thêm quyền, không cho chạy SQL hoặc thao tác đơn/thanh toán. Các tình huống không được dùng làm nguồn giá/lịch hiện tại và không được tra ngược qua công cụ FAQ để bỏ qua điều kiện. Ô thử hiển thị tên tình huống và lý do khớp.

Ví dụ: Tên Báo giá; câu mẫu 'Phòng này bao nhiêu tiền?', 'Cho mình hỏi giá phòng'; từ khóa 'giá phòng', 'phụ thu'; cách khớp Có một từ khóa; hướng dẫn 'Hỏi rõ phòng và thời gian còn thiếu, tra báo giá hệ thống rồi nêu tiền phòng, phụ thu và tổng tiền; không tự đoán giá'. Dữ liệu được lưu trong cột dieu_kien của chatbot_kien_thuc; migration 20261118-chatbot-dieu-kien.sql chỉ thêm cột, không xóa tình huống hiện có. npm run db:chatbot cũng áp dụng migration này.

## Một nhóm có nhiều mục hỏi – trả lời

Trong một nhóm tình huống, nhấn Thêm cách trả lời để thêm tối đa 10 mục riêng. Mỗi mục có nhiều cách hỏi mẫu, từ khóa/cách gọi liên quan và nội dung trả lời/hướng dẫn riêng. Hướng dẫn chung của nhóm vẫn được giữ làm ngữ cảnh; khi mục riêng khớp, không đưa các mục trả lời khác không phù hợp vào Gemini. Quy tắc khớp một/đủ từ khóa và ưu tiên của nhóm áp dụng cho các mục con. Các mục được lưu trong dieu_kien.cac_tra_loi, không thêm bảng hoặc thay đổi schema. Có nhận các cách gọi tương đương cơ bản như chi phí/giá tiền → giá, check-in → nhận phòng, check-out → trả phòng; đây là chuẩn hóa từ và câu mẫu đã duyệt, không tự huấn luyện từ mọi tin khách hoặc tự thêm chính sách. Thêm cách nói mới vào câu mẫu/từ khóa rồi lưu để áp dụng.

Thiết lập → Quyền và riêng tư → Quy tắc bắt buộc của hệ thống hiển thị phạm vi bot được đọc và những gì bị cấm. Phần này chỉ đọc: quyền dữ liệu, chuyển nhân viên, cấm tạo/chỉnh/hủy đơn và xác nhận thanh toán do backend kiểm soát, không thể nới bằng câu trả lời mẫu. Mã kiểm soát ở chatbot.service.ts (botSystem), chatbot-cong-cu.ts (danh sách công cụ/kiểm tra tham số) và ACL của ChatService/KetNoiKhachService. Hướng dẫn bổ sung của quản trị chỉ được áp dụng trong phạm vi đó.

Nhiều API key thuộc cùng project Gemini dùng chung hạn mức project, không cộng quota. Muốn tăng hạn mức cần xem tier/quota của project và yêu cầu tăng/nâng cấp theo Google; trần 1–5.000 lượt/ngày trong app là giới hạn nội bộ riêng. Nguồn: https://ai.google.dev/gemini-api/docs/rate-limits . Không triển khai xoay khóa để vượt quota.

## Thiết lập chung, tình huống bung xuống và kiểm duyệt bản nháp

Thiết lập có Điều chung/quy tắc/cách tư vấn, Quyền và riêng tư (bắt buộc) và Thông tin cần biết. Thông tin chung là nội quy, chính sách hoặc tài liệu dạng văn bản do quản trị nhập và bật Cho phép bot sử dụng nguồn này. Những bài tắt không được dùng làm nguồn; tình huống được giữ ở trang riêng. Trang Tình huống hiển thị các nhóm đang có; nhấn vào để bung biểu mẫu toàn chiều rộng phía dưới, nhấn lần nữa để thu gọn. Các mục chung và các cách hỏi–trả lời riêng vẫn trong cùng nhóm, không xóa dữ liệu trước đó.

Mỗi nhóm có công tắc Suy nghĩ sâu hơn từ nguồn cho phép và chọn tối đa 10 thông tin chung đã bật. Lưu trước khi tạo bản nháp. Với Gemini 2.5 dùng thinkingBudget 1.024 khi bật (0 khi tắt); với 3.5 Flash-Lite dùng thinkingLevel MEDIUM khi bật, MINIMAL khi tắt. Bật có thể tốn thêm token và thời gian; timeout mạng chung của phiên tăng từ 35 lên 55 giây, tổng output tối đa 4.096 token. Không hiển thị chuỗi suy nghĩ nội bộ và không mở thêm công cụ/quyền. Trong chat thật, công cụ FAQ bị giới hạn vào các nguồn đã chọn cho tình huống suy nghĩ sâu; công cụ tra giá/lịch công khai vẫn theo kiểm tra server hiện có.

Luồng đề xuất mới tại trang tình huống: nhập Câu hỏi cần đề xuất → Tạo bản nháp để kiểm tra → xem tên và phiên bản nguồn → sửa câu hỏi/câu trả lời nếu cần → Chấp thuận và lưu cách trả lời. Bộ tạo bản nháp chỉ đọc nguồn công khai đã chọn bằng công cụ cố định; không đọc URL bên ngoài hoặc tự lưu câu trả lời mới. Bản nháp chưa duyệt chỉ ở phiên giao diện, mất khi tải lại; không có hàng đợi duyệt bền vững hoặc tự học từ toàn bộ chat khách. Chấp thuận lưu vào cac_tra_loi của nhóm hiện có, giữ nguyên trạng thái bật/tắt nhóm. Mỗi nhóm tối đa 10 mục. Quyền phê duyệt chỉ quản trị hệ thống; kiểm tra lại phiên bản nhóm và nguồn, nguồn còn cho phép, và phạm vi nguồn. Nếu tài liệu bị sửa/tắt trước khi duyệt hoặc nhóm thay đổi, yêu cầu tạo lại. Gửi duyệt lặp bị chặn bởi phiên bản, không thêm trùng. Các cách trả lời đã duyệt kèm nguồn bị ngừng sử dụng nếu nguồn bị tắt. Không thêm bảng/schema ở lần cập nhật này; cấu hình nằm trong dieu_kien hiện có, ghi người sửa và phiên bản của nhóm.

Kiểm thử gồm luồng phiên bản/nguồn/quyền trên PGlite, adapter suy nghĩ 2.5/3.5 với nhà cung cấp mô phỏng và Playwright từ tạo nguồn chung đến tạo nháp/duyệt, thu gọn/mở và bốn kích thước 360–1440px. Chưa đánh giá chất lượng bản nháp với Gemini thật trong các kiểm thử này. Tài liệu API: https://ai.google.dev/gemini-api/docs/generate-content/thinking .

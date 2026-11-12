# Phương án AI cho chat Homestay — chưa triển khai

Yêu cầu hiện tại chỉ dừng ở phương án AI; không nối model, không thêm API key AI, không gửi dữ liệu thật ra ngoài và không bật chế độ trả lời tự động. Cần đối chiếu nguyên văn đề cương trước khi chốt đầy đủ phạm vi AI của đồ án.

## Mục tiêu và thứ tự

1. **AI gợi ý cho nhân viên**: nhận câu hỏi, tra dữ liệu được phép, soạn nháp. Nhân viên xem/sửa/bấm gửi. Đây là bước đầu đề xuất.
2. **AI trả lời FAQ có kiểm soát**: chỉ tự trả lời các câu từ bộ kiến thức đã duyệt của chi nhánh; ngoài phạm vi thì chuyển nhân viên.
3. **Tra thông tin động**: cung cấp kết quả API phòng trống/giá/combo hiện hành cho model diễn giải; giá và điều kiện luôn do backend tính, không dùng số model tự tạo.

Chế độ mỗi chi nhánh/cuộc chat: Tắt → Gợi ý → Tự trả lời trong phạm vi. Mặc định Tắt. Nhân viên có nút tiếp quản; khi người thật đã tiếp quản hoặc khách yêu cầu gặp nhân viên, AI dừng tự gửi cho cuộc đó.

## Nguồn kiến thức

- Nội dung chính sách/FAQ đã được quản trị duyệt, thông tin chi nhánh, khung giờ, tiện ích và hướng dẫn.
- Dữ liệu có phiên bản, chi nhánh, trạng thái duyệt và ngày cập nhật. Không dùng bản nháp Trang chủ làm tri thức công khai.
- Bắt đầu bằng truy xuất có cấu trúc/FAQ; chỉ bổ sung tìm kiếm ngữ nghĩa nếu cần cho đề cương và có dữ liệu đánh giá.
- Không tự đọc PDF/ảnh/tệp chat hoặc đưa chúng sang model. Nếu triển khai đọc tệp về sau, cần luồng cho phép rõ ràng, kiểm tra tệp, xử lý dữ liệu riêng tư và giới hạn dung lượng.

## Luồng xử lý dự kiến

Tin mới → kiểm tra chế độ/quyền/chi nhánh → lấy ngữ cảnh tối thiểu → tra FAQ/API chỉ đọc → tạo gợi ý → kiểm tra nguồn, giới hạn và phiên cuộc chat → nhân viên duyệt hoặc gửi tự động nếu đúng phạm vi → ghi dấu phản hồi AI và nguồn.

Dùng hàng đợi để không chặn gửi tin. Khóa theo cuộc và mã sự kiện để không trả lời lặp. Trước khi phát câu trả lời phải kiểm tra có tin mới hơn/nhân viên tiếp quản hay không; nếu có thì bỏ kết quả cũ hoặc tạo lại, tránh trả lời lệch ngữ cảnh.

## Giới hạn quyền

- Model không được chạy SQL tùy ý, đọc chat riêng người khác hoặc gọi API với quyền service-role.
- Chỉ có công cụ chỉ đọc với tham số backend xác minh. Thông tin đơn của khách phải qua xác thực/quyền sở hữu hiện có.
- Không tự xác nhận thanh toán, sửa giá, hủy đơn hoặc thay trạng thái nghiệp vụ. Nếu bổ sung tạo yêu cầu đặt sau này, phải dùng cùng API kiểm tra giá/chống trùng và có bước khách xác nhận rõ ràng.
- Câu hỏi thiếu thông tin: hỏi lại; không chắc: nói cần kiểm tra và chuyển nhân viên. Không bịa còn phòng, ưu đãi hoặc chính sách hủy.
- Tên/tệp/tin của khách là dữ liệu, không phải lệnh thay đổi quyền hoặc chỉ dẫn hệ thống. Che/bỏ SĐT, email, mã phiên và dữ liệu nhạy cảm không cần thiết trước khi gọi model.

## Cần chuẩn bị trước khi triển khai

- Bộ FAQ/chính sách được duyệt; các API chỉ đọc có kiểm thử; vai trò nhân viên hỗ trợ và quy tắc tiếp quản.
- Chọn dịch vụ/model, nơi xử lý dữ liệu và giới hạn chi phí sau khi người dùng chốt; lưu khóa ở backend.
- Nhật ký tối thiểu: chế độ, nguồn, thời gian, lỗi, chi phí; không ghi khóa/token hoặc toàn bộ dữ liệu riêng tư tùy tiện. Có giới hạn lượt và nút tắt nhanh.
- Bộ đánh giá tiếng Việt: giờ/ngày/đêm, giá tối thiểu, combo không phù hợp, hết phòng, thiếu thông tin, người khác hỏi đơn, prompt injection và nhân viên tiếp quản. Đo độ đúng có nguồn, tỷ lệ chuyển người thật, độ trễ và chi phí.

Các mục trên là phương án, không phải tính năng đã có trong commit hiện tại. Các mẫu trả lời soạn sẵn đang hoạt động là do nhân viên bấm gửi, không phải AI.

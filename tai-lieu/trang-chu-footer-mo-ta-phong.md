# Trang chủ, footer và mô tả riêng của phòng

- Footer chỉnh tại Quản trị → Trang chủ → Footer: logo, ảnh nền, giới thiệu, ba lợi ích, tiêu đề khám phá/kết nối, nhãn nút chat, liên hệ, mạng xã hội và liên kết chính sách. Liên kết phải dùng HTTPS. Nút chat dùng hội thoại có sẵn.
- Ảnh nền chung cũ nay chỉ dùng ở đầu trang. Ảnh của Giới thiệu bổ sung là nền của riêng khối đó. Phần còn lại dùng màu nền tối đã cấu hình.
- Ảnh đầu trang phủ toàn màn hình lần đầu mở, rời khỏi màn hình khi cuộn xuống. Nền bên dưới sáng hơn nhưng vẫn giữ tông tối.
- Khung đặt đơn mặc định thu lại. Nhấn Đặt đơn để mở/khép khung chìm toàn chiều ngang; ba loại đặt giữ cùng chiều cao ở từng kích thước màn hình.
- Số Homestay/phòng lấy từ chi nhánh hoạt động; lượt khách là tổng số khách của đơn đã nhận/trả phòng, không phải số khách duy nhất.

## Migration đã áp dụng

`co-so-du-lieu/migrations/chuyen-mo-ta-loai-phong-sang-phong.sql` đã chạy và xác minh trên Supabase ngày 18/11/2026: cột mới đã có, cột cũ đã bỏ, 3 phòng có mô tả được giữ lại. Kiểm tra trước chuyển: có 2 loại có mô tả, 3 phòng nhận nội dung, không có mô tả của loại chưa gắn phòng, không có đối tượng DB phụ thuộc cột cũ.

Migration thêm `phong.mo_ta`, sao chép mô tả khi phòng chưa có nội dung riêng rồi bỏ `loai_phong.mo_ta` bằng RESTRICT trong cùng transaction. Dừng nếu có mô tả chưa gắn phòng. Chạy lại không ghi đè mô tả riêng. Không đổi khóa ngoại, RLS, lịch đặt hay bảng thanh toán.

Mã đọc public tương thích cả trước và sau migration. Trước migration, các thông tin phòng khác vẫn lưu được; nhập mô tả riêng sẽ báo cần áp dụng migration thay vì làm lỗi SQL. Sau migration, form Phòng lưu mô tả riêng bình thường. Form Loại phòng không còn ô mô tả.

Kiểm tra sau áp dụng: chỉ còn cột `phong.mo_ta`, số phòng nhận nội dung đúng 3, nội dung mô tả cũ được giữ lại, sửa mô tả của một phòng không thay đổi phòng khác.

## Trang phòng và giao diện theo tham khảo Charmy

- Chi tiết phòng có URL `/phong/:id`, tải lại trực tiếp được; ảnh lớn và thanh xem trước nằm bên trái, tên/giá/đặt phòng bên phải. Phần Thông tin chi tiết đọc đúng `phong.mo_ta`, hiển thị văn bản thuần.
- Mở từ danh sách giới thiệu không chọn sẵn loại đặt. Mở từ kết quả tìm phòng mang theo thời gian qua URL và kiểm tra lại với API trước khi dùng lịch đó để đặt.
- Nền dùng chất liệu nâu vẽ bằng CSS, mép chuyển đầu trang dạng giấy, xuất hiện dần khi cuộn và dịch ảnh nền nhẹ. Giữ ảnh trong CMS/phòng; không dùng tài nguyên hình của website tham khảo. Tôn trọng thiết lập giảm chuyển động.
- Footer không còn liên kết dành cho nhân viên. Hotline, email, website và các ứng dụng có biểu tượng; liên kết lấy từ cấu hình Trang chủ. Biểu tượng chưa có URL chỉ hiển thị, không tạo đường dẫn giả.
- Sidebar bản đồ có ba nhóm nền riêng, chữ sáng; nhãn trên nền bản đồ sáng vẫn dùng chữ tối.

## Khung xuất hiện, bộ chọn combo và các ô chỉnh mới

- Ba ô số liệu cùng tiêu đề ở trang chủ và ba nhóm bản đồ có khung riêng; nội dung xuất hiện dần khi cuộn tới/mở bản đồ. Nút đặt đơn nằm bên trái.
- Quản trị Trang chủ có thể sửa nhãn nút đặt đơn, tiêu đề số liệu và đánh giá, bật/tắt số liệu và hiệu ứng, thời gian mở/khép 300–1600 ms (mặc định 750 ms). Các giá trị này nằm trong JSON cấu hình sẵn có, không thêm bảng.
- Nút Combo hiển thị số đã chọn; mở nút sẽ chuyển phần bên trái sang danh sách dọc. Bên phải luôn có thời gian, các combo đã chọn, nút bỏ chọn và tổng do API tính lại.
- Có thể chọn nhiều combo dịch vụ và một gói giờ, tối đa 10 lựa chọn khác nhau. Gói giờ mới thay gói giờ cũ trên giao diện; máy chủ từ chối yêu cầu chứa nhiều gói giờ, combo lặp hoặc sai phạm vi/lịch. Danh sách đầy đủ và giá combo được chốt vào `cau_hinh_gia_chot`; `combo_id` giữ lựa chọn đầu để tương thích dữ liệu cũ. Lượt dùng combo tính cả danh sách này.
- Chưa đăng nhập: chỉ khi nhấn gửi yêu cầu mới hiện thông báo đăng nhập/đăng ký để xác nhận đơn thêm lần nữa. Không tự tạo đơn ở bước hiện thông báo. Luồng khách vãng lai và trạng thái Chờ xác nhận giữ nguyên.
- Cuối trang chi tiết phòng có tối đa bốn phòng khác, ưu tiên cùng chi nhánh. Nhấp phòng khác mở URL phòng tương ứng.

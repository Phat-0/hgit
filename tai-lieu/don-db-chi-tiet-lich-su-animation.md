# Chi tiết đơn, chống lặp và lịch sử

Đã áp dụng migration `20261119134739_don_chi_tiet_va_don_db.sql` ngày 19/11/2026. Ba bảng `chung_tu_thanh_toan`, `goi_gia`, `quy_tac_gia` rỗng và không còn tham chiếu đơn được bỏ bằng RESTRICT, không CASCADE. Xóa cột `dat_phong.goi_gia_id` không dùng và một ràng buộc unique trùng chức năng. Migration dừng nếu phát hiện dữ liệu cần đối chiếu.

## Vai trò dữ liệu

- `phong`: định danh/vị trí phòng, loại phòng, mô tả, trạng thái vận hành, cấu hình giá và loại đặt chung.
- `dat_phong`: khách, phòng, khoảng nhận/trả, trạng thái, tổng tiền, voucher, thông tin thanh toán. Giữ cấu hình tính giá chốt để truy vết.
- `chi_tiet_dat_phong`: các khoản đã chốt theo đơn: phòng, combo (nhiều dòng), dịch vụ, phụ thu, điều chỉnh. Lưu tên và giá tại thời điểm chốt. Tổng các dòng bằng tiền phòng + tiền dịch vụ, trước giảm voucher; không thay đổi tổng đơn. Bỏ bản sao danh sách combo trong JSON lưu trữ, DTO đọc lại từ bảng chi tiết. Combo cũ không có đơn giá chốt được đánh dấu chưa xác định, không lấy giá hiện tại gán ngược lịch sử.
- `khoa_chong_lap_yeu_cau`: dùng thực tế khi tạo đơn từ khách/quản trị, băm chuẩn hóa nội dung, phạm vi người dùng hoặc băm số điện thoại của khách vãng lai, tách nghiệp vụ. Cùng khóa/cùng nội dung trả kết quả cũ; khác nội dung trả xung đột. Đặt khóa và tạo đơn trong cùng giao dịch, không tăng lượt voucher lần nữa. Không thay thế ràng buộc chống trùng giờ/phòng và khoảng đệm 30 phút.

Ảnh đơn và chứng từ thu chi vẫn dùng các bảng/tệp đang hoạt động (`anh_don_dat_phong`, `chung_tu_thu_chi`); không xóa tệp. Không xóa bảng rỗng chỉ vì chưa có dữ liệu nếu vẫn có chức năng sử dụng.

## Giao diện và phân quyền

Lịch sử hiện thao tác, đối tượng có tên/mã, đơn có khách và phòng, tóm tắt thay đổi ngay trong bảng, chi tiết giá trị trước/sau. Bổ sung nhật ký tạo/sửa/xóa phòng, loại phòng, chi nhánh và combo, ghi người thực hiện từ kết nối backend; giữ tên trong dữ liệu nhật ký sau xóa. Nhật ký cũ thiếu dữ liệu không tự bịa thông tin.

Mọi tài khoản nhân viên đang hoạt động được mở Vệ sinh và hoàn thành công việc ở các chi nhánh. Khách hàng không được quyền này; vẫn yêu cầu đơn đã trả phòng. Thông báo trước checkout giữ gửi đúng nhân viên vệ sinh của chi nhánh.

Trang chủ xuất hiện từng phần tử khi cuộn đến: 1,1 giây, lệch nhau 0,1 giây, tối đa 0,4 giây. Header 0,7 giây; tôn trọng giảm chuyển động, không ẩn nội dung khi tắt hiệu ứng.

## Kiểm tra

- Build backend/frontend đạt; 184 unit tests đạt.
- Integration PostgreSQL/PGlite: chuyển đơn cũ giữ tổng, chi tiết phòng/phụ thu/dịch vụ; đặt khách/quản trị, nhiều combo, voucher không trừ lặp, khóa yêu cầu khác nội dung bị từ chối, khoảng đệm 30 phút, quyền vệ sinh, lịch sử và các luồng cũ đạt.
- DB thật sau migration: 4 đơn, tổng 1.374.080, mã đối chiếu trước/sau giống nhau, 5 dòng chi tiết, 0 đơn lệch tổng.
- Playwright: lịch sử không tràn trang ở 1440/1024/768/390; 44 phần tử được gắn hiệu ứng, cuộn hiện đủ, tốc độ 1,1 giây, giảm chuyển động vẫn thấy nội dung. Dùng dữ liệu giả lập, không tạo đơn hay sửa dữ liệu khách thật.

Máy khác đồng bộ bằng `npm run db:don-db` trong `may-chu` sau khi cấu hình DB; DB đã áp dụng có marker sẽ được bỏ qua. Các migration cũ được giữ để tái tạo lịch sử schema.

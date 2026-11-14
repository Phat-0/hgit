# Bảng co giãn và biểu đồ thu chi theo đối tượng — 14/11/2026

## Bảng

- Cột tự giãn bù để tổng độ rộng luôn phủ khung, kể cả khi kéo hẹp cột. Nếu tổng độ rộng lớn hơn khung, chỉ vùng bảng cuộn ngang.
- Thêm vạch kéo chiều cao ở mép dưới bảng; dấu + ở giữa vẫn dùng để thêm dòng. Chiều cao giới hạn 220–1.000 px, được nhớ trên trình duyệt. Có thể dùng phím lên/xuống hoặc Home trên vạch kéo.
- Bỏ hàng “Tổng dòng đang hiển thị” trong bảng.
- Dòng bên dưới chỉ ghi số hàng đã chọn, không ghi số tiền sau số hàng. Biểu tượng bỏ chọn, lịch và Tổng/Thu/Chi cùng một hàng; màn hình hẹp có cuộn trong hàng, không kéo rộng trang.

## Biểu đồ

Lịch riêng của biểu đồ cho phép chọn khoảng ngày/tháng độc lập với bảng. API lấy lại dữ liệu đã lưu cho khoảng đó, không chỉ lọc trong các dòng đang được bảng tải. Khi sửa/lưu dòng ở bảng, biểu đồ lấy lại dữ liệu để đồng bộ, nhưng giữ khoảng ngày riêng.

Chọn cách so sánh:

1. **Tổng thu chi:** cột Thu/Chi và tròn chia Thu/Chi toàn phạm vi.
2. **Giữa các chi nhánh:** mỗi chi nhánh một nhóm cột; tròn thể hiện tỷ trọng các chi nhánh.
3. **Giữa các phòng:** mỗi phòng một nhóm; nhãn có chi nhánh để tránh lẫn tên phòng giống nhau.
4. **Đối tượng tùy chỉnh:** các nhóm có tên, màu và phạm vi do người dùng tạo.

Có thể hiện Thu và Chi, chỉ Thu hoặc chỉ Chi. Bộ lọc chi nhánh/phòng, sắp xếp lớn–bé/tên, màu Thu/Chi và chế độ % vẫn có. Chi dùng trị tuyệt đối trong biểu đồ; không cộng tiền tồn. Phòng/chi nhánh không có khoản thu chi trong kỳ vẫn có giá trị 0; khoản chưa gán được thể hiện thành nhóm riêng.

Bật “Biểu đồ đường” để xem diễn biến theo ngày. Ngày không có phát sinh là 0; nét liền là Thu, nét đứt là Chi. Bỏ đánh dấu để ẩn. Màu các nhóm trong phần so sánh giữ xuyên suốt giữa tròn và đường.

### Tạo đối tượng

Nhấn “Tạo đối tượng”, nhập tên/màu, chọn các chi nhánh hoặc phòng; hoặc chọn khoản chung chưa gán và thêm từ khóa tên/ghi chú. Lưu xong, chọn chế độ Đối tượng tùy chỉnh để so sánh. Có sửa và xóa; xóa đối tượng không xóa khoản thu chi hay phòng/chi nhánh.

Tối đa 20 đối tượng, mỗi đối tượng tối đa 200 mã phạm vi. Cấu hình lưu riêng theo tài khoản trên DB, tải được từ máy khác, kiểm tra quyền trang Báo cáo tại backend và chống ghi đè phiên bản. Màu Thu/Chi và độ rộng/cao bảng vẫn là tùy chỉnh trình duyệt.

Đối tượng có thể giao nhau (ví dụ một nhóm toàn chi nhánh và nhóm chỉ một phòng thuộc chi nhánh đó). Khi phát hiện giao nhau, biểu đồ giải thích rằng tỷ trọng dựa trên tổng giá trị các nhóm hiển thị, không dùng làm số dư thực tế. Không tự sinh giao dịch hoặc xác nhận thanh toán.

### Xuất

- SVG: xuất các biểu đồ đang hiện, gồm cột/tròn và đường nếu đã bật, kèm chú giải.
- CSV: số liệu đối tượng và tỷ trọng.
- Excel: số liệu đối tượng và chuỗi theo ngày.

File theo đúng lịch riêng, phạm vi, loại Thu/Chi và thứ tự đang chọn. Không đưa tiền tồn vào phần tính tỷ trọng.

## Database và kiểm chứng

Đã áp dụng migration `20261114123000_doi_tuong_bieu_do_thu_chi.sql` qua Supabase MCP: thêm `cau_hinh_bieu_do_thu_chi` theo người dùng, bật RLS, chặn client anon/authenticated truy cập trực tiếp. Không sửa/xóa dòng thu chi hoặc đơn đặt phòng hiện có. API cấu hình chỉ làm việc với tài khoản từ token đã xác minh.

Đã kiểm chứng build frontend/backend, lint backend, 107 unit tests, PostgreSQL PGlite (quyền/tài khoản riêng/phạm vi/phiên bản/RLS) và DOM (kéo rộng/cao bảng, bỏ tổng dưới bảng, so sánh chi nhánh, chọn Chi, bật/tắt đường, tạo đối tượng, lịch riêng).

Chưa xác nhận trực quan bản mới trên website đang chạy bằng Playwright; kết quả kiểm thử giao diện ở trên là kiểm thử DOM của code mới.

```powershell
cd D:\DoAnTotNghiep
git pull origin main
cd may-chu
npm.cmd run db:bieu-do-thu-chi
npm.cmd run build
cd ..\trang-web
npm.cmd run build
```

Supabase đã đồng bộ; script có kiểm tra phiên bản và sẽ bỏ qua nếu đã chạy. Khởi động lại backend sau cập nhật.

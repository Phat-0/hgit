# Phương án B — Gộp gói giá vào phòng (CHƯA THỰC HIỆN)

## Trạng thái
- Đã rà soát schema trong repo, chưa có quyền xác minh dữ liệu thực tế trên Supabase.
- Chưa chạy SQL, chưa sửa schema, chưa xóa bảng `goi_gia`.
- Chạy **chỉ các truy vấn SELECT** tại `kiem-tra-truoc-gop-goi-gia.sql`, gửi kết quả để quyết định migration cuối cùng.

## Phụ thuộc đã xác định từ schema nguồn
1. `dat_phong.goi_gia_id` FK -> `goi_gia.id` ON DELETE RESTRICT.
2. `quy_tac_gia.goi_gia_id` FK -> `goi_gia.id` ON DELETE CASCADE.
3. `goi_gia.loai_phong_id` FK -> `loai_phong.id`.
4. `goi_gia` có unique `(loai_phong_id,ten_goi)`, không có unique theo hình thức; **có thể có nhiều gói cùng hình thức cho một loại phòng**.
5. `dat_phong.hinh_thuc_dat` và `goi_gia.hinh_thuc_dat` chỉ hỗ trợ `Theo giờ`, `Theo đêm` trong schema gốc. Hình thức ngày cần được mô hình hóa riêng.
6. API `bookingOptions` và `createBooking` của NestJS, trang `DonDatPhong.tsx` tham chiếu gói giá. `quy_tac_gia` có thể có tham chiếu khác ngoài repo; kiểm tra Supabase thực tế.
7. `gia_lich_phong` dùng `phong_id` nên giữ riêng, không gộp vào giá mặc định.

## Thiết kế đích đề xuất
- `phong`: `gia_moi_gio` (GIÁ TRỌN N GIỜ ĐẦU, không phải giá mỗi giờ), `so_gio_toi_thieu` (mặc định cần thống nhất theo dữ liệu), `gia_phu_thu_gio`, `gia_moi_ngay`, `gia_moi_dem`, trạng thái mở bán cho từng hình thức (3 boolean hoặc bảng cấu hình nếu cần nhiều gói).
- `phong.trang_thai_van_hanh` giữ nguyên; không dùng thay cho trạng thái mở bán.
- `gia_lich_phong`: giữ bảng giá ngoại lệ theo ngày/giờ; nếu giá giờ ngoại lệ cần N giờ đầu khác, bổ sung `so_gio_toi_thieu` theo quy tắc ưu tiên rõ ràng.
- `combo`: số giờ bao gồm tùy chọn, giá combo và phụ thu, phạm vi phòng/chi nhánh; dịch vụ-only cộng tiền dịch vụ.
- `dat_phong`: giữ `phong_id`, `hinh_thuc_dat`, `tien_phong`, `tong_tien` để bảo toàn lịch sử. Bổ sung snapshot giá giờ tối thiểu, giá gốc, phụ thu, số giờ, combo nếu cần kiểm toán, không tính lại hóa đơn cũ từ giá phòng mới.
- `quy_tac_gia`: chỉ chuyển sang `gia_lich_phong` nếu ngữ nghĩa tương thích; nếu không, phải lưu trữ quy tắc cũ để không mất dữ liệu.

## Trình tự migration sau khi có kết quả kiểm tra và xác nhận riêng
1. Sao lưu Supabase; kiểm tra phục hồi; chốt thời điểm không có ghi đơn mới.
2. Thống kê dữ liệu, FK, view, function, trigger, RLS, policy và các tham chiếu ngoài repo.
3. Giải quyết trường hợp một loại phòng có nhiều gói cùng hình thức, nhiều giá/giờ tối thiểu khác nhau. Phải có quy tắc mapping từng gói vào từng phòng, không tự chọn ngẫu nhiên.
4. Thêm các cột mới vào `phong` và các cột snapshot cần thiết vào `dat_phong`; backfill; xác nhận số bản ghi trước/sau.
5. Di chuyển/đối chiếu `quy_tac_gia`; kiểm thử các khoảng giá, thứ tự ưu tiên, ngày đặc biệt.
6. Cập nhật API và frontend đồng bộ: quản lý phòng, lịch phòng, tạo đơn, tính giá phía server, combo; tạm giữ bảng `goi_gia` để tương thích trong giai đoạn chuyển tiếp.
7. Kiểm thử đơn giờ/ngày/đêm, phụ thu, combo, đơn lịch sử, hủy và thanh toán; kiểm tra không có FK hoặc mã nguồn còn tham chiếu.
8. Chỉ sau xác nhận độc lập, migration riêng mới DROP FK `dat_phong.goi_gia_id`, chuyển `quy_tac_gia` và DROP `goi_gia`. Không dùng CASCADE.
9. Có kế hoạch rollback bằng backup và triển khai phiên bản backend tương ứng.

## Điểm cần quyết định
- Nếu **mỗi phòng chỉ có một giá cơ bản theo từng hình thức**, có thể gộp vật lý vào `phong`.
- Nếu **mỗi phòng cần nhiều gói giờ** (2 giờ/3 giờ/qua đêm/giá thành viên), nên giữ một bảng cấu hình con thay vì nhồi nhiều cột vào `phong`.
- Trạng thái gói giá `hieu_luc` chuyển thành trạng thái mở bán theo từng hình thức; không trộn với trạng thái vận hành phòng.

**Tài liệu này không phải SQL migration xóa bảng. Không thực thi DROP TABLE trước khi kiểm tra và xác nhận.**

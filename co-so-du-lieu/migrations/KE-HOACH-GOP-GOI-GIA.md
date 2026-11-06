> Cập nhật: đã chuẩn bị migration 01/02 và code mới. Xem [hướng dẫn triển khai hiện tại](HUONG-DAN-AP-DUNG-GOP-GIA.md). Nội dung dưới đây ghi nhận khảo sát trước triển khai; chưa chạy SQL trên Supabase.

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

## Chốt yêu cầu form và kết quả rà soát ngày 06/11/2026

- Tài liệu này là đầu mối cho phương án B; các bản kế hoạch tên khác chỉ là bản tham khảo cũ.
- “Loại phòng muốn đặt” là **nhãn hiển thị của hình thức đặt**, chọn Theo giờ / Theo ngày / Qua đêm. Không tạo cột hay giá trị nghiệp vụ tên “Loại phòng muốn đặt”, không thêm bộ chọn `loai_phong_id`. Loại phòng thực tế được suy ra từ phòng đã chọn.
- Dùng lại RangePicker và TimePicker của trang Lịch; ngày/đêm lấy giờ nhận/trả trong `lich_phong_gio`, giờ cho phép chọn trong khung đã thiết lập. Thiết lập hiện nằm trong localStorage, chưa phải cấu hình chung ở server; khi chuyển đổi API cần đưa cấu hình về server để kiểm tra thống nhất.
- Giai đoạn trước migration vẫn cần gói tương ứng duy nhất để tương thích API. Không suy đoán hình thức theo tên gói; không gửi đơn Theo ngày dưới giá trị Theo đêm. Nếu chưa có cấu hình hoặc có nhiều gói cùng hình thức thì chặn lưu và báo rõ.
- Ngoài API tạo đơn, `may-chu/src/homestay/homestay.service.ts` còn lấy giá hiển thị từ `goi_gia`; `GoiGiaCombo.tsx` còn tab Gói giá. Phải chuyển các nơi này sang giá phòng trước khi loại bỏ bảng. Giữ mục Combo để quản lý chương trình độc lập.

## Chuyển trạng thái và số giờ tối thiểu

- Chuyển `hieu_luc` thành `mo_ban_theo_gio`, `mo_ban_theo_ngay`, `mo_ban_theo_dem` trên phòng. Giá bằng 0 không có nghĩa là đóng bán. Khi một loại/hình thức có cả gói bật và tắt, đưa vào danh sách xung đột để chọn mapping; không tự OR trạng thái.
- Thêm `so_gio_toi_thieu` trên phòng, số nguyên dương, tương ứng số giờ đầu được bao gồm trong giá gói giờ hiện tại. Chưa áp mặc định 1 cho dữ liệu cũ; gói có NULL phải được đối chiếu ý nghĩa trước.
- Giá `gia_moi_gio` đang được form hiểu là giá trọn N giờ đầu. Phải chốt ý nghĩa này cùng màn quản lý phòng; nếu đổi thành đơn giá mỗi giờ thì phải đổi công thức đồng thời, không chỉ chuyển số tiền.

## Các migration cần tạo sau audit

1. **Mở rộng**: chỉ thêm cột nullable/snapshot và hỗ trợ hình thức Theo ngày trong CHECK khi triển khai hỗ trợ ngày. Không đổi dữ liệu lịch sử Theo đêm chỉ dựa trên tên gói. Không xóa cột/bảng.
2. **Mapping và backfill**: lập bảng đối chiếu `goi_gia_id -> phong_id + hinh_thuc_dat`, giữ giá trị cũ/mới và trạng thái; mapping một gói có thể tới nhiều phòng cùng loại. Dừng nếu giá hiện tại khác giá nguồn, thiếu mapping, nhiều nguồn xung đột hoặc quy tắc giá chưa có đích. Sao chép snapshot đơn từ dữ liệu giao dịch, không thay tiền đã chốt bằng giá mới. Đối chiếu từng ID, không chỉ tổng tiền.
3. **Chuyển ứng dụng**: API nhận `phong_id` và `hinh_thuc_dat`; kiểm tra mở bán, số giờ tối thiểu, giờ cấu hình, giá, combo và trùng lịch phía server; bỏ bắt buộc `goi_gia_id` trong cùng đợt triển khai tương thích. Giữ nguyên EXCLUDE chống trùng lịch. Chuyển mọi truy vấn giá hiển thị và quản lý sang phòng.
4. **Thu gọn riêng**: sau khi không còn ứng dụng ghi schema cũ và kiểm tra dependency thực tế lại, xử lý toàn bộ FK của `goi_gia`, chuyển/lưu trữ quy tắc, rồi mới bỏ cột/bảng bằng RESTRICT. Không dùng CASCADE; nếu gặp phụ thuộc bất ngờ thì dừng.

Mỗi pha chạy trong transaction có kiểm tra trước/sau. Sao lưu cả dữ liệu, schema, policy và mapping; diễn tập phục hồi trên DB thử nghiệm. Trước pha xóa có thể rollback ứng dụng khi vẫn giữ cấu trúc cũ; sau pha xóa phải khôi phục cả cấu trúc và dữ liệu/mapping cùng phiên bản ứng dụng. Không dùng một rollback tự tạo lại bảng rỗng.

## Phạm vi kiểm chứng

Đã kiểm tra tham chiếu trong mã nguồn và schema được commit. Script audit bao gồm FK hai chiều của phòng/gói ở mọi schema, dependency catalog, function/procedure, view/materialized view, policy, trigger, dữ liệu xung đột, đơn sai liên kết và quy tắc mồ côi. SQL động và tích hợp bên ngoài vẫn cần rà soát riêng.

**Chưa chạy bất kỳ SQL nào trên Supabase; chưa có kết quả audit dữ liệu hoặc catalog thực tế. Vì vậy chưa đủ cơ sở xác nhận có thể xóa `goi_gia`.** Không có migration phá hủy nào được tạo trong đợt này.

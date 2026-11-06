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

## Chốt yêu cầu giao diện ngày 06/11/2026

“Loại phòng muốn đặt” chỉ là nhãn thay cho “Hình thức đặt”, có ba lựa chọn
Theo giờ / Theo ngày / Qua đêm. Không tạo thêm thuộc tính, bảng hay bộ chọn
`loai_phong_id` từ nhãn này. Người dùng chọn chi nhánh, hình thức và phòng cụ thể;
loại phòng dùng nội bộ lấy từ phòng được chọn để tương thích gói cũ.

Trang tạo đơn dùng cùng hàm xác định khoảng thời gian với trang Lịch:
- RangePicker chọn khoảng ngày, không chọn ngày quá khứ.
- Theo giờ: giờ trả sau giờ nhận, dùng khung giờ trong thiết lập Lịch.
- Theo ngày / Qua đêm: giờ lấy từ thiết lập Lịch; nếu giờ trả <= giờ nhận,
  kết thúc ở ngày kế tiếp của ngày cuối được chọn, kể cả khoảng nhiều ngày.
- Thiết lập giờ hiện vẫn ở `lich_phong_gio` của trình duyệt, chưa đồng bộ DB.
- Đổi nhãn không đổi enum DB. Schema cũ chưa có `Theo ngày`; code tương thích
  vẫn dùng gói cũ. Khi migration phải phân loại gói ngày/đêm bằng mapping được
  duyệt, không suy diễn từ tên gói để backfill lịch sử.

## Ánh xạ cột đích cụ thể (đề xuất, chưa tạo trên Supabase)

| Nguồn | Đích | Quy tắc |
|---|---|---|
| `goi_gia.gia_co_ban` theo giờ | `phong.gia_moi_gio` | Giá trọn N giờ đầu, không nhân giá này với số giờ |
| `goi_gia.so_gio_toi_thieu` | `phong.so_gio_toi_thieu` | Số nguyên > 0, không tự đặt 1 khi dữ liệu thiếu |
| Giá ngày / đêm | `phong.gia_moi_ngay`, `phong.gia_moi_dem` | Đối chiếu với giá phòng đang có trước khi ghi |
| Phụ thu giờ | `phong.gia_phu_thu_gio` | Không tự suy ra từ giá gói |
| `goi_gia.hieu_luc` | `phong.cho_dat_theo_gio`, `cho_dat_theo_ngay`, `cho_dat_theo_dem` | Boolean cho từng hình thức; thiếu gói không tự mở bán |
| `goi_gia.ten_goi` | Hồ sơ mapping/lưu trữ gói cũ | Giữ tên gói nguồn, không đổi thành tên phòng |
| `goi_gia.loai_phong_id` | Mapping gói → các phòng thuộc loại | Một loại có nhiều phòng, đối chiếu từng phòng |
| `quy_tac_gia` | Quy tắc theo phòng hoặc bản lưu trữ | Giữ `muc_uu_tien`, bảng giá lịch chưa có ưu tiên tương đương |

Các cột giá trên phòng đã có trong một số migration. Không thêm trùng hay ghi đè
bằng giá gói chỉ vì tên cột tương tự. Ví dụ 200.000 cho 2 giờ đầu, phụ thu
50.000/giờ: 3 giờ = 250.000. Thời lượng tối thiểu và làm tròn phải thống nhất ở
backend; combo giờ có quy tắc riêng.

Ba cột mở bán trả lời “có nhận đặt hình thức này không”. `trang_thai_van_hanh`
trả lời “phòng đang trong tình trạng nào”. Phòng Trống vẫn có thể tắt Theo giờ
nhưng bật Qua đêm. Không dùng giá 0 biểu diễn ngừng bán.

## Các cổng kiểm tra trước khi xóa

1. **Audit thực tế:** `kiem-tra-truoc-gop-goi-gia.sql` kiểm tra FK bằng OID (mọi
   schema, FK nhiều cột), constraints, dependency, view/materialized view,
   function, trigger, policy, RLS, quyền truy cập, số dòng, tổng tiền, mapping
   mơ hồ, gói thiếu giờ tối thiểu, đơn không khớp gói/phòng, quy tắc chồng nhau.
   Chưa chạy file, chưa có kết quả DB thật. Lưu từng result set và thời điểm.
2. **Mapping:** từng phòng + hình thức → gói nguồn, giá, số giờ, hiệu lực và quy
   tắc nguồn. Nhiều gói cùng hình thức hoặc giá phòng khác giá gói là blocker;
   không tự chọn MIN/MAX hoặc gói đầu tiên.
3. **Lịch sử:** lưu bản gói/quy tắc và mapping trước chuyển đổi. Chỉ backfill
   snapshot có thể xác minh; giá gói hôm nay không chứng minh giá lúc đặt cũ.
   Không tính lại `tien_phong` hay `tong_tien` của đơn cũ.
4. **Mở rộng schema riêng:** thêm giờ tối thiểu, mở bán, cấu hình giờ chung và
   snapshot; đổi CHECK hình thức bằng migration riêng khi mapping đã chốt.
   Giữ bảng/cột cũ trong giai đoạn tương thích. Không tự mặc định mở bán.
5. **Triển khai:** backend đọc giá mới và kiểm tra hình thức, tính giá tại server,
   bỏ yêu cầu gói cũ cho đơn mới khi chuyển đổi hoàn tất. Đồng bộ quản lý phòng,
   lịch, tạo đơn, API công khai `HomestayService.danhSachPhong` (cũng đọc gói),
   giao diện `GoiGiaCombo` và consumer ngoài repo.
6. **Đối chiếu:** số dòng phòng/đơn/quy tắc, tổng tiền theo trạng thái/hình thức;
   test đơn cũ, ba hình thức, bật/tắt mở bán, giá lịch, phụ thu, combo, chống
   trùng đồng thời, khóa lịch và rollback trên staging. Không còn writer cũ.
7. **Loại bỏ riêng:** audit lại dependency, bỏ FK/cột gói ở đơn, chuyển hết quy
   tắc, cuối cùng xóa bảng bằng RESTRICT. Không CASCADE. Chưa cung cấp SQL xóa
   tự động trong lần này; chưa được chạy SQL trên Supabase.
8. **Rollback:** trước loại bỏ chỉ quay về backend cũ nếu dữ liệu gói/cột cũ còn
   được duy trì đầy đủ. Sau loại bỏ phải phục hồi backup cùng phiên bản code,
   có cách xử lý đơn phát sinh sau backup; không tạo lại bảng rỗng.

## Kết quả hiện tại

Đã rà soát phụ thuộc từ code/schema trong Git; chưa truy cập dữ liệu Supabase,
chưa xác nhận FK/trigger thực tế. Không chạy SQL hay xóa dữ liệu. Đây là phương
án chính theo yêu cầu được làm rõ; các tài liệu cũ cùng thư mục chỉ tham khảo,
không được chạy toàn bộ file SQL như một chuỗi migration.

# Đồng bộ tên đơn và ba kiểu đặt

Code dùng trực tiếp `phong_id` + `hinh_thuc_dat`, không còn yêu cầu `goi_gia_id`.
Tên hiển thị “Loại phòng muốn đặt” là chọn Theo giờ / Theo ngày / Qua đêm;
DB lưu đúng ba giá trị `Theo giờ`, `Theo ngày`, `Theo đêm`.

## Thay đổi schema

- `dat_phong.ten_don`: bắt buộc 1–150 ký tự; đơn cũ lấy mã đơn làm tên.
- `dat_phong.cau_hinh_gia_chot`: snapshot giá, số giờ tối thiểu, giờ nhận/trả và
  số tiền chốt để thay giá phòng/thiết lập không làm thay đổi đơn đã lưu.
- `dat_phong.goi_gia_id`: nullable, giữ FK cũ cho lịch sử. Đơn mới không sử dụng.
- `phong.so_gio_toi_thieu`: số nguyên 1–744; giá giờ là giá trọn N giờ đầu.
- Ba cột `cho_dat_theo_gio/ngay/dem`: bật/tắt từng kiểu, riêng trạng thái vận hành.
- Giá phòng có sẵn khác 0 được giữ; giá còn 0 và giờ tối thiểu được chuyển từ
  gói đang bán khi duy nhất. Nếu có cấu hình xung đột migration rollback.
- `cau_hinh_gio_dat_phong`: một cấu hình dùng chung trên DB, RLS và không cấp
  quyền trực tiếp cho anon/authenticated. API quản trị đọc/ghi sau kiểm tra quyền.
- Quy tắc cũ đang hiệu lực được nhân theo các phòng của loại tương ứng, giữ ưu
  tiên và ID nguồn trong `gia_lich_phong`. Không suy diễn gói ngày từ tên gói.
- Đồng bộ tên cột số điện thoại người dùng sang `so_dien_thoai` nếu DB chỉ có
  tên cũ `so_dien_tho`. Không sửa cột điện thoại của chi nhánh.
- Không xóa bảng gói/quy tắc cũ, đơn cũ hay FK ngoài repository. Runtime mới đã
  ngừng đọc gói; giữ các bảng cũ để bảo toàn lịch sử và dễ đối chiếu.
- Không thay exclusion constraints/trigger chống đặt trùng.

## Áp dụng

Phiên làm việc chưa có DATABASE_URL/kết nối Supabase nên chưa áp dụng lên DB thật.
User đã cho phép migration; không cần một bước xác nhận bổ sung.

Dừng backend cũ và dùng terminal tại thư mục `may-chu`, với `.env` có DATABASE_URL
hiện tại của dự án. Chạy sau các migration nền tảng và lịch/đơn/combo đã có:

```powershell
npm.cmd run db:dong-bo-dat-phong
```

Runner dùng một transaction, khóa migration, đối chiếu số đơn và tổng tiền
trước/sau, rollback nếu lỗi, ghi phiên bản để không chạy trùng lần sau. Node 24
được dùng với system CA; không tắt kiểm tra TLS. Không chạy đồng thời trực tiếp
file SQL và runner; nếu đã chạy SQL trực tiếp thì không chạy lại runner.

Sau migration, chạy code backend và frontend mới cùng nhau. Vào Lịch → Thiết
lập → Điều chỉnh giờ → Lưu khung giờ. Nếu trước đây đã tùy chỉnh trên trình
duyệt, nhấn “Dùng thiết lập cũ trên máy”, kiểm tra rồi lưu để đưa lên DB.

Giờ được tải từ DB mỗi lần mở tạo đơn. Backend kiểm tra lại toàn bộ khung giờ,
giờ tối thiểu, kiểu mở bán và sức chứa. Khi thiết lập đã đổi, form dùng giờ cũ
bị từ chối và cần tải lại; không âm thầm lưu sai thời gian.

## Kiểm tra

- Build TypeScript/backend và frontend.
- 8 unit test kiểm tra ba kiểu, giờ tối thiểu, khung qua nửa đêm, giờ ngoài khung,
  thiết lập thay đổi và mốc giờ không hợp lệ.
- Migration thử trên PostgreSQL WASM cục bộ với schema nguồn và các migration
  tiền đề: giữ tiền đơn cũ, chuyển giá/giờ/quy tắc, thêm tên đơn, tạo đơn Theo ngày
  không gói, tìm tên đơn, lưu snapshot và từ chối trùng lịch/sức chứa/khung giờ cũ.
- Đây không phải kết quả áp dụng hay kiểm thử trên Supabase thật.

## Rollback

Transaction thất bại tự rollback. Sau khi đã có đơn kiểu Theo ngày, không quay
về backend cũ vốn chỉ hiểu gói giờ/đêm. Giữ schema mở rộng và khôi phục phiên
bản code phù hợp; không DROP cột/tính lại tiền đơn để ép tương thích code cũ.

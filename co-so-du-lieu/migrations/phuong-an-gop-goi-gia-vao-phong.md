> Cập nhật: đã chuẩn bị migration 01/02 và code mới. Xem [hướng dẫn triển khai hiện tại](HUONG-DAN-AP-DUNG-GOP-GIA.md). Nội dung dưới đây ghi nhận khảo sát trước triển khai; chưa chạy SQL trên Supabase.

# Phương án B: chuyển goi_gia vào phong (CHƯA THỰC THI)

## Kiểm tra trước
Chạy file `kiem-tra-truoc-gop-goi-gia.sql` trong Supabase SQL Editor. File chỉ SELECT; phải lưu kết quả và backup DB. Không thể xác nhận FK/dữ liệu thật chỉ bằng schema trong GitHub.

## Các phụ thuộc đã xác định trong schema nguồn
- `dat_phong.goi_gia_id` NOT NULL, FK RESTRICT tới `goi_gia.id`.
- `quy_tac_gia.goi_gia_id` FK CASCADE tới `goi_gia.id`.
- `goi_gia.loai_phong_id` FK tới `loai_phong.id`; gói dùng chung theo loại phòng, không theo từng phòng.
- `goi_gia` có `hinh_thuc_dat` chỉ 'Theo giờ' và 'Theo đêm'; chưa có 'Theo ngày'.
- Backend `bookingOptions` và `createBooking` vẫn JOIN goi_gia; frontend Tạo đơn đang dùng ánh xạ tương thích.
- Các thành phần khác có thể phụ thuộc `goi_gia` (view, function, RLS, trigger) phải kiểm tra trong DB thực tế.

## Thiết kế đích
- `phong`: giá N giờ đầu, `so_gio_toi_thieu`, phụ thu giờ, giá ngày, giá đêm; trạng thái mở bán riêng cho giờ/ngày/đêm, không dùng `trang_thai_van_hanh` để thay thế.
- `gia_lich_phong`: giá ngoại lệ theo thời gian, có thể cần giờ tối thiểu và phụ thu riêng; quy tắc ưu tiên giá ngoại lệ phải xác định rõ.
- `dat_phong`: giữ `phong_id`, lưu `hinh_thuc_dat` với 3 giá trị 'Theo giờ','Theo ngày','Theo đêm'; bỏ `goi_gia_id` chỉ sau khi migrate dữ liệu và mọi API. Lưu snapshot giờ tối thiểu, giá giờ đầu, phụ thu và số giờ được tính để hóa đơn lịch sử không thay đổi khi sửa giá.
- `quy_tac_gia`: chuyển các quy tắc còn dùng sang `gia_lich_phong` hoặc định nghĩa bảng thay thế trước khi xóa.
- `combo`: nếu có `so_gio_bao_gom`, tính giá combo cho N giờ và phụ thu vượt N; nếu không có giờ, cộng giá dịch vụ vào giá phòng.
- Giờ nhận/trả ngày, đêm và khung giờ đặt theo giờ hiện ở `localStorage('lich_phong_gio')`; cần đưa lên DB/API để dùng thống nhất giữa trình duyệt và backend. Không dựa vào localStorage làm nguồn dữ liệu nghiệp vụ.

## Trình tự migration an toàn (chỉ kế hoạch, KHÔNG chạy)
1. Backup schema + dữ liệu và chạy kiểm toán FK, dữ liệu trùng gói, các đơn đang tham chiếu.
2. Đối chiếu từng `goi_gia` với `loai_phong` và `phong`. Nếu nhiều gói có giá khác nhau cùng loại/hình thức, cần quyết định quy tắc chuyển, không tự chọn một giá.
3. Thêm các cột mới vào `phong`, cấu hình giờ chung, snapshot giá trên `dat_phong` và loại hình 'Theo ngày'.
4. Backfill giá và giờ, kiểm tra đối chiếu số lượng và tổng tiền; migrate quy tắc giá.
5. Cập nhật backend tính tiền ở server, kiểm tra thời gian/giờ tối thiểu/khung giờ/trùng lịch/combo và cập nhật mọi frontend.
6. Chạy kiểm thử trên môi trường staging và so sánh dữ liệu trước/sau.
7. Chỉ sau khi xác nhận bằng văn bản: bỏ FK `dat_phong.goi_gia_id`, bỏ `quy_tac_gia.goi_gia_id`/bảng nếu không còn cần, rồi DROP TABLE `goi_gia` KHÔNG CASCADE.
8. Giữ backup và kế hoạch rollback.

## Chưa được phép
Không chạy ALTER/DROP trên Supabase, không xóa dữ liệu cũ, không dùng DROP CASCADE. Đây là tài liệu rà soát và thiết kế.

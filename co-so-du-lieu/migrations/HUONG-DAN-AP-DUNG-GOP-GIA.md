# Gộp gói giá vào phòng — hướng dẫn triển khai

Trạng thái: **chỉ chuẩn bị mã và migration, chưa chạy trên Supabase**. Bản này thay phần triển khai dự kiến trong các kế hoạch cũ. Bản SQL schema gốc là lịch sử, không sửa hoặc chạy lại `homestay.sql` trên DB hiện có.

## Thứ tự triển khai

1. Sao lưu schema/dữ liệu và thử phục hồi. Trên bản sao DB, chạy `kiem-tra-truoc-gop-goi-gia.sql` (READ ONLY) và lưu kết quả. Kiểm tra mọi FK, hàm/trigger/view/RLS, đơn lệch liên kết, các gói trùng, gói thiếu giờ tối thiểu và giá lẻ. Dữ liệu thật chưa được kiểm tra trong đợt viết code này.
2. Kiểm tra DB đã có các migration lịch phòng, dữ liệu khách chưa có tài khoản, bổ sung đơn đặt phòng. Không chạy hàng loạt file cũ: `dong-bo-combo-va-chung-tu.sql` có DROP không thuộc đợt này và không cần chạy để dùng tính năng gộp giá. Migration 01 tự thêm cột combo cần thiết mà không xóa bảng.
3. Trên bản sao DB, áp dụng `gop-goi-gia-01-mo-rong.sql` **một lần**. Nếu tên CHECK thực tế khác schema nguồn, migration sẽ lỗi và rollback; kiểm tra catalog rồi điều chỉnh tên cụ thể, không bỏ mọi CHECK bằng vòng lặp. Giá phòng và tiền đơn cũ giữ nguyên; các hình thức mặc định đóng bán đến khi cấu hình/mapping.
4. Điền `doi_chieu_gop_goi_gia`: một dòng/phòng/hình thức, gói nguồn, số giờ tối thiểu, `gia_phong_truoc`, ghi chú và `da_duyet=true`. Chỉ duyệt sau khi so sánh mọi gói cùng loại/hình thức, trạng thái và quy tắc. Không tự chọn MIN/MAX hoặc dựa tên gói. Gói Theo ngày chỉ có nếu dữ liệu đã hỗ trợ đúng hình thức; mặc định thiết lập giá ngày trực tiếp trên Phòng sau triển khai. Không chuyển đơn đêm lịch sử thành đơn ngày.
5. Áp dụng `gop-goi-gia-02-chuyen-du-lieu.sql`. Migration dừng nếu thiếu mapping, chưa duyệt, sai loại/hình thức, giá phòng đã đổi, giá nguồn có phần lẻ hoặc chưa xác định giờ tối thiểu. Tạo bản sao các dòng phòng trước khi đổi, cập nhật riêng từng hình thức và sao chép quy tắc vào giá lịch cùng thứ tự ưu tiên. Giữ toàn bộ gói và quy tắc nguồn. Migration không chạy lặp; có dữ liệu đã chuyển thì dừng.
6. Đối chiếu từng phòng, từng quy tắc và từng ID đơn cũ với backup. Tổng tiền và liên kết gói của đơn cũ phải giữ nguyên. Kiểm tra cả gói không còn mở bán/không có phòng để quyết định lưu trữ riêng, chưa xóa.
7. Đặt 6 mốc giờ trong `thiet_lap_gio_dat_phong` đúng với Thiết lập Lịch đang dùng (lấy từ trình duyệt cũ trước khi nâng cấp). Bản mở rộng có giờ mặc định; có thể điều chỉnh lại qua trang Lịch. Giờ được lưu server dùng chung cho cả lịch và tạo đơn; localStorage chỉ giữ bản hiển thị.
8. Tạm dừng ghi đơn cũ khi chuyển bản ứng dụng. Triển khai backend + frontend này cùng nhau **sau migration 01/02 và đối chiếu**. Trên Phòng, kiểm tra giá, số giờ tối thiểu và bật mở bán từng hình thức. Không dùng giá 0 để đại diện tạm ngưng. Kiểm tra đặt giờ/ngày/đêm, giá lịch, combo, giá quản trị điều chỉnh, quá giờ, trùng lịch và ngày quá khứ.

## Hành vi mới

- “Loại phòng muốn đặt” chỉ là nhãn của `hinh_thuc_dat`; lựa chọn Theo giờ / Theo ngày / Qua đêm. DB lưu Theo đêm cho nhãn Qua đêm. Không tạo cột/loại phòng nghiệp vụ mới.
- Ngày chọn trong RangePicker là ngày bắt đầu và ngày áp dụng cuối cùng, giống tạo lịch. Nếu giờ trả <= giờ nhận, giờ trả nằm ngày kế tiếp sau ngày áp dụng cuối. Theo giờ chọn ngày/giờ trả thực tế; không tự đẩy qua ngày.
- `gia_moi_gio` là giá trọn N giờ đầu, N = `so_gio_toi_thieu`; mỗi giờ vượt làm tròn lên và tính phụ thu. Đơn phải đủ N giờ. Ngày/đêm tính từng khung áp dụng, lấy giá lịch tại giờ bắt đầu mỗi khung, ưu tiên cao hơn rồi lịch mới hơn; không tính cứng 22/12 giờ. Combo có giờ thay giá giờ đầu; combo dịch vụ cộng thêm. Combo giờ chỉ dùng với đơn giờ.
- API báo giá và tạo đơn cùng dùng bộ tính giá server. Giá gốc được tính lại khi lưu; nếu khác báo giá thì yêu cầu lấy lại. Quản trị vẫn có thể chốt tiền khác giá gốc; snapshot ghi người tạo, giá gốc, giá chốt và nguồn quy tắc. Không tin giá gốc phía client. Không tự xác nhận thanh toán.
- Đơn mới không cần `goi_gia_id`. Đơn cũ giữ nguyên FK/gói/số tiền, snapshot mới để NULL nếu không có bằng chứng lịch sử. Ràng buộc EXCLUDE và trigger khóa lịch giữ nguyên; backend khóa dòng phòng khi báo giá/tạo đơn.
- Đọc giá homestay chuyển sang phòng. Mục Combo giữ lại, bỏ tab Gói giá. API tạo/sửa combo chưa thuộc thay đổi này.

## Rollback và pha xóa

Trước khi có đơn mới theo schema mới, có thể quay lại ứng dụng cũ cùng cấu hình/giá phòng từ backup. Sau khi đã phát sinh đơn mới không có gói hoặc Theo ngày, **không** chỉ triển khai lại ứng dụng cũ hoặc khôi phục CHECK/NOT NULL; phải giữ dịch vụ tương thích và lập phương án đối chiếu đơn mới. Không tự khôi phục bản backup cũ làm mất giao dịch mới.

**Không có DROP bảng/cột gói giá trong đợt này.** `dat_phong`, `quy_tac_gia`, bảng mapping và FK mới của giá lịch còn giữ dữ liệu nguồn. Chỉ viết pha xóa sau khi audit DB thật, chốt phương án lưu trữ và kiểm tra các dịch vụ khác. Không dùng CASCADE.

## Kiểm thử

`npm run build` tại cả `trang-web` và `may-chu`; `npm test` tại `may-chu`. Kiểm thử migration dùng PostgreSQL PGlite với fixture tối thiểu, xác minh mapping nhiều hình thức, quy tắc, tiền/ID đơn cũ và rollback khi xung đột. Đây không thay thế kiểm thử Supabase, Auth/RLS, EXCLUDE hoặc giao dịch cạnh tranh trên bản sao production.

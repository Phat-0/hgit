# Đặt phòng, khoảng đệm và hồ sơ khách — 19/11/2026

## Đã sửa

- Báo giá/tìm phòng ở web khách không còn dùng trạng thái hiện tại “Đang sử dụng/Đang dọn” để cấm mọi lịch tương lai. Lịch nhận sau hơn 30 phút được kiểm tra theo khoảng đặt; phòng bảo trì/bị khóa vẫn bị chặn. Lịch nhận gần hiện tại vẫn yêu cầu phòng trống/sạch.
- Tìm phòng, báo giá và tạo đơn tính khoảng cách tối thiểu 30 phút giữa hai lượt cùng phòng. DB có EXCLUDE bổ sung để chặn cả yêu cầu đồng thời và ghi trực tiếp. Tính khoảng [nhận, trả + 30 phút), không cộng cả hai đầu thành khoảng cách 60 phút. Ví dụ trả 12:00 thì nhận kế tiếp sớm nhất 12:30. Không ghi khóa vệ sinh rời, nên không có khóa mồ côi khi sửa/hủy/hết hạn. Các vùng đệm có thể chồng nhau.
- Sau checkout giữ 30 phút từ giờ trả thực tế, nếu chưa ghi thì theo giờ dự kiến; trigger riêng chặn lách qua thao tác đánh dấu sạch. Điều kiện phòng sạch/bảo trì vẫn độc lập với khoảng đệm. Lịch khóa thủ công giữ nguyên phạm vi, không tự cộng đệm.
- Chi tiết đơn hiển thị tất cả combo chốt của đơn, mã voucher, nhận sớm/trả muộn và phụ thu đã nằm trong tiền phòng. Không cộng lại combo/phụ thu một lần nữa vào tổng.
- Trang **Khách hàng → Thêm khách → Tạo tài khoản đăng nhập**: nhập email, mật khẩu ban đầu (12–128 ký tự), tên và điện thoại. Backend tạo Supabase Auth, chỉ cấp vai trò Khách hàng, tạo hồ sơ; chỉ quản trị hệ thống có quyền. Mật khẩu không ghi DB nghiệp vụ/nhật ký. Không xác minh giả số điện thoại, không gán đơn cũ theo số chưa xác minh. Nếu chỉ lưu hồ sơ, bỏ lựa chọn tạo tài khoản. Không tự gửi email/SMS với mật khẩu.

## Các bảng

Đã kiểm tra cả tham chiếu backend và số dòng thực tế: `chi_tiet_dat_phong`, `chung_tu_thanh_toan`, `goi_gia`, `quy_tac_gia`, `phan_tich_ai` đều đang có 0 dòng (thời điểm rà soát).

- `chi_tiet_dat_phong`: hiện dư so với luồng đang dùng. Đây là các dòng dịch vụ/combo của đơn theo thiết kế cũ; màn hình chi tiết dùng `dat_phong`, `combo_id`, `cau_hinh_gia_chot.combo_ids/combo_da_chon`. Không cần ghi song song hai nơi. Chưa xóa bảng/FK.
- `chung_tu_thanh_toan`: chưa dùng. Ảnh ở đơn hiện dùng `anh_don_dat_phong`, file trong bucket riêng tư `anh-don`, backend kiểm quyền và cấp URL có hạn. Chứng từ sổ thu chi dùng `chung_tu_thu_chi`.
- `goi_gia`, `quy_tac_gia`: không có luồng nghiệp vụ hiện tại đọc/ghi. Giá đang lấy từ `phong`, `gia_lich_phong` và `cau_hinh_gio_dat_phong`; tính giá theo lịch không chạy song song bảng cũ. Không xóa các bảng vì cần migration rà FK khi dọn thiết kế cũ.
- `khoa_chong_lap_yeu_cau`: chưa dùng bảng này. Chống gửi lại đơn bằng UUID `dat_phong.khoa_yeu_cau`, UNIQUE và advisory lock trong transaction; cùng khóa trả về đơn cũ, không tạo thêm/voucher không trừ thêm. Chat dùng `ma_phia_khach` + UNIQUE. Chống hai người đặt cùng phòng khác với chống gửi lặp: dùng khóa hàng phòng, EXCLUDE thời gian và kiểm tra lịch khóa; nay thêm EXCLUDE đệm 30 phút. Frontend cũng chặn gửi khi đang xử lý, nhưng backend/DB mới là nơi đảm bảo.

## Hồ sơ khách và AI trong đề cương

Tài khoản dùng đăng nhập/phân quyền; hồ sơ dùng lưu nhu cầu và chăm sóc khách. Tần suất, lượt ở/hủy, giá trị đơn, thời gian trung bình, chi nhánh/loại đặt thường dùng được tính từ các đơn thực tế, không phải AI đoán. Sở thích, ngân sách, số khách thường đi và ghi chú lưu trong hồ sơ, có nguồn cung cấp.

Đề cương mô tả: hội thoại → mô hình AI → trích xuất có cấu trúc → kiểm tra đầu ra → cập nhật các trường được phép vào hồ sơ. Các thông tin gồm nhu cầu, sở thích, ngân sách, loại phòng, khung giờ, số khách, mức độ hài lòng.

`phan_tich_ai` là nơi lưu bản phân tích và trạng thái duyệt, không phải lịch sử câu trả lời. Hiện chatbot đã có bản nháp nhu cầu trong `chatbot_tac_vu.nhu_cau`, nhưng chưa có quy trình duyệt và cập nhật hồ sơ từ bảng `phan_tich_ai`.

Để hoàn thiện phần này cần:

1. Chỉ phân tích hội thoại đúng khách, theo phạm vi cho phép và đồng ý đã ghi nhận. Không ghép khách chỉ vì trùng tên/số chưa xác minh.
2. Trích xuất JSON theo danh sách trường cố định; kèm mã tin nhắn/câu dẫn chứng. Không suy diễn thuộc tính nhạy cảm, không thay tài khoản/quyền/đơn/thanh toán.
3. Kiểm tra kiểu dữ liệu, giới hạn giá trị và nguồn dẫn chứng ở backend; lưu `phan_tich_ai` với trạng thái Chờ kiểm tra.
4. Thêm mục “AI đề xuất” ngay trong hồ sơ khách: xem nguồn, sửa, duyệt hoặc từ chối. Chỉ trường được chọn mới cập nhật, không ghi đè thông tin khách đã xác nhận; ghi nhật ký người duyệt và chống duyệt lặp.
5. Dữ liệu đã duyệt mới dùng gợi ý phòng/combo; vẫn tra giá và phòng trống theo thời gian thực.

Lần sửa này bổ sung tài khoản khách, sửa đặt phòng/chi tiết và khoảng đệm; chưa tự bật phân tích hội thoại/cập nhật hồ sơ bằng AI.

## Kiểm tra và triển khai

- Migration `20261119081407_dem_30_phut_dat_phong.sql` và `20261119082342_dem_sau_checkout.sql`; không xóa dữ liệu.
- Môi trường mới: chạy `npm run db:dem-30` trong `may-chu` sau các migration hiện có. Script bỏ qua phiên bản đã áp dụng, xác minh TLS.
- Kiểm thử PostgreSQL giả lập: 29 phút bị chặn, đúng 30 phút được đặt, trước/sau, sửa, hủy, giữ đệm sau checkout; tạo tài khoản đúng quyền và không lộ mật khẩu. Kiểm thử giao diện dùng báo giá thật nhưng giả lập bước ghi đơn/tạo tài khoản để không để lại dữ liệu kiểm thử.

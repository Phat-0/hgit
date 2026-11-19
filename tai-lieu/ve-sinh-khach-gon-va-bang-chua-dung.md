# Vệ sinh, khách hàng và bảng chưa dùng — 19/11/2026

## Vệ sinh

- Hai mục: Chưa hoàn thành / Hoàn thành. Thẻ chỉ hiện mã phòng và giờ Out, không hiện người nhận/chi nhánh/ô ghi chú. Thông báo ở chuông dùng cùng thẻ.
- Mỗi việc chưa xong có nút Xác nhận đã hoàn thành và thông báo hỏi lại. Nhân viên có quyền ở đúng chi nhánh được hoàn tất trực tiếp, không bắt nhận việc trước. Người hoàn tất vẫn được ghi nội bộ trong báo cáo/nhật ký.
- Chỉ hoàn tất sau khi đơn đã trả phòng. Backend khóa công việc và đọc khóa trạng thái đơn; bấm lại việc đã xong không tạo thêm báo cáo. Không tự trả phòng thay nhân viên, không mở phòng bảo trì/khóa hoặc phòng còn đơn nhận khác.
- Quá 30 phút sau Out chưa hoàn thành: đưa lên đầu, khung màu cảnh báo và biểu tượng. Out ưu tiên giờ trả thực tế, nếu chưa có thì dùng giờ dự kiến. Trang cập nhật mỗi 30 giây; chuông mỗi 10 giây. Hoàn thành không còn cảnh báo.
- Giữ nhắc trước Out 15 phút theo chi nhánh. Khi lịch/phòng thay đổi, công việc chưa hoàn thành cập nhật theo. Thông báo cũ trong chuông đọc trạng thái/giờ Out hiện tại thay vì dùng bản chụp cũ.

## Khách hàng

Bỏ tiêu đề lặp, xuất CSV, chọn hồ sơ lưu trữ, nhãn Sắp xếp, nhóm điểm chung phía trên bảng và form hồ sơ dài. Bộ lọc nhỏ, số đơn tối thiểu là placeholder trong ô. Cột Đơn / hủy thay Đơn / lượt ở; chọn dòng xem lịch sử đơn. Tạo tài khoản khách vẫn ở nút Thêm khách, mở cửa sổ gọn.

Cột Hồ sơ có biểu tượng cho tài khoản khách đã gắn dữ liệu đăng nhập (`u:`), khách vãng lai (`p:`/`o:`) không có. Bấm biểu tượng mở cửa sổ gồm:

- Ngân sách đã ghi nhận; nếu AI có trích xuất ngân sách từ nguồn rõ ràng thì hiển thị như thông tin tham khảo, không suy ngân sách từ giá đơn.
- Phòng thường đặt, loại đặt, giờ nhận/trả thường dùng, thời lượng trung bình: tính từ đơn xác nhận/nhận/trả, không tính đơn hủy vào thói quen lưu trú.
- Ghi chú hồ sơ và nhóm ghi chú đơn trùng nhau, có số lần và xem đầy đủ.
- Câu hỏi/yêu cầu AI tóm tắt, có trích dẫn. Khi cập nhật AI, lấy thêm ghi chú đơn đúng tài khoản trong giới hạn nguồn hiện tại; kiểm tra lại đơn/hội thoại còn đúng chủ trước khi lưu.
- Xác nhận đồng ý AI được thu gọn ngay trong cửa sổ; không còn form sửa hồ sơ dài. Không tự sửa ngân sách/sở thích/đơn. Khách chưa có hội thoại hỗ trợ vẫn xem thống kê và ghi chú, chưa tạo bản AI nếu không có nguồn hội thoại để gắn bảng phân tích hiện có.

## Rà soát DB hiện tại

Đối chiếu 60 bảng public trên DB, mã backend/web hiện tại, scripts/migrations và hàm public. Repository hiện chưa có mã ứng dụng di động. Không đồng nhất “có tên trong mã” với “đã có đủ chức năng”.

**5 bảng chưa được luồng nghiệp vụ đọc/ghi, đều có 0 dòng lúc rà soát:**

| Bảng | Tình trạng |
|---|---|
| chi_tiet_dat_phong | Thiết kế dòng dịch vụ cũ; đơn hiện dùng combo_id và snapshot combo/giá. |
| chung_tu_thanh_toan | Chưa có luồng chứng từ giao dịch riêng; ảnh đơn dùng anh_don_dat_phong, báo cáo dùng chung_tu_thu_chi. |
| goi_gia | Giá cũ, không tham gia tính giá hiện tại (giá phòng/lịch giá đã thay thế). |
| quy_tac_gia | Quy tắc giá cũ theo gói; lịch hiện dùng gia_lich_phong. |
| khoa_chong_lap_yeu_cau | Chống lặp hiện dùng khóa yêu cầu riêng của đơn/tin nhắn và ràng buộc DB. |

Không thấy hàm public đọc/ghi 5 bảng trên. Không xóa bảng/FK/dữ liệu trong lần sửa này. migrations_ung_dung dùng cho triển khai, không phải bảng nghiệp vụ bỏ quên.

**Các phần đã dùng nhưng còn thiếu:**

| Bảng/nhóm | Phần còn thiếu |
|---|---|
| thiet_bi_thong_bao | Đã có API lưu/thu hồi token; chưa cấu hình gửi FCM đến app chạy nền. |
| dich_vu, combo_dich_vu | Đang tra cứu/kiểm tra phạm vi; chưa có luồng quản trị danh mục/gán dịch vụ và số lượng hoàn chỉnh. |
| tien_nghi, phong_tien_nghi | Đang đọc để hiển thị; chưa có luồng quản trị danh mục/gán tiện nghi đầy đủ. |
| hinh_anh_homestay | Đang đọc; chưa có quản trị ảnh chi nhánh nhất quán qua bảng này. |
| thanh_toan | Có đọc/đối soát; thao tác hiện ghi nhận tiền trên đơn, chưa có quy trình giao dịch/hoàn tiền đầy đủ. |

phan_tich_ai, ho_so_khach_hang, so_thich_khach_hang, cong_viec_ve_sinh, bao_cao_ve_sinh và lich_su_dang_nhap đã nối chức năng, không còn nằm trong danh sách bảng chưa dùng.

# Khách hàng, vệ sinh, lịch sử và voucher

## Chức năng đã nối

- **Vệ sinh:** máy chủ quét mỗi 30 giây. Đơn đang nhận phòng vào 15 phút cuối trước checkout tạo một công việc và thông báo cho tất cả nhân viên vệ sinh đang hoạt động, còn phân công đúng chi nhánh. Gửi lại cùng mốc checkout không nhân thông báo. Checkout thay đổi được nhắc lại ở mốc mới. Khách trả sớm cũng tạo công việc sau khi trả. Không tự cho vệ sinh/đánh dấu phòng trống khi khách còn ở. Người nhận việc báo hoàn tất sau khi đơn đã trả phòng; lưu báo cáo trong `bao_cao_ve_sinh`. Không đổi phòng bảo trì/bị khóa thành trống. Nhắc trong web cần backend đang chạy; chưa gửi FCM.
- **Khách hàng (quản trị hệ thống):** khách có tài khoản và khách đặt qua điện thoại; lịch sử đơn, số đơn/lượt ở/hủy, giá trị đơn và tiền đã ghi nhận, nhịp đặt, loại đặt/phòng/chi nhánh chung, sở thích, bộ lọc, sắp xếp và CSV. Có thêm/sửa/lưu trữ hồ sơ, sở thích và nguồn xác nhận. Không tự tạo tài khoản Auth cho khách chưa đăng ký. Không tự gộp người chỉ vì trùng tên. Thống kê theo tối đa 1.000 khách trong bộ lọc; lịch sử chi tiết tối đa 500 đơn. Hồ sơ/sở thích lưu riêng, dữ liệu tần suất được tính từ đơn. Muốn phân tích AI phải có đồng ý và nguồn xác nhận; chưa tự chạy phân tích/cập nhật hồ sơ bằng AI.
- **Lịch sử (quản trị hệ thống):** lọc theo thời gian/nhóm/thao tác/người thực hiện, phân trang và xem nội dung. Gom nhật ký hệ thống, đăng nhập, thay đổi đơn, trigger trạng thái đơn, thu chi và tác vụ AI. Che trường token, mật khẩu, secret trong JSON. Đăng nhập email mới ghi kết quả, IP hợp lệ và user agent; không lưu mật khẩu/token. Không phục dựng sự kiện quá khứ chưa được ghi.
- **Voucher trong Combo:** tạo/sửa/tạm ngưng; phần trăm/số tiền, giảm tối đa, đơn tối thiểu, thời hạn, chi nhánh và lượt dùng. Gửi thông báo voucher tới tài khoản khách được chọn, không gửi lặp; sao chép mã để gửi qua kênh khác. Đây là mã dùng chung theo điều kiện chiến dịch, không phải mã độc quyền cho riêng người được gửi. Khách đăng nhập xem voucher trong biểu tượng thông báo trên web, đánh dấu đã đọc và sao chép mã để nhập khi đặt. Không tự gửi email/SMS/Zalo.
- **Đặt phòng:** nhập voucher ở cả trang khách và tạo/sửa đơn quản trị. Máy chủ kiểm tra lại, khóa voucher và ghi lượt cùng giao dịch tạo/sửa đơn. Không tin mức giảm từ client. Một đơn một voucher, áp trên tổng giá phòng/combo/phụ thu; đơn hủy, không nhận phòng hoặc giữ chỗ hết hạn không chiếm lượt. Voucher thay đổi giá trị phải qua kiểm tra tiền đã thu, không tự hoàn tiền. Gửi lại cùng khóa yêu cầu tạo đơn không trừ thêm lượt.
- **Chuẩn bị app:** `POST /api/khach/thiet-bi` nhận `ma_thiet_bi`, `nen_tang` (Android/iOS/Web); `DELETE` cùng đường dẫn chỉ thu hồi token thuộc tài khoản hiện tại. `GET /api/khach/thong-bao`, `PUT /api/khach/thong-bao/:id/doc` chỉ truy cập thông báo của tài khoản đăng nhập. Cần cấu hình Firebase/FCM và ứng dụng đăng ký token để có push khi app chạy nền; lần này mới có API và lưu token.

## Các bảng dễ nhầm

| Bảng | Vai trò thực tế |
|---|---|
| `dat_phong` | Đơn chính, phòng, thời gian, khách, tiền và trạng thái; màn hình chi tiết đơn đang dùng bảng này |
| `chi_tiet_dat_phong` | Các dòng dịch vụ/combo có số lượng, đơn giá chốt; khác màn hình chi tiết. Nhiều combo hiện đã chốt trong `dat_phong.cau_hinh_gia_chot`, chưa ghi lặp vào bảng này |
| `chung_tu_thu_chi` | Ảnh/tệp gắn với sổ thu chi trong báo cáo, đang dùng |
| `chung_tu_thanh_toan` | Chứng từ gắn giao dịch thanh toán của đơn; chưa dùng, không phải nơi báo cáo hiện đang lưu tệp |
| `phan_tich_ai` | Nơi dự kiến lưu bản tóm tắt/trích xuất nhu cầu từ hội thoại, có trạng thái chờ duyệt. Không phải AI trả lời trực tiếp; nhu cầu nháp hiện nằm trong `chatbot_tac_vu.nhu_cau` |
| `goi_gia`, `quy_tac_gia` | Thiết kế cũ theo gói/loại phòng. Luồng hiện dùng giá trong `phong`, `gia_lich_phong` và cấu hình giờ. Chưa chạy song song nên không gây tính giá hai lần. Giữ nguyên, không xóa FK/bảng hoặc dựng lại trang trùng; xử lý riêng theo kế hoạch gộp giá khi cần |
| `khoa_chong_lap_yeu_cau` | Chưa được dùng. Tạo đơn đã có `dat_phong.khoa_yeu_cau` + khóa giao dịch và UNIQUE; chat có `ma_phia_khach` + UNIQUE/ON CONFLICT. Không nhầm chống gửi lại với chống trùng lịch phòng (EXCLUDE/range). Đề cương đặt yêu cầu kiểm soát đồng thời/chống trùng, không bắt buộc phải dùng bảng phụ này |

## Triển khai

Migration `20261118205919_khach_hang_voucher_ve_sinh.sql`: thêm khóa hồ sơ cho khách chưa có tài khoản, cho phép `nguoi_dung_id` rỗng ở hồ sơ; chỉ mục vệ sinh; bổ sung quyền vệ sinh cho vai trò tương ứng. Giữ RLS và thu hồi quyền Data API trực tiếp đối với dữ liệu riêng. Không xóa bảng/dữ liệu cũ.

Chạy `npm run db:van-hanh` trong `may-chu` trên môi trường mới, sau đó build/khởi động lại backend. Vai trò quản trị hệ thống thấy Khách hàng và Lịch sử. Vai trò nhân viên vệ sinh thấy Vệ sinh và chuông thông báo; nhân viên chỉ xem/nhận việc ở chi nhánh được giao.

## Giới hạn API AI

Quota Gemini tính theo project, không theo API key. Xoay nhiều khóa cùng project không tăng quota. Khác project có thể có quota riêng, nhưng không cam kết tăng tuyến tính số tin: một tin có thể gọi nhiều lần và còn giới hạn RPM/TPM/RPD, model, billing và tài khoản. Chưa bổ sung cơ chế xoay khóa; vận hành đúng quota và xin nâng hạn mức khi cần.

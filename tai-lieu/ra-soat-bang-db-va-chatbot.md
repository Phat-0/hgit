# Rà soát bảng DB và chức năng — 19/11/2026

> Đây là ảnh chụp trước khi bổ sung khách hàng, vệ sinh, lịch sử và voucher. Tình trạng mới xem [Vận hành khách, voucher và vệ sinh](van-hanh-khach-voucher-ve-sinh.md).

Đối chiếu 60 bảng public trên Supabase với mã backend, web và thư mục di động; rà hàm DB cho các bảng không xuất hiện trong code. Đây là kiểm tra tĩnh luồng sử dụng, không phải kết luận mọi chức năng có tham chiếu đã hoàn thiện. Không thay đổi schema hoặc xóa dữ liệu.

## Những bảng chưa nối vào luồng chạy

12 bảng dưới đây có 0 dòng tại thời điểm đọc DB. Tách cấu trúc cũ/cơ chế thay thế để tránh xây chức năng chỉ nhằm dùng hết bảng.

| Bảng | Tình trạng | Chức năng tương ứng / hướng xử lý |
|---|---|---|
| `cong_viec_ve_sinh` | Chưa nối nghiệp vụ | Giao việc theo phòng, nhân viên nhận việc, hạn và trạng thái hoàn thành. Hiện chỉ có trạng thái phòng. |
| `bao_cao_ve_sinh` | Chưa nối nghiệp vụ | Báo cáo hoàn tất vệ sinh, ảnh trước/sau, kiểm tra lại phòng. |
| `chi_tiet_dat_phong` | Chưa nối nghiệp vụ | Hạng mục dịch vụ có số lượng/đơn giá chốt trên đơn. Combo hiện đã lưu snapshot trong dat_phong, không cần ghi lặp chỉ để dùng bảng. |
| `chung_tu_thanh_toan` | Chưa nối nghiệp vụ | Khách gửi biên nhận, nhân viên kiểm tra và đối soát theo đơn. Chứng từ thu chi đang dùng chung_tu_thu_chi; ảnh đơn dùng anh_don_dat_phong. |
| `ho_so_khach_hang` | Chưa nối nghiệp vụ | Hồ sơ khách quản lý tập trung; cần phân quyền nhân viên và chủ hồ sơ. |
| `so_thich_khach_hang` | Chưa nối nghiệp vụ | Sở thích được khách đồng ý lưu hoặc nhân viên xác nhận; không tự ghi suy đoán của AI. |
| `phan_tich_ai` | Chưa nối nghiệp vụ | Kho bản phân tích/tóm tắt AI chờ duyệt. Bản nháp nhu cầu hiện nằm ở chatbot_tac_vu.nhu_cau; tránh nhân đôi nếu không cần quy trình duyệt riêng. |
| `lich_su_dang_nhap` | Chưa nối nghiệp vụ | Nhật ký đăng nhập cho người dùng/quản trị. Supabase Auth xử lý xác thực; bảng public này chưa được ứng dụng ghi. |
| `thiet_bi_thong_bao` | Chưa nối nghiệp vụ | Đăng ký token thiết bị và gửi push Android/iOS, thu hồi token khi đăng xuất. |
| `goi_gia` | Cấu trúc cũ chưa dùng | Giá hiện lấy từ phong/gia_lich_phong; không khôi phục trang gói giá chỉ để dùng bảng. Cần rà FK/migration riêng nếu muốn loại bỏ. |
| `quy_tac_gia` | Cấu trúc cũ chưa dùng | Tham chiếu goi_gia cũ. Lịch giá hiện tại dùng gia_lich_phong; nên chọn một cơ chế giá trước khi mở rộng. |
| `khoa_chong_lap_yeu_cau` | Chưa dùng, đã có cơ chế khác | Tin nhắn dùng ma_phia_khach và UNIQUE/ON CONFLICT; không cần thêm màn hình. Có thể dùng bảng này khi cần chống gửi lặp liên API. |

## Các phần mới dùng một phần

| Bảng | Phần còn thiếu |
|---|---|
| `khuyen_mai` | Đơn quản trị JOIN để hiển thị mã; chưa thấy CRUD chiến dịch và luồng áp mã/tính giảm. |
| `su_dung_khuyen_mai` | JOIN theo đơn; cần ghi lượt dùng và kiểm soát giới hạn khi triển khai voucher. |
| `dich_vu` | Đang được dùng để kiểm tra phạm vi combo; chưa có màn hình CRUD dịch vụ và thêm từng dịch vụ vào đơn. |
| `combo_dich_vu` | Kiểm tra chi nhánh của các dịch vụ khi sửa combo; chưa thấy giao diện thiết lập danh sách dịch vụ/số lượng của combo. |
| `phong_tien_nghi` | Trang khách/AI đọc tiện nghi phòng; chưa có giao diện quản trị danh mục và gán tiện nghi. |
| `tien_nghi` | Danh mục được đọc trên trang khách; cần quản trị danh mục nếu muốn sửa trực tiếp. |
| `hinh_anh_homestay` | API homestay đọc ảnh; cần nối thao tác quản trị ảnh chi nhánh vào bảng này nếu muốn dùng nhất quán. |

## Toàn bộ 60 bảng

Cột bằng chứng chỉ trỏ tới nơi có tên bảng trong mã chạy. Một số tên trùng khóa API/biến, nên không dùng số lần tìm thấy để đánh giá độ hoàn thiện.

| Bảng | Trạng thái | Bằng chứng / ghi chú |
|---|---|---|
| `anh_don_dat_phong` | Có tham chiếu trong mã chạy | [tep-va-chat-don.service.ts](../may-chu/src/quan-tri/tep-va-chat-don.service.ts#L62) · [tep-va-chat-don.service.ts](../may-chu/src/quan-tri/tep-va-chat-don.service.ts#L107) |
| `bao_cao_ve_sinh` | Chưa nối nghiệp vụ | Báo cáo hoàn tất vệ sinh, ảnh trước/sau, kiểm tra lại phòng. |
| `cau_hinh_bieu_do_thu_chi` | Có tham chiếu trong mã chạy | [thu-chi.service.ts](../may-chu/src/quan-tri/thu-chi.service.ts#L469) · [thu-chi.service.ts](../may-chu/src/quan-tri/thu-chi.service.ts#L491) |
| `cau_hinh_gio_dat_phong` | Có tham chiếu trong mã chạy | [trang-khach.service.ts](../may-chu/src/khach-hang/trang-khach.service.ts#L60) · [lich-phong.service.ts](../may-chu/src/quan-tri/lich-phong.service.ts#L44) |
| `cau_hinh_hien_thi_lich` | Có tham chiếu trong mã chạy | [phong.service.ts](../may-chu/src/quan-tri/phong.service.ts#L30) · [hien-thi-lich.service.ts](../may-chu/src/quan-tri/hien-thi-lich.service.ts#L37) |
| `cau_hinh_trang_chu` | Có tham chiếu trong mã chạy | [trang-chu.service.ts](../may-chu/src/quan-tri/trang-chu.service.ts#L185) · [trang-chu.service.ts](../may-chu/src/quan-tri/trang-chu.service.ts#L223) |
| `cau_tra_loi_mau` | Có tham chiếu trong mã chạy | [chat.service.ts](../may-chu/src/khach-hang/chat.service.ts#L556) · [tien-ich-chat.service.ts](../may-chu/src/quan-tri/tien-ich-chat.service.ts#L33) |
| `chan_lich_phong` | Có tham chiếu trong mã chạy | [trang-thai-phong.sql.ts](../may-chu/src/quan-tri/trang-thai-phong.sql.ts#L5) · [lich-phong.service.ts](../may-chu/src/quan-tri/lich-phong.service.ts#L22) |
| `chatbot_cau_hinh` | Có tham chiếu trong mã chạy | [chat.service.ts](../may-chu/src/khach-hang/chat.service.ts#L154) · [chat.service.ts](../may-chu/src/khach-hang/chat.service.ts#L332) |
| `chatbot_kien_thuc` | Có tham chiếu trong mã chạy | [chatbot.service.ts](../may-chu/src/chatbot/chatbot.service.ts#L118) · [chatbot.service.ts](../may-chu/src/chatbot/chatbot.service.ts#L188) |
| `chatbot_tac_vu` | Có tham chiếu trong mã chạy | [chat.service.ts](../may-chu/src/khach-hang/chat.service.ts#L599) · [chat.service.ts](../may-chu/src/khach-hang/chat.service.ts#L642) |
| `chi_tiet_dat_phong` | Chưa nối nghiệp vụ | Hạng mục dịch vụ có số lượng/đơn giá chốt trên đơn. Combo hiện đã lưu snapshot trong dat_phong, không cần ghi lặp chỉ để dùng bảng. |
| `chung_tu_thanh_toan` | Chưa nối nghiệp vụ | Khách gửi biên nhận, nhân viên kiểm tra và đối soát theo đơn. Chứng từ thu chi đang dùng chung_tu_thu_chi; ảnh đơn dùng anh_don_dat_phong. |
| `chung_tu_thu_chi` | Có tham chiếu trong mã chạy | [thu-chi.service.ts](../may-chu/src/quan-tri/thu-chi.service.ts#L67) · [thu-chi.service.ts](../may-chu/src/quan-tri/thu-chi.service.ts#L208) |
| `combo` | Có tham chiếu trong mã chạy | [trang-khach.service.ts](../may-chu/src/khach-hang/trang-khach.service.ts#L263) · [trang-khach.service.ts](../may-chu/src/khach-hang/trang-khach.service.ts#L301) |
| `combo_chi_nhanh` | Có tham chiếu trong mã chạy | [trang-khach.service.ts](../may-chu/src/khach-hang/trang-khach.service.ts#L299) · [trang-khach.service.ts](../may-chu/src/khach-hang/trang-khach.service.ts#L305) |
| `combo_dich_vu` | Mới đọc một phần | [combo.service.ts](../may-chu/src/quan-tri/combo.service.ts#L188). Kiểm tra chi nhánh của các dịch vụ khi sửa combo; chưa thấy giao diện thiết lập danh sách dịch vụ/số lượng của combo. |
| `combo_phong` | Có tham chiếu trong mã chạy | [trang-khach.service.ts](../may-chu/src/khach-hang/trang-khach.service.ts#L300) · [trang-khach.service.ts](../may-chu/src/khach-hang/trang-khach.service.ts#L306) |
| `cong_viec_ve_sinh` | Chưa nối nghiệp vụ | Giao việc theo phòng, nhân viên nhận việc, hạn và trạng thái hoàn thành. Hiện chỉ có trạng thái phòng. |
| `cuoc_tro_chuyen` | Có tham chiếu trong mã chạy | [chat.service.ts](../may-chu/src/khach-hang/chat.service.ts#L29) · [chat.service.ts](../may-chu/src/khach-hang/chat.service.ts#L81) |
| `danh_gia` | Có tham chiếu trong mã chạy | [trang-khach.service.ts](../may-chu/src/khach-hang/trang-khach.service.ts#L105) · [bao-cao.service.ts](../may-chu/src/quan-tri/bao-cao.service.ts#L59) |
| `dat_phong` | Có tham chiếu trong mã chạy | [trang-khach.service.ts](../may-chu/src/khach-hang/trang-khach.service.ts#L53) · [trang-khach.service.ts](../may-chu/src/khach-hang/trang-khach.service.ts#L100) |
| `dich_vu` | Mới đọc một phần | [combo.service.ts](../may-chu/src/quan-tri/combo.service.ts#L188). Đang được dùng để kiểm tra phạm vi combo; chưa có màn hình CRUD dịch vụ và thêm từng dịch vụ vào đơn. |
| `gia_lich_phong` | Có tham chiếu trong mã chạy | [trang-khach.service.ts](../may-chu/src/khach-hang/trang-khach.service.ts#L173) · [trang-khach.service.ts](../may-chu/src/khach-hang/trang-khach.service.ts#L223) |
| `gioi_han_truy_cap` | Có tham chiếu trong mã chạy | [gioi-han.service.ts](../may-chu/src/xac-thuc/gioi-han.service.ts#L28) |
| `goi_gia` | Cấu trúc cũ chưa dùng | Giá hiện lấy từ phong/gia_lich_phong; không khôi phục trang gói giá chỉ để dùng bảng. Cần rà FK/migration riêng nếu muốn loại bỏ. |
| `hinh_anh_homestay` | Mới đọc một phần | [homestay.service.ts](../may-chu/src/homestay/homestay.service.ts#L25). API homestay đọc ảnh; cần nối thao tác quản trị ảnh chi nhánh vào bảng này nếu muốn dùng nhất quán. |
| `hinh_anh_phong` | Có tham chiếu trong mã chạy | [trang-khach.service.ts](../may-chu/src/khach-hang/trang-khach.service.ts#L102) · [trang-khach.service.ts](../may-chu/src/khach-hang/trang-khach.service.ts#L177) |
| `ho_so_khach_hang` | Chưa nối nghiệp vụ | Hồ sơ khách quản lý tập trung; cần phân quyền nhân viên và chủ hồ sơ. |
| `hoi_thoai_don_dat_phong` | Có tham chiếu trong mã chạy | [chat.service.ts](../may-chu/src/khach-hang/chat.service.ts#L227) · [tep-va-chat-don.service.ts](../may-chu/src/quan-tri/tep-va-chat-don.service.ts#L193) |
| `homestay` | Có tham chiếu trong mã chạy | [trang-khach.service.ts](../may-chu/src/khach-hang/trang-khach.service.ts#L21) · [trang-khach.service.ts](../may-chu/src/khach-hang/trang-khach.service.ts#L101) |
| `khoa_chong_lap_yeu_cau` | Chưa dùng, đã có cơ chế khác | Tin nhắn dùng ma_phia_khach và UNIQUE/ON CONFLICT; không cần thêm màn hình. Có thể dùng bảng này khi cần chống gửi lặp liên API. |
| `khuyen_mai` | Mới đọc một phần | [danh-sach-don.sql.ts](../may-chu/src/quan-tri/danh-sach-don.sql.ts#L36). Đơn quản trị JOIN để hiển thị mã; chưa thấy CRUD chiến dịch và luồng áp mã/tính giảm. |
| `lich_su_dang_nhap` | Chưa nối nghiệp vụ | Nhật ký đăng nhập cho người dùng/quản trị. Supabase Auth xử lý xác thực; bảng public này chưa được ứng dụng ghi. |
| `lich_su_dat_phong` | DB tự ghi | Hàm ghi_lich_su_dat_phong trong DB tham chiếu bảng. Không kết luận chưa dùng chỉ vì không có tên bảng trong backend; nhật ký chi tiết ứng dụng đang dùng nhat_ky_don_dat_phong. |
| `loai_phong` | Có tham chiếu trong mã chạy | [trang-khach.service.ts](../may-chu/src/khach-hang/trang-khach.service.ts#L101) · [loai-phong.service.ts](../may-chu/src/quan-tri/loai-phong.service.ts#L12) |
| `migrations_ung_dung` | Hạ tầng migration | Dùng bởi script đồng bộ DB, không cần màn hình người dùng. |
| `nguoi_dung` | Có tham chiếu trong mã chạy | [trang-khach.service.ts](../may-chu/src/khach-hang/trang-khach.service.ts#L105) · [chat.service.ts](../may-chu/src/khach-hang/chat.service.ts#L72) |
| `nguoi_dung_vai_tro` | Có tham chiếu trong mã chạy | [chat.service.ts](../may-chu/src/khach-hang/chat.service.ts#L196) · [chat.service.ts](../may-chu/src/khach-hang/chat.service.ts#L234) |
| `nhat_ky_don_dat_phong` | Có tham chiếu trong mã chạy | [lich-phong.service.ts](../may-chu/src/quan-tri/lich-phong.service.ts#L111) · [don-lich.service.ts](../may-chu/src/quan-tri/don-lich.service.ts#L88) |
| `nhat_ky_he_thong` | Có tham chiếu trong mã chạy | [tien-ich-chat.service.ts](../may-chu/src/quan-tri/tien-ich-chat.service.ts#L116) · [tien-ich-chat.service.ts](../may-chu/src/quan-tri/tien-ich-chat.service.ts#L158) |
| `nhat_ky_thu_chi` | Có tham chiếu trong mã chạy | [thu-chi.service.ts](../may-chu/src/quan-tri/thu-chi.service.ts#L53) |
| `phan_cong_tro_chuyen` | Đã nối trong lần sửa này | [tiep-quan.ts](../may-chu/src/chatbot/tiep-quan.ts#L5) · [tiep-quan.ts](../may-chu/src/chatbot/tiep-quan.ts#L9). Ghi người tiếp quản khi nhân viên trả lời/tắt AI; kết thúc phân công khi bật lại AI. Chưa có màn hình điều phối nhân viên riêng. |
| `phan_tich_ai` | Chưa nối nghiệp vụ | Kho bản phân tích/tóm tắt AI chờ duyệt. Bản nháp nhu cầu hiện nằm ở chatbot_tac_vu.nhu_cau; tránh nhân đôi nếu không cần quy trình duyệt riêng. |
| `phong` | Có tham chiếu trong mã chạy | [trang-khach.service.ts](../may-chu/src/khach-hang/trang-khach.service.ts#L21) · [trang-khach.service.ts](../may-chu/src/khach-hang/trang-khach.service.ts#L101) |
| `phong_tien_nghi` | Mới đọc một phần | [trang-khach.service.ts](../may-chu/src/khach-hang/trang-khach.service.ts#L103) · [trang-khach.service.ts](../may-chu/src/khach-hang/trang-khach.service.ts#L180). Trang khách/AI đọc tiện nghi phòng; chưa có giao diện quản trị danh mục và gán tiện nghi. |
| `quy_tac_gia` | Cấu trúc cũ chưa dùng | Tham chiếu goi_gia cũ. Lịch giá hiện tại dùng gia_lich_phong; nên chọn một cơ chế giá trước khi mở rộng. |
| `so_thich_khach_hang` | Chưa nối nghiệp vụ | Sở thích được khách đồng ý lưu hoặc nhân viên xác nhận; không tự ghi suy đoán của AI. |
| `so_thu_chi` | Có tham chiếu trong mã chạy | [thu-chi.service.ts](../may-chu/src/quan-tri/thu-chi.service.ts#L80) · [thu-chi.service.ts](../may-chu/src/quan-tri/thu-chi.service.ts#L84) |
| `su_dung_khuyen_mai` | Mới đọc một phần | [danh-sach-don.sql.ts](../may-chu/src/quan-tri/danh-sach-don.sql.ts#L35). JOIN theo đơn; cần ghi lượt dùng và kiểm soát giới hạn khi triển khai voucher. |
| `tep_tin_chat` | Có tham chiếu trong mã chạy | [chat.service.ts](../may-chu/src/khach-hang/chat.service.ts#L323) · [chat.service.ts](../may-chu/src/khach-hang/chat.service.ts#L425) |
| `thanh_toan` | Có tham chiếu trong mã chạy | [don-lich.service.ts](../may-chu/src/quan-tri/don-lich.service.ts#L76) · [bao-cao.service.ts](../may-chu/src/quan-tri/bao-cao.service.ts#L68) |
| `thanh_vien_tro_chuyen` | Có tham chiếu trong mã chạy | [chat.service.ts](../may-chu/src/khach-hang/chat.service.ts#L37) · [chat.service.ts](../may-chu/src/khach-hang/chat.service.ts#L85) |
| `thiet_bi_thong_bao` | Chưa nối nghiệp vụ | Đăng ký token thiết bị và gửi push Android/iOS, thu hồi token khi đăng xuất. |
| `thong_bao` | Có tham chiếu trong mã chạy | [tien-ich-chat.service.ts](../may-chu/src/quan-tri/tien-ich-chat.service.ts#L209) · [tien-ich-chat.service.ts](../may-chu/src/quan-tri/tien-ich-chat.service.ts#L215) |
| `tien_nghi` | Mới đọc một phần | [trang-khach.service.ts](../may-chu/src/khach-hang/trang-khach.service.ts#L103) · [trang-khach.service.ts](../may-chu/src/khach-hang/trang-khach.service.ts#L180). Danh mục được đọc trên trang khách; cần quản trị danh mục nếu muốn sửa trực tiếp. |
| `tien_ton_thang` | Có tham chiếu trong mã chạy | [thu-chi.service.ts](../may-chu/src/quan-tri/thu-chi.service.ts#L76) · [thu-chi.service.ts](../may-chu/src/quan-tri/thu-chi.service.ts#L248) |
| `tin_nhan` | Có tham chiếu trong mã chạy | [chat.service.ts](../may-chu/src/khach-hang/chat.service.ts#L241) · [chat.service.ts](../may-chu/src/khach-hang/chat.service.ts#L244) |
| `trang_thai_doc_chat` | Có tham chiếu trong mã chạy | [chat.service.ts](../may-chu/src/khach-hang/chat.service.ts#L134) · [chat.service.ts](../may-chu/src/khach-hang/chat.service.ts#L245) |
| `vai_tro` | Có tham chiếu trong mã chạy | [chat.service.ts](../may-chu/src/khach-hang/chat.service.ts#L196) · [chat.service.ts](../may-chu/src/khach-hang/chat.service.ts#L234) |

## Thứ tự bổ sung đề xuất

1. Dịch vụ/hạng mục đơn và chứng từ thanh toán: hoàn thiện quy trình phục vụ khách, đối soát tiền.
2. Vệ sinh: phân công, nhận việc, hoàn thành và ảnh báo cáo.
3. Voucher: chiến dịch, điều kiện áp dụng và lượt sử dụng.
4. Push thiết bị khi làm app Android.
5. Hồ sơ/sở thích và bản phân tích AI nếu thực sự cần quy trình đồng ý/duyệt.
6. Bảng cũ goi_gia/quy_tac_gia: chỉ xử lý trong kế hoạch migration riêng, không tạo thêm giao diện trùng với giá phòng/lịch giá.

## Lỗi tự trả lời đã sửa

Cấu hình AI bật nhưng 2 hội thoại hỗ trợ vẫn ở chế độ nhân viên và hàng đợi chưa có tác vụ. Luồng gửi mới chỉ enqueue khi hội thoại đã ở AI hỗ trợ. Luồng mới nhận lại hội thoại cũ chưa có phân công, chưa từng có tác vụ AI, không có tệp chờ xử lý và không có nhân viên vừa trả lời trong 30 phút. Chỉ thực hiện khi cấu hình bật và máy chủ có khóa. Không trả lời lại tin cũ.

Nhân viên tắt AI/trả lời sẽ ghi phân công đang mở vào phan_cong_tro_chuyen; bật lại AI kết thúc phân công. Các trường hợp đã chuyển nhân viên do AI hoặc tệp tiếp tục giữ chế độ nhân viên. Không cần thêm bảng hay sửa schema.

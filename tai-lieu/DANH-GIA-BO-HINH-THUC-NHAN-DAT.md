# Bỏ phần Hình thức nhận đặt trong phòng

Đã bỏ hoàn toàn nhóm điều khiển khỏi form phòng, kể cả chỉnh sửa. Giữ số giờ
tối thiểu và giá trọn N giờ đầu. Đơn vị nhập tiền là nghìn đồng; API lưu VND.

## Phần DB cần quyết định riêng

Ba cột `public.phong.cho_dat_theo_gio`, `cho_dat_theo_ngay`,
`cho_dat_theo_dem` không phải `dat_phong.hinh_thuc_dat`. Chúng kiểm soát mở bán
riêng từng kiểu. Xóa nhóm giao diện không đồng nghĩa xóa kiểu đặt trên đơn.

Phụ thuộc runtime đã kiểm tra:

| Thành phần | Đang sử dụng |
|---|---|
| `PhongService` | Kiểm tra/ghi trạng thái mở bán khi thêm, sửa phòng |
| `LichPhongService.createBooking` | Từ chối tạo đơn theo kiểu đã tắt |
| `DonLichService.edit` | Từ chối chuyển đơn sang kiểu đã tắt |
| `HomestayService.danhSachPhong` | Không hiển thị giá của kiểu chưa mở bán |
| `DonDatPhong` | Lọc phòng theo kiểu đang mở bán |
| `Phong` | Gửi lại giá trị hiện hữu khi lưu, không tự đổi false thành true |

Chưa có kết nối để kiểm tra view/trigger/function/dữ liệu thực trên Supabase.
Không DROP cột hoặc đổi trạng thái mở bán trong lần sửa giao diện này.

## Phương án nếu xác nhận bỏ cơ chế mở bán theo kiểu

1. Kiểm tra các phòng đang có bất kỳ cột mở bán bằng false và dependency trong DB.
2. Cập nhật các API và bộ lọc trên sang quy tắc: nhận cả giờ/ngày/đêm, vẫn kiểm tra
   trạng thái chi nhánh, Bảo trì/Bị khóa, thời gian trống và sức chứa như hiện tại.
3. Kiểm thử rằng phòng trước đây tắt một kiểu sẽ nhận được đơn theo kiểu đó.
4. Có migration riêng DROP ba cột bằng RESTRICT, không CASCADE. Không đụng đến
   `dat_phong.hinh_thuc_dat`, số giờ tối thiểu, giá hay thời gian trên đơn.

Cần xác nhận thay đổi nghiệp vụ ở bước 2 trước khi chuẩn bị và áp dụng việc xóa.

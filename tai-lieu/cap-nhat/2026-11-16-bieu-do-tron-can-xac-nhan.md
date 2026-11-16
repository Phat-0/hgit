# Các trường hợp biểu đồ tròn — chờ xác nhận

Cập nhật theo yêu cầu tiếp theo: đã triển khai tạo thêm biểu đồ cột và tròn, riêng biểu đồ tròn chia theo ngày/tuần/tháng với lịch độc lập. Các điều kiện dưới đây vẫn áp dụng; chưa mở cách cộng trực tiếp các mức trung bình hoặc số dư thành tỷ trọng.

## Điều kiện chung cho một hình tròn

1. Mỗi lát là một phần của một tổng được định nghĩa rõ; cùng đơn vị và cùng cách tính. Không gộp số tiền, lượt và giờ trong cùng hình.
2. Các phần không trùng dữ liệu: không chọn Tổng đồng thời chi nhánh con, hoặc chi nhánh đồng thời phòng thuộc nó; không đếm hai lần cùng ngày/đơn ở nhiều khoảng lịch/cột.
3. Giá trị không âm; tổng phải lớn hơn 0. Một phần dương chỉ cho hình 100%, từ hai phần dương mới có ý nghĩa so sánh. Thiếu dữ liệu không được tự coi là 0.
4. Khi chia theo đối tượng/loại đặt/khung giờ, dùng cùng kỳ lọc, trạng thái và loại đặt. Khi chia theo thời gian, các khoảng không giao nhau; các tuần không nhất thiết đủ 7 ngày nếu nhãn và tổng phản ánh đúng kỳ đã chọn.
5. Mẫu số là tổng các phần đang chọn/hiện và cần ghi rõ. Nếu cần % của toàn hệ thống thì phải tính cả phần còn lại hoặc thêm lát Khác, không tự coi tập con là toàn hệ thống.
6. Các khoản chưa gán chi nhánh/phòng hoặc loại/giờ chưa xác định cần đưa vào Khác nếu mẫu số bao gồm chúng.
7. Biểu đồ khác nhau có thể dùng kỳ và tập đối tượng riêng; điều kiện không trùng áp dụng bên trong từng hình, không cấm các hình so sánh cùng dữ liệu.

## Trường hợp

| Trường hợp | Có thể chia thành các lát | Điều kiện riêng |
|---|---|---|
| Tổng thu | Chi nhánh, phòng, ngày/tuần/tháng hoặc các khoảng không giao nhau | Thu đã lưu; không gồm số dư đầu kỳ. Mỗi khoản thuộc một lát. |
| Tổng chi | Tương tự tổng thu | Chi dùng trị tuyệt đối, không dùng số tiền âm làm góc. |
| Thu và chi | Thu / Chi trong cùng phạm vi và kỳ | Tổng mẫu số là Thu + trị tuyệt đối Chi; gọi là cơ cấu luồng thu/chi, không phải lợi nhuận hoặc tỷ lệ hoàn vốn. |
| Số lượt đặt | Chi nhánh/phòng; loại Theo giờ/ngày/đêm; kỳ thời gian | Cùng quy tắc đơn hợp lệ; một đơn chỉ thuộc một lát theo chiều chia đã chọn. |
| Số lượt hủy | Tương tự số lượt đặt | Cùng định nghĩa ngày ghi nhận hủy/ngày tạo và trạng thái; không trộn hai cách ghi nhận. |
| Đặt / Hủy hoặc các trạng thái | Các nhóm trạng thái loại trừ nhau | Cùng tập đơn gốc và kỳ; nếu còn Chờ xác nhận, v.v. phải đưa vào nhóm khác hoặc ghi rõ chỉ thống kê các nhóm đã chọn. |
| Lượt theo loại đặt | Theo giờ / Theo ngày / Theo đêm | Có một loại đặt cho mỗi đơn. Có thể áp dụng trong từng chi nhánh/phòng riêng. |
| Lượt theo khung giờ | Các khung giờ bắt đầu không giao nhau | Mỗi đơn thuộc đúng một khung; dữ liệu chưa rõ giờ vào Khác. Đây là cơ cấu lượt bắt đầu, không phải công suất phòng. |
| Tổng giá trị đơn | Đối tượng, loại đặt hoặc kỳ thời gian | Dùng tổng giá trị đơn hợp lệ, không dùng giá trung bình; không gộp giá trị đơn với tiền thu thực tế vì có thể trùng. |
| Tổng giờ lưu trú | Đối tượng/loại đặt/nhóm giờ hoặc kỳ | Phải tính tổng giờ từ dữ liệu đơn, không lấy trực tiếp TB thời gian lưu trú. Nếu chia theo ngày ở thực tế, phải phân bổ số giờ qua đêm đúng từng ngày. |
| Số dư | Các chi nhánh/phòng tại cùng một mốc cuối kỳ | Mọi số dư không âm và cộng được; tiền tồn đầu kỳ phải gán đúng. Không tự chia tiền tồn chung; không cộng số dư của nhiều ngày thành tổng. |
| Trung bình ngày/tuần, giá hoặc thời gian trung bình | Các phần sau khi quy đổi về tổng | Cần đúng mẫu số/trọng số: số ngày, số tuần hoặc số lượt tương ứng. Không cộng thẳng các mức trung bình có mẫu số khác nhau. Nhãn hình phải thể hiện đại lượng tổng sau quy đổi. |
| Chia chéo nhiều chiều | Ví dụ Chi nhánh × Loại đặt | Mỗi lát là một nhóm giao nhau xác định duy nhất; các nhóm cuối cùng vẫn phải rời nhau. Không chọn đồng thời nhóm cha và nhóm con. |

Không thể suy ra tỷ lệ lấp đầy/trống phòng, doanh thu theo kênh thanh toán, dịch vụ hoặc loại phòng nếu chưa có đầy đủ dữ liệu và mẫu số tương ứng trong nguồn thống kê. Không tự tạo lát hoặc mẫu số thiếu.

## Đề xuất để xác nhận

- Cho phép tạo thêm từng biểu đồ tròn với một chỉ số tổng, một chiều chia và lịch/phạm vi riêng.
- Bật các nhóm thu/chi, tổng giá trị đơn và số lượt trước.
- Tổng giờ, số dư và các mức trung bình chỉ bật khi đã thống nhất cách quy đổi/phân bổ ở trên.
- Nếu điều kiện chưa đạt, giữ biểu đồ cột và nêu lý do thay vì vẽ tỷ trọng sai.

# DO AN TOT NGHIEP

De tai: Xay dung he thong quan ly va dat phong
Homestay da nen tang tich hop AI tu van khach hang.

Cong nghe:
- Backend: NestJS, TypeScript
- Website: React, TypeScript, Tailwind CSS
- Mobile: Flutter, Dart
- Database: Supabase PostgreSQL
- Authentication: Supabase Auth
- AI: Gemini API
- Realtime: Socket.IO

He thong ho tro nhieu Homestay va dat phong
theo gio hoac theo ngay/dem.

## Cấu trúc giao diện

Mã web được chia thành [quản trị](trang-web/src/quan-tri), [trang khách](trang-web/src/khach) và [phần dùng chung](trang-web/src/dung-chung). Thành phần bổ sung, tính toán và CSS của từng trang đặt cạnh trang đó. Xem [hướng dẫn cấu trúc](trang-web/src/README.md) và [bảng đổi đường dẫn](tai-lieu/cau-truc-trang-web.json).

Kiểm tra cấu trúc: `npm --prefix trang-web run kiem-tra:cau-truc`. Các lệnh chạy web/máy chủ từ thư mục gốc không thay đổi.

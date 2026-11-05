# Phuong an B - gop goi_gia vao phong (CHUA THUC HIEN)
Ngay lap: 2026-11-06. KHONG chay DROP TABLE goi_gia cho den khi co ket qua audit SQL va backup.

## Da kiem tra tu ma nguon
- homestay.sql: dat_phong.goi_gia_id -> goi_gia.id (RESTRICT).
- homestay.sql: quy_tac_gia.goi_gia_id -> goi_gia.id (CASCADE).
- Backend: bookingOptions va createBooking dang JOIN goi_gia, bat buoc goi_gia_id.
- Frontend: DonDatPhong dang lay gio trong localStorage key lich_phong_gio.
- Chua the khang dinh schema Supabase thuc te giong homestay.sql; migration moi co the da thay doi FK, view, trigger.

## Thiet ke dich
1. phong: gia_moi_gio = gia cho N gio dau; so_gio_toi_thieu integer >= 1; gia_phu_thu_gio; gia_moi_ngay; gia_moi_dem; co_mo_ban_gio/ngay/dem boolean (neu can tam ngung tung hinh thuc).
2. dat_phong: giu phong_id; hinh_thuc_dat ('Theo giờ','Theo ngày','Theo đêm'); bo sung snapshot so_gio_co_ban_ap_dung, don_gia_ap_dung, phu_thu_gio_ap_dung, gia_combo_ap_dung de lich su khong doi khi sua gia.
3. quy_tac_gia: chuyen sang phong_id + loai_gia; neu gia_lich_phong da bao phu day du thi sao luu va hop nhat truoc khi bo quy_tac_gia.
4. Cai dat khung gio ngay/gio/dem: luu trong bang cau_hinh_gio_dat_phong hoac cau_hinh_he_thong co pham vi chi nhanh, khong dung localStorage lam nguon su that.
5. Combo: combo gio thay gia phong cho so gio bao gom; gio vuot tinh phu thu. Combo dich vu cong vao gia phong. Kiem tra pham vi chi nhanh/phong va ngay hieu luc.

## Quy trinh migration hai pha
Pha 0: Chay kiem-tra-truoc-khi-gop-goi-gia.sql (SELECT only). Kiem tra FK, view, trigger, so dong, nhieu goi cung loai phong va hinh thuc, so don tham chieu, quy tac gia.
Pha 1: Backup Supabase; them cot phong va dat_phong; map gia theo tung phong va loai hinh; neu co nhieu goi cung loai phong phai chon quy tac uu tien thu cong, khong ghi de tuy tien. Backfill snapshot va quy tac gia.
Pha 2: Deploy backend + frontend su dung phong_id, hinh_thuc_dat va cau hinh gio chung; test tao don, trung lich, combo, gia lich, don cu.
Pha 3: Sau khi tat ca truy van khong dung goi_gia_id, xoa FK/cot cu va bang goi_gia bang migration rieng co phuong an rollback.

## Rủi ro quan trọng
- Nhieu goi gia tren cung loai phong khong tu dong quy ve mot gia phong duoc.
- Don cu phai luu snapshot gia va hinh thuc de tranh tinh lai.
- Supabase RLS, function, view, trigger co the phu thuoc goi_gia.
- DROP CASCADE khong duoc dung.
- Tranh thay doi schema khi backend cu van dang chay.

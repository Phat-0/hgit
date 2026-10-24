-- HOMESTAY: BO SQL TONG HOP (CHAY MOT LAN TREN DATABASE MOI)
-- Luu file UTF-8, gia tri nghiep vu bang tieng Viet co dau.
-- KHONG chay lai tren DB da co bang tu migration truoc; dung migration rieng.

-- HOMESTAY - GIAI DOAN 1: BANG NEN TANG
-- Chay trong Supabase SQL Editor, role postgres.
create extension if not exists pgcrypto;

create table if not exists public.nguoi_dung (
 id uuid primary key references auth.users(id) on delete cascade,
 ho_ten text not null check (length(btrim(ho_ten)) between 2 and 150),
 so_dien_tho text unique check (so_dien_tho is null or so_dien_tho ~ '^\+?[0-9]{9,15}$'),
 anh_dai_dien text,
 trang_thai text not null default 'Đang hoạt động' check (trang_thai in ('Đang hoạt động','Tạm khóa')),
 ngay_tao timestamptz not null default now(),
 ngay_cap_nhat timestamptz not null default now()
);
create table if not exists public.vai_tro (
 id uuid primary key default gen_random_uuid(),
 ma_vai_tro text not null unique check (ma_vai_tro in ('Khách hàng','Chăm sóc khách hàng','Nhân viên vệ sinh','Quản lý','Quản trị hệ thống')),
 mo_ta text
);
insert into public.vai_tro(ma_vai_tro,mo_ta) values
 ('Khách hàng','Đặt phòng và quản lý đơn của mình'),
 ('Chăm sóc khách hàng','Hỗ trợ khách và xác nhận thanh toán'),
 ('Nhân viên vệ sinh','Thực hiện công việc vệ sinh'),
 ('Quản lý','Quản lý một hoặc nhiều cơ sở'),
 ('Quản trị hệ thống','Quản trị toàn hệ thống')
on conflict (ma_vai_tro) do nothing;

create table if not exists public.homestay (
 id uuid primary key default gen_random_uuid(),
 ten_homestay text not null check (length(btrim(ten_homestay)) between 2 and 200),
 mo_ta text,
 dia_chi text not null,
 tinh_thanh text not null,
 phuong_xa text,
 vi_do numeric(9,6) check (vi_do between -90 and 90),
 kinh_do numeric(9,6) check (kinh_do between -180 and 180),
 so_dien_tho text check (so_dien_tho is null or so_dien_tho ~ '^\+?[0-9]{9,15}$'),
 trang_thai text not null default 'Chờ duyệt' check (trang_thai in ('Chờ duyệt','Đang hoạt động','Tạm ngưng','Ngừng kinh doanh')),
 ngay_tao timestamptz not null default now(),
 ngay_cap_nhat timestamptz not null default now()
);

create table if not exists public.nguoi_dung_vai_tro (
 id uuid primary key default gen_random_uuid(),
 nguoi_dung_id uuid not null references public.nguoi_dung(id) on delete cascade,
 vai_tro_id uuid not null references public.vai_tro(id) on delete restrict,
 homestay_id uuid references public.homestay(id) on delete restrict,
 ngay_gan timestamptz not null default now(),
 ngay_thu_hoi timestamptz,
 check (ngay_thu_hoi is null or ngay_thu_hoi >= ngay_gan)
);
create unique index if not exists uq_vai_tro_toan_he_thong
 on public.nguoi_dung_vai_tro(nguoi_dung_id,vai_tro_id)
 where homestay_id is null and ngay_thu_hoi is null;
create unique index if not exists uq_vai_tro_theo_co_so
 on public.nguoi_dung_vai_tro(nguoi_dung_id,vai_tro_id,homestay_id)
 where homestay_id is not null and ngay_thu_hoi is null;
create index if not exists idx_phan_quyen_co_so on public.nguoi_dung_vai_tro(homestay_id,nguoi_dung_id) where ngay_thu_hoi is null;

create table if not exists public.loai_phong (
 id uuid primary key default gen_random_uuid(),
 homestay_id uuid not null references public.homestay(id) on delete restrict,
 ten_loai text not null,
 mo_ta text,
 suc_chua int not null check (suc_chua > 0 and suc_chua <= 100),
 dien_tich_m2 numeric(8,2) check (dien_tich_m2 > 0),
 ngay_tao timestamptz not null default now(),
 unique (homestay_id,ten_loai),
 unique (id,homestay_id)
);
create table if not exists public.phong (
 id uuid primary key default gen_random_uuid(),
 homestay_id uuid not null references public.homestay(id) on delete restrict,
 loai_phong_id uuid not null,
 ma_phong text not null,
 ten_phong text not null,
 tang int,
 trang_thai_van_hanh text not null default 'Trống' check (trang_thai_van_hanh in ('Trống','Đang sử dụng','Cần dọn','Đang dọn','Chờ kiểm tra','Bảo trì','Bị khóa')),
 ngay_tao timestamptz not null default now(),
 foreign key (loai_phong_id,homestay_id) references public.loai_phong(id,homestay_id) on delete restrict,
 unique (homestay_id,ma_phong)
);
create index if not exists idx_phong_co_so_trang_thai on public.phong(homestay_id,trang_thai_van_hanh);
create index if not exists idx_phong_loai on public.phong(loai_phong_id);

create table if not exists public.tien_nghi (
 id uuid primary key default gen_random_uuid(),
 ten_tien_nghi text not null unique,
 mo_ta text
);
create table if not exists public.phong_tien_nghi (
 phong_id uuid not null references public.phong(id) on delete cascade,
 tien_nghi_id uuid not null references public.tien_nghi(id) on delete restrict,
 primary key (phong_id,tien_nghi_id)
);
create index if not exists idx_phong_tien_nghi_tien_nghi on public.phong_tien_nghi(tien_nghi_id);

create table if not exists public.hinh_anh_homestay (
 id uuid primary key default gen_random_uuid(),
 homestay_id uuid not null references public.homestay(id) on delete cascade,
 duong_dan text not null,
 mo_ta text,
 la_anh_dai_dien boolean not null default false,
 thu_tu int not null default 0 check (thu_tu >= 0)
);
create unique index if not exists uq_anh_dai_dien_homestay on public.hinh_anh_homestay(homestay_id) where la_anh_dai_dien;
create table if not exists public.hinh_anh_phong (
 id uuid primary key default gen_random_uuid(),
 phong_id uuid not null references public.phong(id) on delete cascade,
 duong_dan text not null,
 mo_ta text,
 la_anh_dai_dien boolean not null default false,
 thu_tu int not null default 0 check (thu_tu >= 0)
);
create unique index if not exists uq_anh_dai_dien_phong on public.hinh_anh_phong(phong_id) where la_anh_dai_dien;

-- Chan client truy cap truc tiep neu chua co RLS policies duoc tham dinh.
alter table public.nguoi_dung enable row level security;
alter table public.vai_tro enable row level security;
alter table public.nguoi_dung_vai_tro enable row level security;
alter table public.homestay enable row level security;
alter table public.loai_phong enable row level security;
alter table public.phong enable row level security;
alter table public.tien_nghi enable row level security;
alter table public.phong_tien_nghi enable row level security;
alter table public.hinh_anh_homestay enable row level security;
alter table public.hinh_anh_phong enable row level security;

-- Khong tao policy mo rong o giai doan nay. NestJS backend dung ket noi server-side,
-- kiem tra RBAC + pham vi homestay; service_role khong bao gio dua len client.


-- =============================================================
-- GIAI DOAN 2: GIA, DICH VU, DAT PHONG, THANH TOAN
-- Chay sau 10 bang nen tang, trong Supabase SQL Editor.
-- Gia tien VND, thoi gian timestamptz (luu UTC, hien thi Asia/Ho_Chi_Minh).
-- =============================================================
create extension if not exists btree_gist;

create table public.goi_gia (
 id uuid primary key default gen_random_uuid(), loai_phong_id uuid not null references public.loai_phong(id) on delete restrict,
 ten_goi text not null, hinh_thuc_dat text not null check(hinh_thuc_dat in ('Theo giờ','Theo đêm')),
 so_gio_toi_thieu int check(so_gio_toi_thieu is null or so_gio_toi_thieu > 0),
 gia_co_ban numeric(14,2) not null check(gia_co_ban >= 0),
 hieu_luc boolean not null default true, ngay_tao timestamptz not null default now(),
 unique(id,loai_phong_id), unique(loai_phong_id,ten_goi)
);
create index idx_goi_gia_loai on public.goi_gia(loai_phong_id,hieu_luc);
create table public.quy_tac_gia (
 id uuid primary key default gen_random_uuid(), goi_gia_id uuid not null references public.goi_gia(id) on delete cascade,
 ten_quy_tac text not null, bat_dau timestamptz not null, ket_thuc timestamptz not null,
 gia_ap_dung numeric(14,2) not null check(gia_ap_dung >= 0),
 muc_uu_tien int not null default 0, check(bat_dau < ket_thuc)
);
create index idx_quy_tac_gia_khoang on public.quy_tac_gia(goi_gia_id,bat_dau,ket_thuc);
create table public.dich_vu (
 id uuid primary key default gen_random_uuid(), homestay_id uuid not null references public.homestay(id) on delete restrict,
 ten_dich_vu text not null, mo_ta text, don_vi text not null default 'Lần',
 don_gia numeric(14,2) not null check(don_gia >= 0), trang_thai text not null default 'Đang bán'
 check(trang_thai in ('Đang bán','Tạm ngưng')), unique(id,homestay_id)
);
create index idx_dich_vu_homestay on public.dich_vu(homestay_id);
create table public.combo (
 id uuid primary key default gen_random_uuid(), homestay_id uuid not null references public.homestay(id) on delete restrict,
 ten_combo text not null, mo_ta text, gia_combo numeric(14,2) not null check(gia_combo >= 0),
 trang_thai text not null default 'Đang bán' check(trang_thai in ('Đang bán','Tạm ngưng')),
 unique(id,homestay_id)
);
create table public.combo_dich_vu (
 combo_id uuid not null references public.combo(id) on delete cascade,
 dich_vu_id uuid not null references public.dich_vu(id) on delete restrict,
 so_luong int not null default 1 check(so_luong > 0), primary key(combo_id,dich_vu_id)
);
create table public.khuyen_mai (
 id uuid primary key default gen_random_uuid(), homestay_id uuid references public.homestay(id) on delete restrict,
 ma_khuyen_mai text not null unique, ten_khuyen_mai text not null,
 loai_giam text not null check(loai_giam in ('Phần trăm','Số tiền')),
 gia_tri numeric(14,2) not null check(gia_tri > 0),
 giam_toi_da numeric(14,2) check(giam_toi_da is null or giam_toi_da >= 0),
 don_toi_thieu numeric(14,2) not null default 0 check(don_toi_thieu >= 0),
 gioi_han_su_dung int check(gioi_han_su_dung is null or gioi_han_su_dung > 0),
 bat_dau timestamptz not null, ket_thuc timestamptz not null,
 trang_thai text not null default 'Đang hoạt động' check(trang_thai in ('Đang hoạt động','Tạm ngưng')),
 check(bat_dau < ket_thuc), check(loai_giam <> 'Phần trăm' or gia_tri <= 100)
);

alter table public.phong add constraint uq_phong_id_homestay unique(id,homestay_id);
create table public.dat_phong (
 id uuid primary key default gen_random_uuid(), ma_dat_phong text not null unique,
 nguoi_dung_id uuid not null references public.nguoi_dung(id) on delete restrict,
 homestay_id uuid not null references public.homestay(id) on delete restrict,
 phong_id uuid not null, goi_gia_id uuid not null references public.goi_gia(id) on delete restrict,
 hinh_thuc_dat text not null check(hinh_thuc_dat in ('Theo giờ','Theo đêm')),
 nhan_phong_luc timestamptz not null, tra_phong_luc timestamptz not null,
 so_khach int not null check(so_khach between 1 and 100),
 trang_thai text not null default 'Chờ thanh toán' check(trang_thai in
 ('Chờ thanh toán','Chờ xác nhận','Đã xác nhận','Đã nhận phòng','Đã trả phòng','Đã hủy','Hết hạn')),
 tien_phong numeric(14,2) not null check(tien_phong >= 0),
 tien_dich_vu numeric(14,2) not null default 0 check(tien_dich_vu >= 0),
 tien_giam numeric(14,2) not null default 0 check(tien_giam >= 0),
 tong_tien numeric(14,2) generated always as (tien_phong+tien_dich_vu-tien_giam) stored,
 het_han_giu_cho timestamptz,
 ghi_chu text, ngay_tao timestamptz not null default now(), ngay_cap_nhat timestamptz not null default now(),
 foreign key(phong_id,homestay_id) references public.phong(id,homestay_id) on delete restrict,
 check(nhan_phong_luc < tra_phong_luc),
 check(tien_giam <= tien_phong+tien_dich_vu),
 check(trang_thai <> 'Chờ thanh toán' or het_han_giu_cho is not null),
 unique(id,homestay_id)
);
-- Required composite key for cross-homestay protection
-- One room cannot have overlapping effective bookings. Adjacent ranges allowed.
alter table public.dat_phong add constraint ex_dat_phong_khong_trung
 exclude using gist (phong_id with =, tstzrange(nhan_phong_luc,tra_phong_luc,'[)') with &&)
 where (trang_thai in ('Chờ thanh toán','Chờ xác nhận','Đã xác nhận','Đã nhận phòng'));
create index idx_dat_phong_khach on public.dat_phong(nguoi_dung_id,ngay_tao desc);
create index idx_dat_phong_co_so on public.dat_phong(homestay_id,trang_thai,nhan_phong_luc);
create index idx_dat_phong_het_han on public.dat_phong(het_han_giu_cho)
 where trang_thai = 'Chờ thanh toán';

create table public.chan_lich_phong (
 id uuid primary key default gen_random_uuid(), phong_id uuid not null references public.phong(id) on delete restrict,
 bat_dau timestamptz not null, ket_thuc timestamptz not null,
 ly_do text not null, nguoi_tao_id uuid references public.nguoi_dung(id) on delete set null,
 ngay_tao timestamptz not null default now(), check(bat_dau < ket_thuc),
 exclude using gist (phong_id with =, tstzrange(bat_dau,ket_thuc,'[)') with &&)
);
create index idx_chan_lich_phong on public.chan_lich_phong(phong_id,bat_dau);

-- Lock room row to serialize booking and maintenance block creation.
create or replace function public.khoa_lich_phong() returns trigger language plpgsql set search_path = '' as $$
begin
 perform 1 from public.phong where id = new.phong_id for update;
 if tg_table_name = 'dat_phong' then
  if new.trang_thai in ('Chờ thanh toán','Chờ xác nhận','Đã xác nhận','Đã nhận phòng') and exists (
   select 1 from public.chan_lich_phong c where c.phong_id=new.phong_id
   and tstzrange(c.bat_dau,c.ket_thuc,'[)') && tstzrange(new.nhan_phong_luc,new.tra_phong_luc,'[)')
  ) then raise exception 'Phòng bị chặn lịch trong khoảng thời gian đã chọn'; end if;
 else
  if exists (select 1 from public.dat_phong d where d.phong_id=new.phong_id
   and d.trang_thai in ('Chờ thanh toán','Chờ xác nhận','Đã xác nhận','Đã nhận phòng')
   and tstzrange(d.nhan_phong_luc,d.tra_phong_luc,'[)') && tstzrange(new.bat_dau,new.ket_thuc,'[)'))
  then raise exception 'Phòng đã có đơn đặt trong khoảng thời gian này'; end if;
 end if;
 return new;
end $$;
create trigger trg_khoa_dat_phong before insert or update of phong_id,nhan_phong_luc,tra_phong_luc,trang_thai on public.dat_phong
 for each row execute function public.khoa_lich_phong();
create trigger trg_khoa_chan_lich before insert or update of phong_id,bat_dau,ket_thuc on public.chan_lich_phong
 for each row execute function public.khoa_lich_phong();

create table public.chi_tiet_dat_phong (
 id uuid primary key default gen_random_uuid(), dat_phong_id uuid not null references public.dat_phong(id) on delete restrict,
 dich_vu_id uuid references public.dich_vu(id) on delete restrict,
 combo_id uuid references public.combo(id) on delete restrict,
 ten_muc_chot text not null, so_luong int not null check(so_luong > 0),
 don_gia_chot numeric(14,2) not null check(don_gia_chot >= 0),
 thanh_tien numeric(14,2) generated always as (so_luong*don_gia_chot) stored,
 check ((dich_vu_id is not null)::int + (combo_id is not null)::int = 1)
);
create index idx_chi_tiet_dat_phong on public.chi_tiet_dat_phong(dat_phong_id);
create table public.su_dung_khuyen_mai (
 id uuid primary key default gen_random_uuid(), dat_phong_id uuid not null unique references public.dat_phong(id) on delete restrict,
 khuyen_mai_id uuid not null references public.khuyen_mai(id) on delete restrict,
 so_tien_giam numeric(14,2) not null check(so_tien_giam >= 0), ngay_su_dung timestamptz not null default now()
);
create index idx_su_dung_khuyen_mai on public.su_dung_khuyen_mai(khuyen_mai_id);
create table public.thanh_toan (
 id uuid primary key default gen_random_uuid(), dat_phong_id uuid not null references public.dat_phong(id) on delete restrict,
 so_tien numeric(14,2) not null check(so_tien > 0),
 phuong_thuc text not null default 'Chuyển khoản QR' check(phuong_thuc in ('Chuyển khoản QR','Tiền mặt')),
 trang_thai text not null default 'Chờ thanh toán' check(trang_thai in
 ('Chờ thanh toán','Khách báo đã chuyển','Đã xác nhận','Từ chối','Đã hoàn tiền')),
 ma_giao_dich_ngan_hang text, noi_dung_chuyen_khoan text,
 nguoi_xac_nhan_id uuid references public.nguoi_dung(id) on delete restrict,
 xac_nhan_luc timestamptz, ngay_tao timestamptz not null default now(),
 check((trang_thai <> 'Đã xác nhận') or (nguoi_xac_nhan_id is not null and xac_nhan_luc is not null))
);
create unique index uq_ma_giao_dich_ngan_hang on public.thanh_toan(ma_giao_dich_ngan_hang)
 where ma_giao_dich_ngan_hang is not null;
create index idx_thanh_toan_dat on public.thanh_toan(dat_phong_id,trang_thai);
create table public.chung_tu_thanh_toan (
 id uuid primary key default gen_random_uuid(), thanh_toan_id uuid not null references public.thanh_toan(id) on delete restrict,
 duong_dan_luu_tru text not null, ngay_tai_len timestamptz not null default now()
);
create table public.lich_su_dat_phong (
 id uuid primary key default gen_random_uuid(), dat_phong_id uuid not null references public.dat_phong(id) on delete restrict,
 trang_thai_cu text, trang_thai_moi text not null,
 nguoi_thay_doi_id uuid references public.nguoi_dung(id) on delete set null,
 ghi_chu text, ngay_thay_doi timestamptz not null default now()
);
create index idx_lich_su_dat on public.lich_su_dat_phong(dat_phong_id,ngay_thay_doi desc);
create or replace function public.ghi_lich_su_dat_phong() returns trigger language plpgsql set search_path = '' as $$
begin
 if tg_op='INSERT' or old.trang_thai is distinct from new.trang_thai then
  insert into public.lich_su_dat_phong(dat_phong_id,trang_thai_cu,trang_thai_moi)
  values(new.id,case when tg_op='INSERT' then null else old.trang_thai end,new.trang_thai);
 end if;
 return new;
end $$;
create trigger trg_lich_su_dat after insert or update of trang_thai on public.dat_phong
 for each row execute function public.ghi_lich_su_dat_phong();

-- =============================================================
-- GIAI DOAN 3: VAN HANH, CHAT, AI, THONG BAO, AUDIT
-- =============================================================
create table public.cong_viec_ve_sinh (
 id uuid primary key default gen_random_uuid(), phong_id uuid not null references public.phong(id) on delete restrict,
 dat_phong_id uuid references public.dat_phong(id) on delete restrict,
 nhan_vien_id uuid references public.nguoi_dung(id) on delete restrict,
 trang_thai text not null default 'Chờ nhận' check(trang_thai in ('Chờ nhận','Đã nhận','Đang thực hiện','Chờ kiểm tra','Hoàn thành','Đã hủy')),
 muc_do_uu_tien text not null default 'Bình thường' check(muc_do_uu_tien in ('Thấp','Bình thường','Cao')),
 han_hoan_thanh timestamptz, bat_dau_luc timestamptz, hoan_thanh_luc timestamptz,
 ghi_chu text, ngay_tao timestamptz not null default now()
);
create index idx_ve_sinh_nhan_vien on public.cong_viec_ve_sinh(nhan_vien_id,trang_thai);
create index idx_ve_sinh_phong on public.cong_viec_ve_sinh(phong_id,trang_thai);
create table public.bao_cao_ve_sinh (
 id uuid primary key default gen_random_uuid(), cong_viec_id uuid not null references public.cong_viec_ve_sinh(id) on delete restrict,
 nguoi_bao_cao_id uuid not null references public.nguoi_dung(id) on delete restrict,
 noi_dung text, duong_dan_anh text, ngay_bao_cao timestamptz not null default now()
);
create table public.danh_gia (
 id uuid primary key default gen_random_uuid(), dat_phong_id uuid not null unique references public.dat_phong(id) on delete restrict,
 nguoi_dung_id uuid not null references public.nguoi_dung(id) on delete restrict,
 so_sao int not null check(so_sao between 1 and 5), noi_dung text,
 trang_thai text not null default 'Hiển thị' check(trang_thai in ('Hiển thị','Ẩn','Chờ duyệt')),
 ngay_tao timestamptz not null default now()
);
create index idx_danh_gia_khach on public.danh_gia(nguoi_dung_id);
create table public.cuoc_tro_chuyen (
 id uuid primary key default gen_random_uuid(), khach_hang_id uuid not null references public.nguoi_dung(id) on delete restrict,
 homestay_id uuid references public.homestay(id) on delete restrict,
 trang_thai text not null default 'Đang mở' check(trang_thai in ('Đang mở','Đã đóng')),
 che_do_xu_ly text not null default 'AI hỗ trợ' check(che_do_xu_ly in ('AI hỗ trợ','Nhân viên tiếp quản')),
 ngay_tao timestamptz not null default now(), ngay_cap_nhat timestamptz not null default now()
);
create index idx_tro_chuyen_khach on public.cuoc_tro_chuyen(khach_hang_id,ngay_cap_nhat desc);
create table public.tin_nhan (
 id uuid primary key default gen_random_uuid(), cuoc_tro_chuyen_id uuid not null references public.cuoc_tro_chuyen(id) on delete restrict,
 nguoi_gui_id uuid references public.nguoi_dung(id) on delete restrict,
 loai_nguoi_gui text not null check(loai_nguoi_gui in ('Khách hàng','Nhân viên','AI','Hệ thống')),
 noi_dung text, duong_dan_tep text, ngay_gui timestamptz not null default now(),
 check(noi_dung is not null or duong_dan_tep is not null),
 check((loai_nguoi_gui in ('AI','Hệ thống') and nguoi_gui_id is null) or
       (loai_nguoi_gui in ('Khách hàng','Nhân viên') and nguoi_gui_id is not null))
);
create index idx_tin_nhan_phan_trang on public.tin_nhan(cuoc_tro_chuyen_id,ngay_gui desc,id desc);
create table public.phan_cong_tro_chuyen (
 id uuid primary key default gen_random_uuid(), cuoc_tro_chuyen_id uuid not null references public.cuoc_tro_chuyen(id) on delete restrict,
 nhan_vien_id uuid not null references public.nguoi_dung(id) on delete restrict,
 nhan_luc timestamptz not null default now(), ket_thuc_luc timestamptz,
 check(ket_thuc_luc is null or ket_thuc_luc >= nhan_luc)
);
create unique index uq_phan_cong_chat_hien_tai on public.phan_cong_tro_chuyen(cuoc_tro_chuyen_id) where ket_thuc_luc is null;
create table public.ho_so_khach_hang (
 id uuid primary key default gen_random_uuid(), nguoi_dung_id uuid not null unique references public.nguoi_dung(id) on delete restrict,
 ngan_sach_du_kien numeric(14,2) check(ngan_sach_du_kien is null or ngan_sach_du_kien >= 0),
 so_khach_uu_tien int check(so_khach_uu_tien is null or so_khach_uu_tien > 0),
 thong_tin_bo_sung jsonb not null default '{}'::jsonb,
 dong_y_phan_tich_ai boolean not null default false,
 ngay_cap_nhat timestamptz not null default now()
);
create table public.so_thich_khach_hang (
 id uuid primary key default gen_random_uuid(), ho_so_id uuid not null references public.ho_so_khach_hang(id) on delete cascade,
 ten_thuoc_tinh text not null, gia_tri text not null,
 nguon text not null default 'Khách cung cấp' check(nguon in ('Khách cung cấp','AI đề xuất','Nhân viên xác nhận')),
 ngay_tao timestamptz not null default now(), unique(ho_so_id,ten_thuoc_tinh,gia_tri)
);
create table public.phan_tich_ai (
 id uuid primary key default gen_random_uuid(), cuoc_tro_chuyen_id uuid not null references public.cuoc_tro_chuyen(id) on delete restrict,
 ten_mo_hinh text not null, ket_qua jsonb not null default '{}'::jsonb,
 tom_tat text, trang_thai_duyet text not null default 'Chờ kiểm tra'
 check(trang_thai_duyet in ('Chờ kiểm tra','Đã duyệt','Từ chối')),
 ngay_tao timestamptz not null default now()
);
create index idx_ai_cho_duyet on public.phan_tich_ai(trang_thai_duyet,ngay_tao);
create table public.thong_bao (
 id uuid primary key default gen_random_uuid(), nguoi_dung_id uuid not null references public.nguoi_dung(id) on delete cascade,
 tieu_de text not null, noi_dung text not null, loai text not null default 'Hệ thống',
 du_lieu jsonb not null default '{}'::jsonb,
 da_doc_luc timestamptz, ngay_tao timestamptz not null default now()
);
create index idx_thong_bao_chua_doc on public.thong_bao(nguoi_dung_id,ngay_tao desc) where da_doc_luc is null;
create table public.thiet_bi_thong_bao (
 id uuid primary key default gen_random_uuid(), nguoi_dung_id uuid not null references public.nguoi_dung(id) on delete cascade,
 ma_thiet_bi text not null unique, nen_tang text not null check(nen_tang in ('Android','iOS','Web')),
 ngay_cap_nhat timestamptz not null default now()
);
create table public.nhat_ky_he_thong (
 id uuid primary key default gen_random_uuid(), nguoi_thuc_hien_id uuid references public.nguoi_dung(id) on delete set null,
 homestay_id uuid references public.homestay(id) on delete restrict,
 hanh_dong text not null, ten_bang text not null, ban_ghi_id uuid,
 du_lieu_thay_doi jsonb, dia_chi_ip inet, ngay_tao timestamptz not null default now()
);
create index idx_nhat_ky_theo_thoi_gian on public.nhat_ky_he_thong(ngay_tao desc);
create index idx_nhat_ky_theo_co_so on public.nhat_ky_he_thong(homestay_id,ngay_tao desc);
create table public.lich_su_dang_nhap (
 id uuid primary key default gen_random_uuid(), nguoi_dung_id uuid references public.nguoi_dung(id) on delete set null,
 ket_qua text not null check(ket_qua in ('Thành công','Thất bại','Bị chặn')),
 dia_chi_ip inet, thiet_bi text, ngay_tao timestamptz not null default now()
);
create index idx_lich_su_dang_nhap on public.lich_su_dang_nhap(nguoi_dung_id,ngay_tao desc);
create table public.khoa_chong_lap_yeu_cau (
 id uuid primary key default gen_random_uuid(), nguoi_dung_id uuid not null references public.nguoi_dung(id) on delete cascade,
 khoa_yeu_cau text not null, ten_nghiep_vu text not null, ma_bam_noi_dung text not null,
 trang_thai text not null default 'Đang xử lý' check(trang_thai in ('Đang xử lý','Hoàn thành','Thất bại')),
 ket_qua jsonb, het_han_luc timestamptz not null,
 ngay_tao timestamptz not null default now(), unique(nguoi_dung_id,ten_nghiep_vu,khoa_yeu_cau)
);
create index idx_khoa_chong_lap_het_han on public.khoa_chong_lap_yeu_cau(het_han_luc);

-- RLS: default-deny for authenticated/anon. Backend uses restricted DB role
-- or securely stored service credentials; NEVER expose privileged credentials.
do $$ declare t text; begin
 foreach t in array array[
 'goi_gia','quy_tac_gia','dich_vu','combo','combo_dich_vu','khuyen_mai',
 'dat_phong','chan_lich_phong','chi_tiet_dat_phong','su_dung_khuyen_mai',
 'thanh_toan','chung_tu_thanh_toan','lich_su_dat_phong','cong_viec_ve_sinh',
 'bao_cao_ve_sinh','danh_gia','cuoc_tro_chuyen','tin_nhan','phan_cong_tro_chuyen',
 'ho_so_khach_hang','so_thich_khach_hang','phan_tich_ai','thong_bao',
 'thiet_bi_thong_bao','nhat_ky_he_thong','lich_su_dang_nhap','khoa_chong_lap_yeu_cau'
 ] loop execute format('alter table public.%I enable row level security',t); end loop;
end $$;

-- IMPORTANT APPLICATION INVARIANTS (NestJS transaction/service layer):
-- 1. Check goi_gia belongs to phong.loai_phong, hinh_thuc_dat matches goi_gia,
--    so_khach <= loai_phong.suc_chua, homestay active; reject past check-in.
-- 2. All item services/combos must belong to booking homestay; recalculate totals
--    server-side from immutable snapshots; validate discounts and redemption limits.
-- 3. Expire 'Chờ thanh toán' bookings in a reliable scheduled job, with row locking;
--    pending transfers require separate manual reconciliation and conflict handling.
-- 4. Verify payment against actual bank transaction; enforce allowed status transitions
--    and staff's homestay membership; append audited actor identity.
-- 5. Review belongs to customer and completed booking; chat sender and staff
--    assignment must be checked against authorized homestay.
-- 6. RLS is default-deny; backend must authenticate every request and authorize every
--    record by tenant. Never pass service_role or direct DB password to clients.
-- 7. No automatic deletion of financial/audit history; backups and restore tests needed.

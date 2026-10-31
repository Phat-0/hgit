-- Chạy một lần trong Supabase SQL Editor trước khi dùng trang Lịch.
alter table public.chan_lich_phong add column if not exists loai_khoa text not null default 'gio';
alter table public.chan_lich_phong add column if not exists co_dinh boolean not null default false;
alter table public.chan_lich_phong add constraint ck_lich_loai check (loai_khoa in ('ngay','gio','qua-dem'));
create table if not exists public.gia_lich_phong (
 id uuid primary key default gen_random_uuid(),
 phong_id uuid not null references public.phong(id) on delete restrict,
 bat_dau timestamptz not null, ket_thuc timestamptz not null,
 loai_gia text not null check(loai_gia in ('ngay','gio','qua-dem')),
 gia numeric(14,0) not null check(gia>=0),
 ngay_tao timestamptz not null default now(),
 check(bat_dau<ket_thuc),
 exclude using gist(phong_id with =,loai_gia with =,tstzrange(bat_dau,ket_thuc,'[)') with &&)
);
create index if not exists idx_gia_lich_phong on public.gia_lich_phong(phong_id,bat_dau);
-- Khóa lịch vẫn dùng trigger và EXCLUDE constraint hiện có để chống trùng đơn đặt.

-- Thông tin quy tắc giá theo thứ trong tuần
ALTER TABLE public.gia_lich_phong ADD COLUMN IF NOT EXISTS ten text;
ALTER TABLE public.gia_lich_phong ADD COLUMN IF NOT EXISTS thu_trong_tuan integer[];
ALTER TABLE public.gia_lich_phong ADD COLUMN IF NOT EXISTS phu_thu_gio numeric(14,0);

-- Chay mot lan trong Supabase SQL Editor (role postgres).
-- Bucket rieng tu: chi NestJS backend dung service_role de upload / ky URL.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('anh-phong','anh-phong',false,5242880,array['image/jpeg','image/png','image/webp']::text[])
on conflict (id) do update set public=false,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;
-- Khong tao policy public cho storage.objects.

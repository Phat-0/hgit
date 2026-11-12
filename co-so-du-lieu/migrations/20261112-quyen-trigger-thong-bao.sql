-- Trigger chỉ được kích hoạt từ thay đổi đơn, không công khai qua RPC.
REVOKE ALL ON FUNCTION public.thong_bao_su_kien_dat_phong() FROM anon,authenticated,PUBLIC;
INSERT INTO public.migrations_ung_dung(phien_ban) VALUES('20261112-quyen-trigger-thong-bao') ON CONFLICT DO NOTHING;

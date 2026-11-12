-- Mốc đọc theo tài khoản/phiên khách; không sửa nội dung tin hoặc quyền hội thoại.
CREATE TABLE IF NOT EXISTS public.trang_thai_doc_chat (
 cuoc_tro_chuyen_id uuid NOT NULL REFERENCES public.cuoc_tro_chuyen(id) ON DELETE CASCADE,
 khoa_nguoi_doc text NOT NULL CHECK(khoa_nguoi_doc ~ '^(u:[0-9a-f-]{36}|g:[0-9a-f]{64})$'),
 doc_den_luc timestamptz NOT NULL,
 doc_den_id uuid NOT NULL REFERENCES public.tin_nhan(id) ON DELETE CASCADE,
 PRIMARY KEY(cuoc_tro_chuyen_id,khoa_nguoi_doc)
);
ALTER TABLE public.trang_thai_doc_chat ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.trang_thai_doc_chat FROM anon,authenticated;
CREATE INDEX IF NOT EXISTS idx_chat_tin_moi ON public.tin_nhan(cuoc_tro_chuyen_id,ngay_gui DESC,id DESC);
INSERT INTO public.migrations_ung_dung(phien_ban) VALUES('20261112-chat-tim-kiem-va-chua-doc') ON CONFLICT DO NOTHING;

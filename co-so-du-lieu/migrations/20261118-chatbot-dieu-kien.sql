-- Add matching settings to existing knowledge records. No existing content is removed.
ALTER TABLE public.chatbot_kien_thuc ADD COLUMN IF NOT EXISTS dieu_kien jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(dieu_kien)='object');
INSERT INTO public.migrations_ung_dung(phien_ban) VALUES('20261118-chatbot-dieu-kien') ON CONFLICT DO NOTHING;

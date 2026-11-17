-- Private server-managed configuration, knowledge and durable reply queue. No API keys.
CREATE TABLE IF NOT EXISTS public.chatbot_cau_hinh (
 id boolean PRIMARY KEY DEFAULT true CHECK(id),
 bat boolean NOT NULL DEFAULT false,
 ten_bot text NOT NULL DEFAULT 'Trợ lý HomeStay' CHECK(length(ten_bot) BETWEEN 1 AND 80),
 huong_dan text NOT NULL DEFAULT '' CHECK(length(huong_dan)<=6000),
 loi_chuyen text NOT NULL DEFAULT 'Mình đã chuyển yêu cầu đến nhân viên để hỗ trợ bạn chính xác hơn nhé.' CHECK(length(loi_chuyen) BETWEEN 1 AND 500),
 gioi_han_ngay integer NOT NULL DEFAULT 300 CHECK(gioi_han_ngay BETWEEN 1 AND 5000),
 phien_ban integer NOT NULL DEFAULT 1,
 nguoi_sua_id uuid REFERENCES public.nguoi_dung(id),
 ngay_sua timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.chatbot_cau_hinh(id) VALUES(true) ON CONFLICT(id) DO NOTHING;
CREATE TABLE IF NOT EXISTS public.chatbot_kien_thuc (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tieu_de text NOT NULL CHECK(length(tieu_de) BETWEEN 1 AND 150),
 nhom text NOT NULL CHECK(nhom IN ('Câu hỏi thường gặp','Quy định lưu trú','Dịch vụ','Hướng dẫn đặt phòng')),
 noi_dung text NOT NULL CHECK(length(noi_dung) BETWEEN 1 AND 6000),
 xuat_ban boolean NOT NULL DEFAULT false,
 phien_ban integer NOT NULL DEFAULT 1,
 nguoi_sua_id uuid REFERENCES public.nguoi_dung(id),
 ngay_sua timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.chatbot_tac_vu (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 cuoc_tro_chuyen_id uuid NOT NULL REFERENCES public.cuoc_tro_chuyen(id),
 tin_nhan_id uuid NOT NULL UNIQUE REFERENCES public.tin_nhan(id),
 trang_thai text NOT NULL DEFAULT 'cho' CHECK(trang_thai IN ('cho','dang_chay','xong','bo_qua','loi')),
 khoa uuid, han_khoa timestamptz,
 so_lan integer NOT NULL DEFAULT 0,
 ma_loi text, cong_cu jsonb NOT NULL DEFAULT '[]',
 thoi_gian_ms integer, token_su_dung integer,
 nhu_cau jsonb CHECK(nhu_cau IS NULL OR jsonb_typeof(nhu_cau)='object'),
 ngay_tao timestamptz NOT NULL DEFAULT now(), hoan_thanh_luc timestamptz
);
CREATE INDEX IF NOT EXISTS chatbot_hang_doi ON public.chatbot_tac_vu(ngay_tao) WHERE trang_thai IN ('cho','dang_chay');
ALTER TABLE public.chatbot_cau_hinh ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_kien_thuc ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_tac_vu ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chatbot_cau_hinh,public.chatbot_kien_thuc,public.chatbot_tac_vu FROM anon,authenticated;
-- Worker uses the existing server DATABASE_URL; no browser policy grants access.

INSERT INTO public.migrations_ung_dung(phien_ban) VALUES('20261118-chatbot') ON CONFLICT DO NOTHING;

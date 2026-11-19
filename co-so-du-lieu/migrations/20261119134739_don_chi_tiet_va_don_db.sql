BEGIN;
SELECT pg_advisory_xact_lock(20261119,47);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.chung_tu_thanh_toan) OR EXISTS(SELECT 1 FROM public.goi_gia) OR EXISTS(SELECT 1 FROM public.quy_tac_gia) OR EXISTS(SELECT 1 FROM public.dat_phong WHERE goi_gia_id IS NOT NULL) THEN RAISE EXCEPTION 'Còn dữ liệu gói giá/chứng từ; dừng dọn DB để đối chiếu'; END IF;
 IF EXISTS(SELECT 1 FROM public.chi_tiet_dat_phong) THEN RAISE EXCEPTION 'Đã có chi tiết đơn; cần đối chiếu trước khi chuyển dữ liệu'; END IF;
END $$;
ALTER TABLE public.dat_phong DROP COLUMN goi_gia_id;
DROP TABLE public.quy_tac_gia RESTRICT;
DROP TABLE public.goi_gia RESTRICT;
DROP TABLE public.chung_tu_thanh_toan RESTRICT;
ALTER TABLE public.chi_tiet_dat_phong DROP CONSTRAINT chi_tiet_dat_phong_check;
ALTER TABLE public.chi_tiet_dat_phong DROP CONSTRAINT chi_tiet_dat_phong_don_gia_chot_check;
ALTER TABLE public.chi_tiet_dat_phong ADD COLUMN loai_muc text NOT NULL DEFAULT 'combo',ADD COLUMN phong_id uuid REFERENCES public.phong(id) ON DELETE RESTRICT,ADD COLUMN thu_tu integer NOT NULL DEFAULT 0,ADD COLUMN du_lieu_chot jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.chi_tiet_dat_phong ADD CONSTRAINT chi_tiet_loai_hop_le CHECK(loai_muc IN ('phong','combo','dich_vu','phu_thu','dieu_chinh')),
 ADD CONSTRAINT chi_tiet_gia_hop_le CHECK(don_gia_chot>=0 OR loai_muc='dieu_chinh'),
 ADD CONSTRAINT chi_tiet_nguon_hop_le CHECK((loai_muc='combo' AND combo_id IS NOT NULL AND dich_vu_id IS NULL AND phong_id IS NULL) OR (loai_muc='dich_vu' AND combo_id IS NULL AND phong_id IS NULL) OR (loai_muc IN ('phong','phu_thu','dieu_chinh') AND phong_id IS NOT NULL AND combo_id IS NULL AND dich_vu_id IS NULL));
CREATE INDEX chi_tiet_don_thu_tu_idx ON public.chi_tiet_dat_phong(dat_phong_id,thu_tu,id);
CREATE OR REPLACE FUNCTION public.dong_bo_chi_tiet_don(p_id uuid,p_lich_su boolean DEFAULT false) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE d public.dat_phong%ROWTYPE; cfg jsonb; arr jsonb:='[]'; item jsonb; co public.combo%ROWTYPE; tien_combo numeric:=0; gia numeric; phu_thu numeric; tien_phong numeric; i integer:=10; clean jsonb; ten_phong_chot text;
BEGIN
 SELECT * INTO d FROM public.dat_phong WHERE id=p_id;
 IF NOT FOUND THEN RETURN; END IF;
 cfg:=coalesce(d.cau_hinh_gia_chot,'{}'::jsonb);
 IF jsonb_typeof(cfg->'combo_da_chon')='array' AND jsonb_array_length(cfg->'combo_da_chon')>0 THEN arr:=cfg->'combo_da_chon';
 ELSIF jsonb_typeof(cfg->'combo_ids')='array' THEN
  FOR co IN SELECT * FROM public.combo WHERE id::text IN(SELECT jsonb_array_elements_text(cfg->'combo_ids')) ORDER BY id LOOP arr:=arr||jsonb_build_array(jsonb_build_object('id',co.id,'ten_combo',co.ten_combo,'gia_combo',CASE WHEN p_lich_su THEN 0 ELSE co.gia_combo END,'so_gio_bao_gom',co.so_gio_bao_gom,'gia_chua_xac_dinh',p_lich_su)); END LOOP;
 ELSIF d.combo_id IS NOT NULL THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',combo_id,'ten_combo',ten_muc_chot,'gia_combo',don_gia_chot,'so_gio_bao_gom',du_lieu_chot->'so_gio_bao_gom','gia_chua_xac_dinh',du_lieu_chot->'gia_chua_xac_dinh') ORDER BY thu_tu),'[]') INTO arr FROM public.chi_tiet_dat_phong WHERE dat_phong_id=p_id AND loai_muc='combo';
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(arr) x WHERE x->>'id'=d.combo_id::text) THEN
   SELECT * INTO co FROM public.combo WHERE id=d.combo_id;
   arr:=jsonb_build_array(jsonb_build_object('id',co.id,'ten_combo',co.ten_combo,'gia_combo',CASE WHEN p_lich_su THEN 0 ELSE co.gia_combo END,'so_gio_bao_gom',co.so_gio_bao_gom,'gia_chua_xac_dinh',p_lich_su));
  END IF;
 END IF;
 SELECT ten_muc_chot INTO ten_phong_chot FROM public.chi_tiet_dat_phong WHERE dat_phong_id=p_id AND loai_muc='phong' AND phong_id=d.phong_id ORDER BY thu_tu,id LIMIT 1;
 DELETE FROM public.chi_tiet_dat_phong WHERE dat_phong_id=p_id;
 FOR item IN SELECT value FROM jsonb_array_elements(arr) LOOP
  gia:=coalesce((item->>'gia_combo')::numeric,0);
  INSERT INTO public.chi_tiet_dat_phong(dat_phong_id,combo_id,loai_muc,ten_muc_chot,so_luong,don_gia_chot,thu_tu,du_lieu_chot) VALUES(p_id,(item->>'id')::uuid,'combo',coalesce(nullif(item->>'ten_combo',''),'Combo đã chọn'),1,gia,i,jsonb_build_object('so_gio_bao_gom',item->'so_gio_bao_gom','gia_chua_xac_dinh',coalesce((item->>'gia_chua_xac_dinh')::boolean,false)));
  tien_combo:=tien_combo+gia;i:=i+1;
 END LOOP;
 phu_thu:=greatest(0,coalesce((cfg->>'tien_phu_thu')::numeric,0));
 tien_phong:=d.tien_phong-tien_combo-phu_thu;
 INSERT INTO public.chi_tiet_dat_phong(dat_phong_id,phong_id,loai_muc,ten_muc_chot,so_luong,don_gia_chot,thu_tu) SELECT p_id,d.phong_id,'phong',coalesce(ten_phong_chot,'Phòng '||p.ma_phong),1,greatest(tien_phong,0),0 FROM public.phong p WHERE p.id=d.phong_id;
 IF phu_thu>0 THEN INSERT INTO public.chi_tiet_dat_phong(dat_phong_id,phong_id,loai_muc,ten_muc_chot,so_luong,don_gia_chot,thu_tu) VALUES(p_id,d.phong_id,'phu_thu','Nhận sớm / trả muộn',1,phu_thu,100); END IF;
 IF tien_phong<0 THEN INSERT INTO public.chi_tiet_dat_phong(dat_phong_id,phong_id,loai_muc,ten_muc_chot,so_luong,don_gia_chot,thu_tu) VALUES(p_id,d.phong_id,'dieu_chinh','Điều chỉnh theo giá chốt',1,tien_phong,110); END IF;
 IF d.tien_dich_vu>0 THEN INSERT INTO public.chi_tiet_dat_phong(dat_phong_id,loai_muc,ten_muc_chot,so_luong,don_gia_chot,thu_tu) VALUES(p_id,'dich_vu','Dịch vụ đã ghi nhận',1,d.tien_dich_vu,120); END IF;
 IF (SELECT coalesce(sum(thanh_tien),0) FROM public.chi_tiet_dat_phong WHERE dat_phong_id=p_id)<>d.tien_phong+d.tien_dich_vu THEN RAISE EXCEPTION 'Tổng chi tiết không khớp đơn'; END IF;
 clean:=cfg-ARRAY['combo_ids','combo_da_chon'];
 IF clean IS DISTINCT FROM cfg THEN UPDATE public.dat_phong SET cau_hinh_gia_chot=clean WHERE id=p_id; END IF;
END $$;
REVOKE ALL ON FUNCTION public.dong_bo_chi_tiet_don(uuid,boolean) FROM PUBLIC,anon,authenticated;
-- Chuyển đơn cũ trước khi bật trigger; không tự đoán giá combo quá khứ khi thiếu snapshot.
DO $$ DECLARE r record; BEGIN FOR r IN SELECT id FROM public.dat_phong LOOP PERFORM public.dong_bo_chi_tiet_don(r.id,true); END LOOP; END $$;
CREATE OR REPLACE FUNCTION public.chot_chi_tiet_don() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$ BEGIN IF pg_trigger_depth()>1 THEN RETURN NEW; END IF;PERFORM public.dong_bo_chi_tiet_don(NEW.id,false);RETURN NEW;END $$;
REVOKE ALL ON FUNCTION public.chot_chi_tiet_don() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER trg_chot_chi_tiet_don AFTER INSERT OR UPDATE OF phong_id,tien_phong,tien_dich_vu,combo_id,cau_hinh_gia_chot ON public.dat_phong FOR EACH ROW EXECUTE FUNCTION public.chot_chi_tiet_don();
ALTER TABLE public.khoa_chong_lap_yeu_cau ALTER COLUMN nguoi_dung_id DROP NOT NULL;
ALTER TABLE public.khoa_chong_lap_yeu_cau ADD COLUMN pham_vi text;
UPDATE public.khoa_chong_lap_yeu_cau SET pham_vi='u:'||nguoi_dung_id::text;
ALTER TABLE public.khoa_chong_lap_yeu_cau ALTER COLUMN pham_vi SET NOT NULL;
ALTER TABLE public.khoa_chong_lap_yeu_cau ADD CONSTRAINT khoa_pham_vi_hop_le CHECK((nguoi_dung_id IS NOT NULL AND pham_vi='u:'||nguoi_dung_id::text) OR(nguoi_dung_id IS NULL AND pham_vi~'^g:[0-9a-f]{64}$'));
ALTER TABLE public.khoa_chong_lap_yeu_cau DROP CONSTRAINT khoa_chong_lap_yeu_cau_nguoi_dung_id_ten_nghiep_vu_khoa_yeu_key;
CREATE UNIQUE INDEX khoa_pham_vi_nghiep_vu_idx ON public.khoa_chong_lap_yeu_cau(pham_vi,ten_nghiep_vu,khoa_yeu_cau);
REVOKE ALL ON public.chi_tiet_dat_phong,public.khoa_chong_lap_yeu_cau FROM anon,authenticated;

CREATE OR REPLACE FUNCTION public.ghi_nhat_ky_danh_muc() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE actor uuid; oldj jsonb; newj jsonb; oldsafe jsonb; newsafe jsonb; object_id uuid; label text; changed jsonb;
BEGIN
 oldj:=CASE WHEN TG_OP='INSERT' THEN '{}'::jsonb ELSE to_jsonb(OLD) END;
 newj:=CASE WHEN TG_OP='DELETE' THEN '{}'::jsonb ELSE to_jsonb(NEW) END;
 SELECT coalesce(jsonb_agg(k),'[]') INTO changed FROM jsonb_object_keys(oldj||newj) k WHERE oldj->k IS DISTINCT FROM newj->k AND k NOT IN ('ngay_cap_nhat','trang_thai_cap_nhat_luc');
 IF TG_OP='UPDATE' AND jsonb_array_length(changed)=0 THEN RETURN NEW; END IF;
 actor:=nullif(current_setting('app.nguoi_thuc_hien_id',true),'')::uuid;
 IF actor IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.nguoi_dung WHERE id=actor) THEN actor:=NULL; END IF;
 SELECT coalesce(jsonb_object_agg(key,value),'{}') INTO oldsafe FROM jsonb_each(oldj) WHERE key=ANY(ARRAY['id','ma_phong','ten_phong','ten_loai','ten_homestay','ten_combo','homestay_id','loai_phong_id','trang_thai','trang_thai_van_hanh','gia_moi_gio','gia_moi_dem','gia_moi_ngay','gia_phu_thu_gio','gia_combo','suc_chua']);
 SELECT coalesce(jsonb_object_agg(key,value),'{}') INTO newsafe FROM jsonb_each(newj) WHERE key=ANY(ARRAY['id','ma_phong','ten_phong','ten_loai','ten_homestay','ten_combo','homestay_id','loai_phong_id','trang_thai','trang_thai_van_hanh','gia_moi_gio','gia_moi_dem','gia_moi_ngay','gia_phu_thu_gio','gia_combo','suc_chua']);
 object_id:=coalesce(newj->>'id',oldj->>'id')::uuid;
 label:=CASE TG_TABLE_NAME WHEN 'phong' THEN 'phòng' WHEN 'loai_phong' THEN 'loại phòng' WHEN 'homestay' THEN 'chi nhánh' WHEN 'combo' THEN 'combo' END;
 INSERT INTO public.nhat_ky_he_thong(nguoi_thuc_hien_id,hanh_dong,ten_bang,ban_ghi_id,du_lieu_thay_doi) VALUES(actor,(CASE TG_OP WHEN 'INSERT' THEN 'Tạo ' WHEN 'UPDATE' THEN 'Sửa ' ELSE 'Xóa ' END)||label,TG_TABLE_NAME,object_id,jsonb_build_object('truoc',oldsafe,'sau',newsafe,'truong_thay_doi',changed));
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
REVOKE ALL ON FUNCTION public.ghi_nhat_ky_danh_muc() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER trg_nhat_ky_phong AFTER INSERT OR UPDATE OR DELETE ON public.phong FOR EACH ROW EXECUTE FUNCTION public.ghi_nhat_ky_danh_muc();
CREATE TRIGGER trg_nhat_ky_loai_phong AFTER INSERT OR UPDATE OR DELETE ON public.loai_phong FOR EACH ROW EXECUTE FUNCTION public.ghi_nhat_ky_danh_muc();
CREATE TRIGGER trg_nhat_ky_homestay AFTER INSERT OR UPDATE OR DELETE ON public.homestay FOR EACH ROW EXECUTE FUNCTION public.ghi_nhat_ky_danh_muc();
CREATE TRIGGER trg_nhat_ky_combo AFTER INSERT OR UPDATE OR DELETE ON public.combo FOR EACH ROW EXECUTE FUNCTION public.ghi_nhat_ky_danh_muc();

INSERT INTO public.migrations_ung_dung(phien_ban) VALUES('20261119134739_don_chi_tiet_va_don_db') ON CONFLICT DO NOTHING;
COMMIT;

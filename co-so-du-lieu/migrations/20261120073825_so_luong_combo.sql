BEGIN;
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
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',combo_id,'ten_combo',ten_muc_chot,'gia_combo',don_gia_chot,'so_luong',so_luong,'so_gio_bao_gom',du_lieu_chot->'so_gio_bao_gom','gia_chua_xac_dinh',du_lieu_chot->'gia_chua_xac_dinh') ORDER BY thu_tu),'[]') INTO arr FROM public.chi_tiet_dat_phong WHERE dat_phong_id=p_id AND loai_muc='combo';
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(arr) x WHERE x->>'id'=d.combo_id::text) THEN
   SELECT * INTO co FROM public.combo WHERE id=d.combo_id;
   arr:=jsonb_build_array(jsonb_build_object('id',co.id,'ten_combo',co.ten_combo,'gia_combo',CASE WHEN p_lich_su THEN 0 ELSE co.gia_combo END,'so_gio_bao_gom',co.so_gio_bao_gom,'gia_chua_xac_dinh',p_lich_su));
  END IF;
 END IF;
 SELECT ten_muc_chot INTO ten_phong_chot FROM public.chi_tiet_dat_phong WHERE dat_phong_id=p_id AND loai_muc='phong' AND phong_id=d.phong_id ORDER BY thu_tu,id LIMIT 1;
 DELETE FROM public.chi_tiet_dat_phong WHERE dat_phong_id=p_id;
 FOR item IN SELECT value FROM jsonb_array_elements(arr) LOOP
  gia:=coalesce((item->>'gia_combo')::numeric,0);
  INSERT INTO public.chi_tiet_dat_phong(dat_phong_id,combo_id,loai_muc,ten_muc_chot,so_luong,don_gia_chot,thu_tu,du_lieu_chot) VALUES(p_id,(item->>'id')::uuid,'combo',coalesce(nullif(item->>'ten_combo',''),'Combo đã chọn'),coalesce((item->>'so_luong')::integer,1),gia,i,jsonb_build_object('so_gio_bao_gom',item->'so_gio_bao_gom','gia_chua_xac_dinh',coalesce((item->>'gia_chua_xac_dinh')::boolean,false)));
  tien_combo:=tien_combo+gia*coalesce((item->>'so_luong')::integer,1);i:=i+1;
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
COMMIT;

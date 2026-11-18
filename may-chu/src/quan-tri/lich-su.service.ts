import { Injectable, BadRequestException } from '@nestjs/common';
import { QuanTriService } from './quan-tri.service.js';
import { moDb, ngay } from './van-hanh.db.js';
export const LICH_SU_SQL = `WITH lich AS(
 SELECT id::text,'Hệ thống' AS nhom,nguoi_thuc_hien_id as nguoi,hanh_dong,ten_bang,ngay_tao,du_lieu_thay_doi as du_lieu FROM public.nhat_ky_he_thong
 UNION ALL SELECT id::text,'Đăng nhập',nguoi_dung_id,ket_qua,'lich_su_dang_nhap',ngay_tao,jsonb_build_object('dia_chi_ip',dia_chi_ip,'thiet_bi',thiet_bi) FROM public.lich_su_dang_nhap
 UNION ALL SELECT id::text,'Đơn đặt phòng',nguoi_thuc_hien_id,hanh_dong,'dat_phong',ngay_tao,jsonb_build_object('dat_phong_id',dat_phong_id,'truoc',du_lieu_cu,'sau',du_lieu_moi) FROM public.nhat_ky_don_dat_phong
 UNION ALL SELECT id::text,'Trạng thái đơn',nguoi_thay_doi_id,trang_thai_moi,'dat_phong',ngay_thay_doi,jsonb_build_object('dat_phong_id',dat_phong_id,'truoc',trang_thai_cu,'sau',trang_thai_moi) FROM public.lich_su_dat_phong
 UNION ALL SELECT id::text,'Thu chi',nguoi_thuc_hien_id,hanh_dong,'so_thu_chi',ngay_tao,jsonb_build_object('thu_chi_id',thu_chi_id,'truoc',du_lieu_cu,'sau',du_lieu_moi) FROM public.nhat_ky_thu_chi
 UNION ALL SELECT id::text,'AI',NULL,trang_thai,'chatbot_tac_vu',ngay_tao,jsonb_build_object('ma_loi',ma_loi,'cong_cu',cong_cu,'thoi_gian_ms',thoi_gian_ms) FROM public.chatbot_tac_vu)
`;
export function anBiMat(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(anBiMat);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([k]) =>
            !/(token|password|mat.?khau|api.?key|secret|authorization)/i.test(
              k,
            ),
        )
        .map(([k, v]) => [k, anBiMat(v)]),
    );
  return value;
}
@Injectable()
export class LichSuService {
  constructor(private readonly admin: QuanTriService) {}
  private db(){return moDb();}
  async list(uid: string, q: Record<string, string>) {
    await this.admin.kiemTraQuanTri(uid);
    const from = ngay(q.tu, '2000-01-01'),
      to = ngay(q.den, '2100-01-01'),
      page = Number(q.trang || 1);
    if (from > to || !Number.isInteger(page) || page < 1 || page > 100000)
      throw new BadRequestException('Bộ lọc không hợp lệ');
    const c = await this.db();
    try {
      const r = await c.query(
        LICH_SU_SQL +
          `SELECT l.*,n.ho_ten as nguoi_thuc_hien,count(*) OVER()::int as tong_so FROM lich l LEFT JOIN public.nguoi_dung n ON n.id=l.nguoi WHERE l.ngay_tao>=$1::date AT TIME ZONE 'Asia/Ho_Chi_Minh' AND l.ngay_tao<($2::date+1) AT TIME ZONE 'Asia/Ho_Chi_Minh' AND ($3='' OR l.nhom=$3) AND ($4='' OR lower(l.hanh_dong||' '||coalesce(n.ho_ten,'')) LIKE '%'||lower($4)||'%') ORDER BY l.ngay_tao DESC,l.nhom,l.id LIMIT 50 OFFSET $5`,
        [from, to, q.nhom || '', (q.tim || '').slice(0, 150), (page - 1) * 50],
      );
      return {
        dong: r.rows.map((x) => ({ ...x, du_lieu: anBiMat(x.du_lieu) })),
        tong_so: r.rows[0]?.tong_so || 0,
      };
    } finally {
      await c.end();
    }
  }
}

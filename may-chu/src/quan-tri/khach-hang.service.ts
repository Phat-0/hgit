import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { QuanTriService } from './quan-tri.service.js';
import { moDb, chu, ngay, ghiNhatKy } from './van-hanh.db.js';
export const KHOA_KHACH =
  "COALESCE('u:'||d.nguoi_dung_id::text,CASE WHEN d.so_dien_thoai_dat IS NOT NULL THEN 'p:'||regexp_replace(d.so_dien_thoai_dat,'[^0-9+]','','g') END,'o:'||d.id::text)";
const DON = `SELECT d.*,${KHOA_KHACH} AS khach_khoa,p.ten_phong,l.ten_loai,h.ten_homestay,extract(epoch from(d.tra_phong_luc-d.nhan_phong_luc))/3600 as so_gio FROM public.dat_phong d JOIN public.phong p ON p.id=d.phong_id JOIN public.loai_phong l ON l.id=p.loai_phong_id JOIN public.homestay h ON h.id=d.homestay_id`;
export function khoaKhach(x: unknown) {
  const s = chu(x, 3, 80);
  if (!/^(u:[0-9a-f-]{36}|p:\+?[0-9]{9,15}|o:[0-9a-f-]{36})$/i.test(s))
    throw new BadRequestException('Khóa khách không hợp lệ');
  return s;
}
@Injectable()
export class KhachHangQuanTriService {
  constructor(private readonly admin: QuanTriService) {}
  private db() {
    return moDb();
  }
  async list(uid: string, q: Record<string, string>) {
    await this.admin.kiemTraQuanTri(uid);
    const c = await this.db();
    try {
      const from = ngay(q.tu, '2000-01-01'),
        to = ngay(q.den, '2100-01-01');
      if (from > to) throw new BadRequestException('Khoảng ngày không hợp lệ');
      const min = Number(q.toi_thieu || 0);
      if (!Number.isInteger(min) || min < 0)
        throw new BadRequestException('Tần suất không hợp lệ');
      const r = await c.query(
        `WITH don AS (${DON} WHERE d.ngay_tao>=$1::date AT TIME ZONE 'Asia/Ho_Chi_Minh' AND d.ngay_tao<($2::date+1) AT TIME ZONE 'Asia/Ho_Chi_Minh' AND ($3='' OR d.homestay_id::text=$3)),nhom AS(SELECT khach_khoa,max(nguoi_dung_id::text) as nguoi_dung_id,(array_agg(ten_don ORDER BY ngay_tao DESC))[1] as ten_khach,(array_agg(so_dien_thoai_dat ORDER BY ngay_tao DESC))[1] as so_dien_thoai,count(*)::int as so_don,count(*) FILTER(WHERE trang_thai='Đã trả phòng')::int as da_o,count(*) FILTER(WHERE trang_thai IN('Đã hủy','Không nhận phòng'))::int as huy,coalesce(sum(tong_tien) FILTER(WHERE trang_thai NOT IN('Đã hủy','Không nhận phòng')),0) as gia_tri_don,coalesce(sum(tien_da_thanh_toan) FILTER(WHERE trang_thai NOT IN('Đã hủy','Không nhận phòng')),0) as da_thu,min(ngay_tao) as lan_dau,max(ngay_tao) as gan_nhat,avg(so_gio) as gio_trung_binh,array_agg(DISTINCT ten_homestay) as chi_nhanh,array_agg(DISTINCT ten_loai) as loai_phong,array_agg(DISTINCT hinh_thuc_dat) as loai_dat FROM don GROUP BY khach_khoa),keys AS(SELECT khach_khoa FROM nhom UNION SELECT khach_khoa FROM public.ho_so_khach_hang WHERE khach_khoa IS NOT NULL) SELECT k.khach_khoa,coalesce(n.nguoi_dung_id,p.nguoi_dung_id::text) as nguoi_dung_id,coalesce(p.thong_tin_bo_sung->>'ten_khach',n.ten_khach,u.ho_ten) as ten_khach,coalesce(p.thong_tin_bo_sung->>'so_dien_thoai',n.so_dien_thoai,u.so_dien_thoai) as so_dien_thoai,coalesce(n.so_don,0) as so_don,coalesce(n.da_o,0) as da_o,coalesce(n.huy,0) as huy,coalesce(n.gia_tri_don,0) as gia_tri_don,coalesce(n.da_thu,0) as da_thu,n.lan_dau,n.gan_nhat,n.gio_trung_binh,n.chi_nhanh,n.loai_phong,n.loai_dat,p.ngan_sach_du_kien,p.so_khach_uu_tien,p.thong_tin_bo_sung,coalesce((SELECT json_agg(json_build_object('ten',s.ten_thuoc_tinh,'gia_tri',s.gia_tri,'nguon',s.nguon)) FROM public.so_thich_khach_hang s WHERE s.ho_so_id=p.id),'[]'::json) as so_thich FROM keys k LEFT JOIN nhom n USING(khach_khoa) LEFT JOIN public.ho_so_khach_hang p USING(khach_khoa) LEFT JOIN public.nguoi_dung u ON u.id=p.nguoi_dung_id WHERE coalesce(n.so_don,0)>=$4 AND ($3='' OR n.khach_khoa IS NOT NULL) AND ($5='' OR lower(coalesce(n.ten_khach,p.thong_tin_bo_sung->>'ten_khach',u.ho_ten,'')||' '||coalesce(n.so_dien_thoai,p.thong_tin_bo_sung->>'so_dien_thoai','')) LIKE '%'||lower($5)||'%') AND ($6='' OR EXISTS(SELECT 1 FROM public.so_thich_khach_hang s WHERE s.ho_so_id=p.id AND lower(s.ten_thuoc_tinh||' '||s.gia_tri) LIKE '%'||lower($6)||'%') OR EXISTS(SELECT 1 FROM don dd WHERE dd.khach_khoa=k.khach_khoa AND lower(dd.hinh_thuc_dat||' '||dd.ten_loai||' '||dd.ten_homestay) LIKE '%'||lower($6)||'%')) ORDER BY n.gan_nhat DESC NULLS LAST,k.khach_khoa LIMIT 1000`,
        [
          from,
          to,
          q.chi_nhanh || '',
          min,
          (q.tim || '').slice(0, 150),
          (q.so_thich || '').slice(0, 150),
        ],
      );
      const groups = new Map<
        string,
        { ten_thuoc_tinh: string; gia_tri: string; so_khach: number }
      >();
      for (const row of r.rows.filter((x) => !x.thong_tin_bo_sung?.luu_tru)) {
        const seen = new Set<string>();
        for (const p of row.so_thich || []) {
          const key = p.ten + ':' + p.gia_tri;
          if (seen.has(key)) continue;
          seen.add(key);
          const item = groups.get(key) || {
            ten_thuoc_tinh: p.ten,
            gia_tri: p.gia_tri,
            so_khach: 0,
          };
          item.so_khach++;
          groups.set(key, item);
        }
      }
      for (const row of r.rows.filter((x) => !x.thong_tin_bo_sung?.luu_tru))
        for (const [label, values] of [
          ['Loại đặt', row.loai_dat],
          ['Loại phòng', row.loai_phong],
          ['Chi nhánh', row.chi_nhanh],
        ] as [string, string[] | undefined][]) {
          for (const value of new Set(values || [])) {
            const key = label + ':' + value;
            const item = groups.get(key) || {
              ten_thuoc_tinh: label,
              gia_tri: value,
              so_khach: 0,
            };
            item.so_khach++;
            groups.set(key, item);
          }
        }
      const common = [...groups.values()]
        .sort((a, b) => b.so_khach - a.so_khach)
        .slice(0, 100);
      return {
        khach: r.rows,
        diem_chung: common,
        chi_nhanh: (
          await c.query(
            'SELECT id,ten_homestay FROM public.homestay ORDER BY ten_homestay',
          )
        ).rows,
      };
    } finally {
      await c.end();
    }
  }
  async detail(uid: string, key: string) {
    await this.admin.kiemTraQuanTri(uid);
    khoaKhach(key);
    const c = await this.db();
    try {
      const don = (
        await c.query(
          `WITH don AS(${DON}) SELECT id,ma_dat_phong,ten_don,so_dien_thoai_dat,ten_phong,ten_loai,ten_homestay,hinh_thuc_dat,nhan_phong_luc,tra_phong_luc,ngay_tao,trang_thai,tong_tien,tien_da_thanh_toan,so_khach,so_gio FROM don WHERE khach_khoa=$1 ORDER BY ngay_tao DESC LIMIT 500`,
          [key],
        )
      ).rows;
      const profile =
        (
          await c.query(
            'SELECT * FROM public.ho_so_khach_hang WHERE khach_khoa=$1',
            [key],
          )
        ).rows[0] || null;
      const prefs = profile
        ? (
            await c.query(
              'SELECT id,ten_thuoc_tinh,gia_tri,nguon FROM public.so_thich_khach_hang WHERE ho_so_id=$1 ORDER BY ngay_tao',
              [profile.id],
            )
          ).rows
        : [];
      return { ho_so: profile, so_thich: prefs, don };
    } finally {
      await c.end();
    }
  }
  async save(uid: string, b: Record<string, unknown>) {
    await this.admin.kiemTraQuanTri(uid);
    const key = khoaKhach(b.khach_khoa),
      name = chu(b.ten_khach, 1, 150),
      phone = chu(b.so_dien_thoai || '', 0, 20),
      note = chu(b.ghi_chu || '', 0, 2000),
      budget =
        b.ngan_sach_du_kien == null || b.ngan_sach_du_kien === ''
          ? null
          : Number(b.ngan_sach_du_kien),
      guests =
        b.so_khach_uu_tien == null || b.so_khach_uu_tien === ''
          ? null
          : Number(b.so_khach_uu_tien);
    if (
      (budget !== null &&
        (!Number.isSafeInteger(budget) || budget < 0 || budget > 1e12)) ||
      (guests !== null &&
        (!Number.isInteger(guests) || guests < 1 || guests > 100)) ||
      (phone && !/^\+?[0-9]{9,15}$/.test(phone))
    )
      throw new BadRequestException(
        'Ngân sách, số khách hoặc điện thoại không hợp lệ',
      );
    if (!Array.isArray(b.so_thich) || b.so_thich.length > 30)
      throw new BadRequestException('Tối đa 30 sở thích');
    const prefs = b.so_thich.map((v: any) => ({
      ten: chu(v.ten, 1, 80),
      gia_tri: chu(v.gia_tri, 1, 300),
      nguon: chu(v.nguon || 'Khách cung cấp', 1, 100),
    }));
    const consent = b.dong_y_phan_tich_ai === true,
      evidence = chu(b.bang_chung_dong_y || '', 0, 500);
    if (consent && !evidence)
      throw new BadRequestException(
        'Ghi nguồn xác nhận khách đồng ý phân tích',
      );
    const c = await this.db();
    try {
      await c.query('BEGIN');
      await c.query('SELECT pg_advisory_xact_lock(hashtext($1))', [key]);
      const r = await c.query(
        `INSERT INTO public.ho_so_khach_hang(khach_khoa,nguoi_dung_id,ngan_sach_du_kien,so_khach_uu_tien,thong_tin_bo_sung,dong_y_phan_tich_ai) VALUES($1,$2,$3,$4,$5::jsonb,$6) ON CONFLICT(khach_khoa) WHERE khach_khoa IS NOT NULL DO UPDATE SET ngan_sach_du_kien=$3,so_khach_uu_tien=$4,thong_tin_bo_sung=ho_so_khach_hang.thong_tin_bo_sung||$5::jsonb,dong_y_phan_tich_ai=$6,ngay_cap_nhat=now() RETURNING id`,
        [
          key,
          key.startsWith('u:') ? key.slice(2) : null,
          budget,
          guests,
          JSON.stringify({
            ten_khach: name,
            so_dien_thoai: phone,
            ghi_chu: note,
            bang_chung_dong_y: evidence,
            luu_tru: b.luu_tru === true,
          }),
          consent,
        ],
      );
      await c.query(
        'DELETE FROM public.so_thich_khach_hang WHERE ho_so_id=$1',
        [r.rows[0].id],
      );
      for (const p of prefs)
        await c.query(
          'INSERT INTO public.so_thich_khach_hang(ho_so_id,ten_thuoc_tinh,gia_tri,nguon) VALUES($1,$2,$3,$4)',
          [r.rows[0].id, p.ten, p.gia_tri, p.nguon],
        );
      await ghiNhatKy(
        c,
        uid,
        'Cập nhật hồ sơ khách',
        'ho_so_khach_hang',
        r.rows[0].id,
        { so_thich: prefs.length, luu_tru: b.luu_tru === true },
      );
      await c.query('COMMIT');
      return { ok: true };
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      await c.end();
    }
  }
}

import { BadRequestException, Injectable } from '@nestjs/common';
import { Client } from 'pg';
import { QuanTriService } from './quan-tri.service.js';
import { DON_BAO_CAO, THEO_NGAY, THEO_NHOM } from './thong-ke.sql.js';
@Injectable()
export class BaoCaoService {
  constructor(private readonly admin: QuanTriService) {}
  private async db() {
    const c = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: true },
      connectionTimeoutMillis: 5000,
      query_timeout: 10000,
    });
    await c.connect();
    return c;
  }
  async report(
    uid: string,
    start: string,
    end: string,
    branch = '',
    page = 'bao-cao',
  ) {
    await this.admin.kiemTraTrang(uid, page);
    const valid = (x: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(x)) return false;
      const d = new Date(x + 'T00:00:00Z');
      return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === x;
    };
    if (
      !valid(start) ||
      !valid(end) ||
      start > end ||
      (Date.parse(end) - Date.parse(start)) / 86400000 > 366
    )
      throw new BadRequestException('Chọn khoảng ngày hợp lệ, tối đa 367 ngày');
    if (branch && !/^[0-9a-f-]{36}$/i.test(branch))
      throw new BadRequestException('Chi nhánh không hợp lệ');
    const c = await this.db();
    try {
      await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const args = [start, end, branch || null];
      const daily = await c.query(THEO_NGAY, args);
      const kinds = await c.query(THEO_NHOM('hinh_thuc_dat'), args);
      const branches = await c.query(THEO_NHOM('ten_homestay'), args);
      const states = await c.query(THEO_NHOM('trang_thai'), args);
      const payment = await c.query(THEO_NHOM('trang_thai_thanh_toan'), args);
      const roomReport = await c.query(
        DON_BAO_CAO +
          ` SELECT p.id AS phong_id,h.ten_homestay||' · '||p.ten_phong AS ten,count(d.id)::int AS so_don,count(d.id) FILTER(WHERE d.trang_thai='Đã hủy')::int AS so_huy,count(d.id) FILTER(WHERE d.trang_thai IN ('Đã xác nhận','Đã nhận phòng','Đã trả phòng'))::int AS so_luot_hop_le,round(count(d.id)::numeric/($2::date-$1::date+1),2) AS tan_suat_ngay,coalesce(sum(d.tong_tien) FILTER(WHERE d.trang_thai IN ('Đã xác nhận','Đã nhận phòng','Đã trả phòng')),0) AS doanh_thu FROM public.phong p JOIN public.homestay h ON h.id=p.homestay_id LEFT JOIN don d ON d.phong_id=p.id WHERE ($3::uuid IS NULL OR p.homestay_id=$3) GROUP BY p.id,h.ten_homestay,p.ten_phong ORDER BY doanh_thu DESC,ten`,
        args,
      );
      const totals = await c.query(
        `SELECT (SELECT count(*)::int FROM public.homestay WHERE ($3::uuid IS NULL OR id=$3)) AS tong_homestay,(SELECT count(*)::int FROM public.phong WHERE ($3::uuid IS NULL OR homestay_id=$3)) AS tong_phong,(SELECT count(*)::int FROM public.nguoi_dung) AS tong_nguoi_dung,(SELECT count(*)::int FROM public.nguoi_dung WHERE ngay_tao >= $1::date AT TIME ZONE 'Asia/Ho_Chi_Minh' AND ngay_tao < ($2::date+1) AT TIME ZONE 'Asia/Ho_Chi_Minh') AS nguoi_dung_moi`,
        args,
      );
      const rating = await c.query(
        `SELECT g.so_sao AS sao,count(*)::int AS so_luong FROM public.danh_gia g JOIN public.dat_phong d ON d.id=g.dat_phong_id WHERE g.ngay_tao >= $1::date AT TIME ZONE 'Asia/Ho_Chi_Minh' AND g.ngay_tao < ($2::date+1) AT TIME ZONE 'Asia/Ho_Chi_Minh' AND ($3::uuid IS NULL OR d.homestay_id=$3) GROUP BY g.so_sao ORDER BY g.so_sao DESC`,
        args,
      );
      const orders = await c.query(
        DON_BAO_CAO +
          ' SELECT * FROM don ORDER BY ngay_tao DESC,id DESC LIMIT 300',
        args,
      );
      const collected = await c.query(
        `SELECT coalesce(sum(t.so_tien),0) AS da_thu FROM public.thanh_toan t JOIN public.dat_phong d ON d.id=t.dat_phong_id WHERE t.trang_thai='Đã xác nhận' AND t.ngay_tao >= $1::date AT TIME ZONE 'Asia/Ho_Chi_Minh' AND t.ngay_tao < ($2::date+1) AT TIME ZONE 'Asia/Ho_Chi_Minh' AND ($3::uuid IS NULL OR d.homestay_id=$3)`,
        args,
      );
      const options = await c.query(
        'SELECT id,ten_homestay FROM public.homestay ORDER BY ten_homestay',
      );
      await c.query('COMMIT');
      return {
        tu_ngay: start,
        den_ngay: end,
        theo_ngay: daily.rows,
        theo_kieu: kinds.rows,
        theo_chi_nhanh: branches.rows,
        theo_trang_thai: states.rows,
        theo_thanh_toan: payment.rows,
        theo_phong: roomReport.rows,
        tong_quan: totals.rows[0],
        danh_gia_theo_sao: rating.rows,
        don: orders.rows,
        da_thu: collected.rows[0].da_thu,
        chi_nhanh: options.rows,
      };
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      await c.end();
    }
  }
  async reviews(uid: string, q = '', stars = '', start = '', end = '') {
    await this.admin.kiemTraTrang(uid, 'danh-gia');
    if (
      q.length > 150 ||
      (stars && !/^[1-5]$/.test(stars)) ||
      (start && !/^\d{4}-\d{2}-\d{2}$/.test(start)) ||
      (end && !/^\d{4}-\d{2}-\d{2}$/.test(end))
    )
      throw new BadRequestException('Bộ lọc đánh giá không hợp lệ');
    const c = await this.db();
    try {
      const r = await c.query(
        `SELECT g.*,n.ho_ten,d.ma_dat_phong,p.ten_phong,h.ten_homestay FROM public.danh_gia g JOIN public.dat_phong d ON d.id=g.dat_phong_id JOIN public.phong p ON p.id=d.phong_id JOIN public.homestay h ON h.id=d.homestay_id LEFT JOIN public.nguoi_dung n ON n.id=g.nguoi_dung_id WHERE ($1='' OR concat_ws(' ',n.ho_ten,g.noi_dung,p.ten_phong,h.ten_homestay) ILIKE '%'||$1||'%') AND ($2::int IS NULL OR g.so_sao=$2) AND ($3::date IS NULL OR g.ngay_tao >= $3::date AT TIME ZONE 'Asia/Ho_Chi_Minh') AND ($4::date IS NULL OR g.ngay_tao < ($4::date+1) AT TIME ZONE 'Asia/Ho_Chi_Minh') ORDER BY g.ngay_tao DESC,g.id DESC LIMIT 300`,
        [q.trim(), stars || null, start || null, end || null],
      );
      return r.rows;
    } finally {
      await c.end();
    }
  }
  async overview(uid: string, month = '') {
    await this.admin.kiemTraTrang(uid, 'tong-quan');
    const today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
    month = month || today.slice(0, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
      throw new BadRequestException('Tháng không hợp lệ');
    const start = month + '-01',
      last = new Date(
        Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
      )
        .toISOString()
        .slice(0, 10),
      end = month === today.slice(0, 7) ? today : last;
    const report = await this.report(uid, start, end, '', 'tong-quan');
    const c = await this.db();
    try {
      const stats = await c.query(
        `SELECT (SELECT count(*)::int FROM public.homestay) AS tong_homestay,(SELECT count(*)::int FROM public.phong) AS tong_phong,(SELECT count(*)::int FROM public.nguoi_dung) AS tong_nguoi_dung,(SELECT count(*)::int FROM public.dat_phong) AS tong_dat_phong,(SELECT count(*)::int FROM public.danh_gia) AS tong_danh_gia,(SELECT count(*)::int FROM public.danh_gia WHERE ngay_tao >= date_trunc('week',now() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh') AS danh_gia_tuan`,
      );
      const change = await c.query(
        `SELECT coalesce(sum(tong_tien) FILTER(WHERE (ngay_tao AT TIME ZONE 'Asia/Ho_Chi_Minh')::date=$1::date),0)-coalesce(sum(tong_tien) FILTER(WHERE (ngay_tao AT TIME ZONE 'Asia/Ho_Chi_Minh')::date=$1::date-1),0) AS chenh_lech FROM public.dat_phong WHERE trang_thai IN ('Đã xác nhận','Đã nhận phòng','Đã trả phòng') AND ngay_tao >= ($1::date-1) AT TIME ZONE 'Asia/Ho_Chi_Minh'`,
        [today],
      );
      const reviews = await c.query(
        `SELECT g.id,g.dat_phong_id,g.so_sao,g.noi_dung,g.ngay_tao,n.ho_ten,p.ten_phong FROM public.danh_gia g LEFT JOIN public.nguoi_dung n ON n.id=g.nguoi_dung_id JOIN public.dat_phong d ON d.id=g.dat_phong_id JOIN public.phong p ON p.id=d.phong_id ORDER BY g.ngay_tao DESC,g.id DESC LIMIT 5`,
      );
      return {
        ...stats.rows[0],
        ...report,
        chenh_lech_hom_qua: change.rows[0].chenh_lech,
        danh_gia_moi: reviews.rows,
      };
    } finally {
      await c.end();
    }
  }
}

import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Client } from 'pg';

@Injectable()
export class HomestayService {
  private async truyVan<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new ServiceUnavailableException('Chưa cấu hình cơ sở dữ liệu');
    const client = new Client({ connectionString, connectionTimeoutMillis: 5000, query_timeout: 8000, ssl: { rejectUnauthorized: true } });
    try {
      await client.connect();
      await client.query('BEGIN READ ONLY');
      const result = await client.query<T & import('pg').QueryResultRow>(sql, params);
      await client.query('COMMIT');
      return result.rows;
    } catch {
      throw new ServiceUnavailableException('Không thể tải dữ liệu Homestay');
    } finally { await client.end(); }
  }

  danhSach(tinhThanh?: string) {
    return this.truyVan(`
      SELECT h.id, h.ten_homestay, h.mo_ta, h.dia_chi, h.tinh_thanh, h.phuong_xa,
             h.vi_do, h.kinh_do,
             (SELECT a.duong_dan FROM public.hinh_anh_homestay a
              WHERE a.homestay_id = h.id ORDER BY a.la_anh_dai_dien DESC, a.thu_tu ASC, a.id LIMIT 1) AS anh_dai_dien,
             (SELECT count(*)::int FROM public.phong p WHERE p.homestay_id = h.id) AS so_phong
      FROM public.homestay h
      WHERE h.trang_thai = 'Đang hoạt động'
        AND ($1::text IS NULL OR h.tinh_thanh ILIKE '%' || $1::text || '%')
      ORDER BY h.ngay_tao DESC, h.id
      LIMIT 100`, [tinhThanh || null]);
  }

  danhSachPhong(homestayId: string) {
    return this.truyVan(`
      SELECT p.id, p.ma_phong, p.ten_phong, p.tang, p.trang_thai_van_hanh,
             l.id AS loai_phong_id, l.ten_loai, l.mo_ta, l.suc_chua, l.dien_tich_m2,
             (SELECT a.duong_dan FROM public.hinh_anh_phong a
              WHERE a.phong_id = p.id ORDER BY a.la_anh_dai_dien DESC, a.thu_tu ASC, a.id LIMIT 1) AS anh_dai_dien
      FROM public.phong p
      JOIN public.loai_phong l ON l.id = p.loai_phong_id AND l.homestay_id = p.homestay_id
      JOIN public.homestay h ON h.id = p.homestay_id
      WHERE p.homestay_id = $1::uuid AND h.trang_thai = 'Đang hoạt động'
        AND p.trang_thai_van_hanh NOT IN ('Bảo trì', 'Bị khóa')
      ORDER BY p.ma_phong, p.id
      LIMIT 200`, [homestayId]);
  }
}

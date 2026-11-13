import {
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Client } from 'pg';
export const TRANG_NHAN_VIEN = [
  'tong-quan',
  'lich',
  'chi-nhanh',
  'phong',
  'loai-phong',
  'goi-combo',
  'dat-phong',
  'trang-chu',
  'danh-gia',
  'bao-cao',
  'tin-nhan',
];
export const TRANG_QUAN_TRI = [...TRANG_NHAN_VIEN, 'nhan-vien'];

@Injectable()
export class QuanTriService {
  private async ketNoi() {
    if (!process.env.DATABASE_URL)
      throw new ServiceUnavailableException('Chưa cấu hình DATABASE_URL');
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: true },
      connectionTimeoutMillis: 5000,
      query_timeout: 8000,
    });
    await client.connect();
    return client;
  }

  async kiemTraQuanTri(userId: string) {
    let client: Client | undefined;
    try {
      client = await this.ketNoi();
      const r = await client.query(
        `
        SELECT EXISTS (
          SELECT 1 FROM public.nguoi_dung n
          JOIN public.nguoi_dung_vai_tro nv ON nv.nguoi_dung_id = n.id
          JOIN public.vai_tro v ON v.id = nv.vai_tro_id
          WHERE n.id = $1::uuid AND n.trang_thai = 'Đang hoạt động'
            AND v.ma_vai_tro = 'Quản trị hệ thống'
            AND nv.homestay_id IS NULL AND nv.ngay_thu_hoi IS NULL
        ) AS duoc_phep`,
        [userId],
      );
      if (!r.rows[0]?.duoc_phep)
        throw new ForbiddenException(
          'Tài khoản không có quyền quản trị hệ thống',
        );
      return { vai_tro: 'Quản trị hệ thống', duoc_phep: true };
    } finally {
      await client?.end();
    }
  }

  async truyCap(userId: string) {
    const c = await this.ketNoi();
    try {
      const r = await c.query(
        `SELECT v.ma_vai_tro,v.quyen_trang,nv.homestay_id FROM public.nguoi_dung n JOIN public.nguoi_dung_vai_tro nv ON nv.nguoi_dung_id=n.id JOIN public.vai_tro v ON v.id=nv.vai_tro_id WHERE n.id=$1 AND n.trang_thai='Đang hoạt động' AND nv.ngay_thu_hoi IS NULL`,
        [userId],
      );
      const admin = r.rows.some(
        (x) => x.ma_vai_tro === 'Quản trị hệ thống' && !x.homestay_id,
      );
      const pages = admin
        ? TRANG_QUAN_TRI
        : [
            ...new Set<string>(r.rows.flatMap((x) => x.quyen_trang || [])),
          ].filter((x) => TRANG_NHAN_VIEN.includes(x));
      if (!pages.length)
        throw new ForbiddenException(
          'Tài khoản chưa được cấp quyền vào trang quản trị',
        );
      return {
        duoc_phep: true,
        quan_tri_he_thong: admin,
        trang: pages,
        vai_tro: r.rows.map((x) => x.ma_vai_tro).join(', '),
      };
    } finally {
      await c.end();
    }
  }
  async kiemTraTrang(userId: string, page: string) {
    const access = await this.truyCap(userId);
    if (!page.split('|').some((p) => access.trang.includes(p)))
      throw new ForbiddenException('Bạn không được cấp quyền vào trang này');
    return access;
  }

  async tongQuan(userId: string) {
    await this.kiemTraQuanTri(userId);
    const client = await this.ketNoi();
    try {
      const r = await client.query(`
        SELECT
          (SELECT count(*)::int FROM public.homestay) AS tong_homestay,
          (SELECT count(*)::int FROM public.homestay WHERE trang_thai = 'Chờ duyệt') AS cho_duyet,
          (SELECT count(*)::int FROM public.phong) AS tong_phong,
          (SELECT count(*)::int FROM public.dat_phong) AS tong_dat_phong,
          (SELECT count(*)::int FROM public.nguoi_dung) AS tong_nguoi_dung`);
      return r.rows[0];
    } finally {
      await client.end();
    }
  }
}

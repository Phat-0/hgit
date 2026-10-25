import { ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Client } from 'pg';

@Injectable()
export class QuanTriService {
  private async ketNoi() {
    if (!process.env.DATABASE_URL) throw new ServiceUnavailableException('Chưa cấu hình DATABASE_URL');
    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true }, connectionTimeoutMillis: 5000, query_timeout: 8000 });
    await client.connect();
    return client;
  }

  async kiemTraQuanTri(userId: string) {
    let client: Client | undefined;
    try {
      client = await this.ketNoi();
      const r = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM public.nguoi_dung n
          JOIN public.nguoi_dung_vai_tro nv ON nv.nguoi_dung_id = n.id
          JOIN public.vai_tro v ON v.id = nv.vai_tro_id
          WHERE n.id = $1::uuid AND n.trang_thai = 'Đang hoạt động'
            AND v.ma_vai_tro = 'Quản trị hệ thống'
            AND nv.homestay_id IS NULL AND nv.ngay_thu_hoi IS NULL
        ) AS duoc_phep`, [userId]);
      if (!r.rows[0]?.duoc_phep) throw new ForbiddenException('Tài khoản không có quyền quản trị hệ thống');
      return { vai_tro: 'Quản trị hệ thống', duoc_phep: true };
    } finally { await client?.end(); }
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
    } finally { await client.end(); }
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Client } from 'pg';
import { QuanTriService, TRANG_NHAN_VIEN } from './quan-tri.service.js';
@Injectable()
export class VaiTroService {
  constructor(private readonly admin: QuanTriService) {}
  private async db() {
    const c = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: true },
      connectionTimeoutMillis: 5000,
      query_timeout: 8000,
    });
    await c.connect();
    return c;
  }
  async list(uid: string) {
    await this.admin.kiemTraQuanTri(uid);
    const c = await this.db();
    try {
      return {
        vai_tro: (
          await c.query(
            "SELECT id,ma_vai_tro,mo_ta,he_thong,quyen_trang FROM public.vai_tro WHERE ma_vai_tro NOT IN ('Quản trị hệ thống','Khách hàng') ORDER BY ma_vai_tro",
          )
        ).rows,
        trang: TRANG_NHAN_VIEN,
      };
    } finally {
      await c.end();
    }
  }
  async save(uid: string, id: string | undefined, body: unknown) {
    await this.admin.kiemTraQuanTri(uid);
    const x = body as Record<string, unknown> | null;
    if (
      !x ||
      typeof x.ten !== 'string' ||
      x.ten.trim().length < 2 ||
      x.ten.trim().length > 100 ||
      ['Quản trị hệ thống', 'Khách hàng'].includes(x.ten.trim()) ||
      !Array.isArray(x.trang) ||
      x.trang.some((k) => typeof k !== 'string' || !TRANG_NHAN_VIEN.includes(k))
    )
      throw new BadRequestException('Tên hoặc quyền trang không hợp lệ');
    if (id && !/^[0-9a-f-]{36}$/i.test(id))
      throw new BadRequestException('Mã vai trò không hợp lệ');
    const c = await this.db();
    try {
      await c.query('BEGIN');
      const r = id
        ? await c.query(
            "UPDATE public.vai_tro SET ma_vai_tro=CASE WHEN he_thong THEN ma_vai_tro ELSE $2 END,quyen_trang=$3 WHERE id=$1 AND ma_vai_tro NOT IN ('Quản trị hệ thống','Khách hàng') RETURNING id",
            [id, x.ten.trim(), [...new Set(x.trang)]],
          )
        : await c.query(
            'INSERT INTO public.vai_tro(ma_vai_tro,mo_ta,he_thong,quyen_trang) VALUES($1,$2,false,$3) RETURNING id',
            [x.ten.trim(), 'Vai trò do quản trị tạo', [...new Set(x.trang)]],
          );
      if (!r.rowCount) throw new NotFoundException('Không tìm thấy vai trò');
      await c.query(
        "INSERT INTO public.nhat_ky_he_thong(nguoi_thuc_hien_id,hanh_dong,ten_bang,ban_ghi_id,du_lieu_thay_doi) VALUES($1,'Cấp quyền trang cho vai trò','vai_tro',$2,$3::jsonb)",
        [uid, r.rows[0].id, JSON.stringify({ ten: x.ten, trang: x.trang })],
      );
      await c.query('COMMIT');
      return { ok: true };
    } catch (e) {
      await c.query('ROLLBACK');
      if ((e as { code?: string }).code === '23505')
        throw new BadRequestException('Tên vai trò đã tồn tại');
      throw e;
    } finally {
      await c.end();
    }
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Client } from 'pg';
import { QuanTriService } from './quan-tri.service.js';
@Injectable()
export class HienThiLichService {
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
  async read(uid: string) {
    await this.admin.kiemTraTrang(uid, 'lich');
    const c = await this.db();
    try {
      return (
        await c.query(
          'SELECT mau,trang_thai,phien_ban FROM public.cau_hinh_hien_thi_lich WHERE id=1',
        )
      ).rows[0];
    } finally {
      await c.end();
    }
  }
  async save(uid: string, body: unknown) {
    await this.admin.kiemTraTrang(uid, 'lich');
    const x = body as {
      mau?: unknown;
      trang_thai?: unknown;
      phien_ban?: unknown;
    } | null;
    if (
      !x ||
      !x.mau ||
      typeof x.mau !== 'object' ||
      Array.isArray(x.mau) ||
      !Array.isArray(x.trang_thai) ||
      x.trang_thai.length > 50 ||
      x.trang_thai.some(
        (v) => typeof v !== 'string' || !v.trim() || v.length > 80,
      ) ||
      !Number.isSafeInteger(x.phien_ban)
    )
      throw new BadRequestException('Thiết lập hiển thị không hợp lệ');
    const entries = Object.entries(x.mau);
    if (
      entries.length > 100 ||
      entries.some(
        ([k, v]) =>
          !k.trim() ||
          k.length > 80 ||
          typeof v !== 'string' ||
          !/^#[0-9a-f]{6}$/i.test(v),
      )
    )
      throw new BadRequestException('Tên hoặc mã màu không hợp lệ');
    const c = await this.db();
    try {
      const r = await c.query(
        'UPDATE public.cau_hinh_hien_thi_lich SET mau=$1,trang_thai=$2,phien_ban=phien_ban+1,ngay_cap_nhat=now(),nguoi_cap_nhat_id=$3 WHERE id=1 AND phien_ban=$4 RETURNING mau,trang_thai,phien_ban',
        [
          JSON.stringify(Object.fromEntries(entries)),
          [...new Set(x.trang_thai)],
          uid,
          x.phien_ban,
        ],
      );
      if (!r.rowCount)
        throw new ConflictException(
          'Thiết lập vừa được người khác cập nhật. Hãy tải lại trước khi lưu',
        );
      return r.rows[0];
    } finally {
      await c.end();
    }
  }
}

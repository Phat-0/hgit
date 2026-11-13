import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Client } from 'pg';
import { QuanTriService } from './quan-tri.service.js';
export const TRANG_THAI_PHONG_GOC = [
  'Trống',
  'Đang sử dụng',
  'Cần dọn',
  'Đang dọn',
  'Chờ kiểm tra',
  'Bảo trì',
  'Bị khóa',
];
export const TRANG_THAI_TIEN_GOC = ['Chưa thanh toán', 'Cọc', 'Đủ'];
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
    await this.admin.kiemTraTrang(uid, 'lich|phong');
    const c = await this.db();
    try {
      return (
        await c.query(
          'SELECT mau,trang_thai,mau_phong,mau_thanh_toan,trang_thai_phong,trang_thai_thanh_toan,phien_ban FROM public.cau_hinh_hien_thi_lich WHERE id=1',
        )
      ).rows[0];
    } finally {
      await c.end();
    }
  }
  async save(uid: string, body: unknown) {
    await this.admin.kiemTraTrang(uid, 'lich');
    const x = body as Record<string, unknown> | null;
    const colors = (v: unknown) =>
      !!v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      Object.entries(v).length <= 100 &&
      Object.entries(v).every(
        ([k, c]) =>
          k.trim() &&
          k.length <= 80 &&
          typeof c === 'string' &&
          /^#[0-9a-f]{6}$/i.test(c),
      );
    const states = (v: unknown) =>
      Array.isArray(v) &&
      v.length <= 50 &&
      v.every((s) => typeof s === 'string' && s.trim() && s.length <= 80);
    if (!x || !Number.isSafeInteger(x.phien_ban) || !states(x.trang_thai))
      throw new BadRequestException('Thiết lập hiển thị không hợp lệ');
    if (
      !colors(x.mau) ||
      (x.mau_phong !== undefined && !colors(x.mau_phong)) ||
      (x.mau_thanh_toan !== undefined && !colors(x.mau_thanh_toan))
    )
      throw new BadRequestException('Tên hoặc mã màu không hợp lệ');
    if (
      (x.trang_thai_phong !== undefined &&
        (!states(x.trang_thai_phong) ||
          !TRANG_THAI_PHONG_GOC.every((s) =>
            (x.trang_thai_phong as string[]).includes(s),
          ))) ||
      (x.trang_thai_thanh_toan !== undefined &&
        (!states(x.trang_thai_thanh_toan) ||
          !TRANG_THAI_TIEN_GOC.every((s) =>
            (x.trang_thai_thanh_toan as string[]).includes(s),
          )))
    )
      throw new BadRequestException(
        'Giữ các trạng thái gốc; chỉ xóa trạng thái tự thêm',
      );
    const c = await this.db();
    try {
      const r = await c.query(
        `UPDATE public.cau_hinh_hien_thi_lich SET mau=$1,trang_thai=$2,mau_phong=COALESCE($5::jsonb,$1::jsonb),mau_thanh_toan=COALESCE($6::jsonb,mau_thanh_toan),trang_thai_phong=COALESCE($7::text[],trang_thai_phong),trang_thai_thanh_toan=COALESCE($8::text[],trang_thai_thanh_toan),phien_ban=phien_ban+1,ngay_cap_nhat=now(),nguoi_cap_nhat_id=$3 WHERE id=1 AND phien_ban=$4 RETURNING mau,trang_thai,mau_phong,mau_thanh_toan,trang_thai_phong,trang_thai_thanh_toan,phien_ban`,
        [
          JSON.stringify(x.mau),
          [...new Set(x.trang_thai as string[])],
          uid,
          x.phien_ban,
          x.mau_phong ? JSON.stringify(x.mau_phong) : null,
          x.mau_thanh_toan ? JSON.stringify(x.mau_thanh_toan) : null,
          x.trang_thai_phong || null,
          x.trang_thai_thanh_toan || null,
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

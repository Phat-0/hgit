import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { QuanTriService } from './quan-tri.service.js';
export type KhoiTrangChu = {
  hien: boolean;
  tieu_de: string;
  noi_dung: string;
  anh: string;
};
export type CauHinhTrangChu = {
  hero: KhoiTrangChu;
  gioi_thieu: KhoiTrangChu;
  the: KhoiTrangChu[];
  hien_phong: boolean;
  chan_trang: KhoiTrangChu;
};
export const MAC_DINH_TRANG_CHU: CauHinhTrangChu = {
  hero: {
    hien: true,
    tieu_de: 'Đổi không gian. Chạm cảm hứng.',
    noi_dung:
      'Một buổi hẹn, một đêm nghỉ, một chuyến đi. Chọn thời gian của bạn, tìm căn phòng vừa ý.',
    anh: '',
  },
  gioi_thieu: {
    hien: false,
    tieu_de: 'Một khoảng riêng dành cho bạn',
    noi_dung: '',
    anh: '',
  },
  the: [],
  hien_phong: true,
  chan_trang: {
    hien: true,
    tieu_de: 'HomeStay',
    noi_dung: 'Đặt phòng theo giờ, theo ngày hoặc qua đêm.',
    anh: '',
  },
};
@Injectable()
export class TrangChuService {
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
  private validate(raw: unknown): CauHinhTrangChu {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
      throw new BadRequestException('Cấu hình không hợp lệ');
    const x = raw as Record<string, unknown>;
    if (
      Object.keys(x).some(
        (k) =>
          !['hero', 'gioi_thieu', 'the', 'hien_phong', 'chan_trang'].includes(
            k,
          ),
      ) ||
      typeof x.hien_phong !== 'boolean' ||
      !Array.isArray(x.the) ||
      x.the.length > 8
    )
      throw new BadRequestException(
        'Cấu hình hoặc số thẻ không hợp lệ (tối đa 8)',
      );
    const block = (v: unknown): KhoiTrangChu => {
      if (!v || typeof v !== 'object' || Array.isArray(v))
        throw new BadRequestException('Khối nội dung không hợp lệ');
      const b = v as Record<string, unknown>;
      if (
        Object.keys(b).some(
          (k) => !['hien', 'tieu_de', 'noi_dung', 'anh'].includes(k),
        ) ||
        typeof b.hien !== 'boolean' ||
        typeof b.tieu_de !== 'string' ||
        b.tieu_de.trim().length > 180 ||
        typeof b.noi_dung !== 'string' ||
        b.noi_dung.length > 4000 ||
        typeof b.anh !== 'string'
      )
        throw new BadRequestException(
          'Tiêu đề tối đa 180 ký tự, nội dung tối đa 4.000 ký tự',
        );
      if (b.hien && !b.tieu_de.trim())
        throw new BadRequestException('Khối đang hiển thị cần tiêu đề');
      const prefix =
        (process.env.SUPABASE_URL || '').replace(/\/$/, '') +
        '/storage/v1/object/public/anh-trang-chu/';
      if (
        b.anh &&
        (!b.anh.startsWith(prefix) ||
          !b.anh.startsWith('https://') ||
          !/^\w[\w/-]*\.(jpg|png|webp)$/.test(b.anh.slice(prefix.length)))
      )
        throw new BadRequestException(
          'Chỉ dùng ảnh tải lên thư viện Trang chủ',
        );
      return {
        hien: b.hien,
        tieu_de: b.tieu_de.trim(),
        noi_dung: b.noi_dung.trim(),
        anh: b.anh,
      };
    };
    return {
      hero: block(x.hero),
      gioi_thieu: block(x.gioi_thieu),
      the: x.the.map(block),
      hien_phong: x.hien_phong,
      chan_trang: block(x.chan_trang),
    };
  }
  async read(uid?: string) {
    if (uid) await this.admin.kiemTraQuanTri(uid);
    const c = await this.db();
    try {
      const r = await c.query(
        'SELECT ban_nhap,da_xuat_ban,phien_ban,xuat_ban_luc FROM public.cau_hinh_trang_chu WHERE id=1',
      );
      const row = r.rows[0];
      if (!row)
        throw new ServiceUnavailableException(
          'Chưa đồng bộ cấu hình Trang chủ',
        );
      if (uid) return row;
      const data = row.da_xuat_ban as CauHinhTrangChu;
      return {
        ...data,
        hero: data.hero.hien ? data.hero : null,
        gioi_thieu: data.gioi_thieu.hien ? data.gioi_thieu : null,
        the: data.the.filter((b) => b.hien),
        chan_trang: data.chan_trang.hien ? data.chan_trang : null,
      };
    } finally {
      await c.end();
    }
  }
  async save(uid: string, body: unknown) {
    await this.admin.kiemTraQuanTri(uid);
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new BadRequestException('Dữ liệu không hợp lệ');
    const b = body as Record<string, unknown>;
    if (
      Object.keys(b).some(
        (k) => !['cau_hinh', 'phien_ban', 'xuat_ban'].includes(k),
      ) ||
      !Number.isInteger(b.phien_ban) ||
      typeof b.xuat_ban !== 'boolean'
    )
      throw new BadRequestException('Thiếu phiên bản cấu hình');
    const data = this.validate(b.cau_hinh);
    const c = await this.db();
    try {
      await c.query('BEGIN');
      const r = await c.query(
        `UPDATE public.cau_hinh_trang_chu SET ban_nhap=$1::jsonb,da_xuat_ban=CASE WHEN $2 THEN $1::jsonb ELSE da_xuat_ban END,xuat_ban_luc=CASE WHEN $2 THEN now() ELSE xuat_ban_luc END,phien_ban=phien_ban+1,nguoi_sua_id=$3,ngay_cap_nhat=now() WHERE id=1 AND phien_ban=$4 RETURNING *`,
        [JSON.stringify(data), b.xuat_ban, uid, b.phien_ban],
      );
      if (!r.rowCount)
        throw new ConflictException(
          'Cấu hình đã đổi ở phiên khác. Tải lại trước khi lưu',
        );
      await c.query(
        "INSERT INTO public.nhat_ky_he_thong(nguoi_thuc_hien_id,hanh_dong,ten_bang,du_lieu_thay_doi) VALUES($1,$2,'cau_hinh_trang_chu',$3::jsonb)",
        [
          uid,
          b.xuat_ban ? 'Xuất bản Trang chủ' : 'Lưu nháp Trang chủ',
          JSON.stringify({ phien_ban: r.rows[0].phien_ban }),
        ],
      );
      await c.query('COMMIT');
      return r.rows[0];
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      await c.end();
    }
  }
  async upload(
    uid: string,
    file?: { buffer: Buffer; size: number; mimetype: string },
  ) {
    await this.admin.kiemTraQuanTri(uid);
    if (!file || file.size > 5242880 || !file.size)
      throw new BadRequestException('Chọn ảnh tối đa 5 MB');
    const b = file.buffer;
    const ext =
      file.mimetype === 'image/jpeg' &&
      b[0] === 255 &&
      b[1] === 216 &&
      b[2] === 255
        ? 'jpg'
        : file.mimetype === 'image/png' &&
            b
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          ? 'png'
          : file.mimetype === 'image/webp' &&
              b.subarray(0, 4).toString() === 'RIFF' &&
              b.subarray(8, 12).toString() === 'WEBP'
            ? 'webp'
            : null;
    if (!ext)
      throw new BadRequestException(
        'Chỉ nhận ảnh JPEG, PNG hoặc WebP đúng định dạng',
      );
    const url = process.env.SUPABASE_URL,
      key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key)
      throw new ServiceUnavailableException(
        'Chưa cấu hình Storage tại máy chủ',
      );
    const storage = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    }).storage.from('anh-trang-chu');
    const path = randomUUID() + '.' + ext;
    const r = await storage.upload(path, b, {
      contentType: file.mimetype,
      upsert: false,
    });
    if (r.error)
      throw new ServiceUnavailableException('Không tải được ảnh Trang chủ');
    return { url: storage.getPublicUrl(path).data.publicUrl };
  }
}

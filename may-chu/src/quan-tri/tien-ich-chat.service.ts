import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Client } from 'pg';
import { QuanTriService } from './quan-tri.service.js';
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
@Injectable()
export class TienIchChatService {
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
  private id(id: string) {
    if (!UUID.test(id)) throw new BadRequestException('Mã không hợp lệ');
  }
  async templates(uid: string) {
    await this.admin.kiemTraQuanTri(uid);
    const c = await this.db();
    try {
      return {
        mau: (
          await c.query(
            'SELECT m.*,h.ten_homestay FROM public.cau_tra_loi_mau m LEFT JOIN public.homestay h ON h.id=m.homestay_id ORDER BY nhom,tieu_de,id',
          )
        ).rows,
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
  async saveTemplate(uid: string, id: string | undefined, body: unknown) {
    await this.admin.kiemTraQuanTri(uid);
    if (id) this.id(id);
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new BadRequestException('Dữ liệu không hợp lệ');
    const b = body as Record<string, unknown>;
    if (
      Object.keys(b).some(
        (k) =>
          !['tieu_de', 'nhom', 'noi_dung', 'homestay_id', 'hien'].includes(k),
      )
    )
      throw new BadRequestException('Trường không được phép');
    for (const [k, max] of [
      ['tieu_de', 120],
      ['nhom', 80],
      ['noi_dung', 4000],
    ] as const)
      if (typeof b[k] !== 'string' || !b[k].trim() || b[k].length > max)
        throw new BadRequestException(
          'Tiêu đề, nhóm hoặc nội dung không hợp lệ',
        );
    if (typeof b.hien !== 'boolean')
      throw new BadRequestException('Trạng thái không hợp lệ');
    const branch = b.homestay_id ? String(b.homestay_id) : null;
    if (branch) this.id(branch);
    const c = await this.db();
    try {
      await c.query('BEGIN');
      if (
        branch &&
        !(await c.query('SELECT 1 FROM public.homestay WHERE id=$1', [branch]))
          .rowCount
      )
        throw new BadRequestException('Chi nhánh không tồn tại');
      const p = [
        String(b.tieu_de).trim(),
        String(b.nhom).trim(),
        String(b.noi_dung).trim(),
        branch,
        b.hien,
      ];
      const r = id
        ? await c.query(
            'UPDATE public.cau_tra_loi_mau SET tieu_de=$1,nhom=$2,noi_dung=$3,homestay_id=$4,hien=$5,ngay_cap_nhat=now() WHERE id=$6 RETURNING *',
            [...p, id],
          )
        : await c.query(
            'INSERT INTO public.cau_tra_loi_mau(tieu_de,nhom,noi_dung,homestay_id,hien) VALUES($1,$2,$3,$4,$5) RETURNING *',
            p,
          );
      if (!r.rowCount)
        throw new NotFoundException('Không tìm thấy câu trả lời');
      await c.query(
        "INSERT INTO public.nhat_ky_he_thong(nguoi_thuc_hien_id,hanh_dong,ten_bang,ban_ghi_id) VALUES($1,$2,'cau_tra_loi_mau',$3)",
        [uid, id ? 'Sửa câu trả lời mẫu' : 'Tạo câu trả lời mẫu', r.rows[0].id],
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
  async deleteTemplate(uid: string, id: string) {
    await this.admin.kiemTraQuanTri(uid);
    this.id(id);
    const c = await this.db();
    try {
      await c.query('BEGIN');
      const r = await c.query(
        'DELETE FROM public.cau_tra_loi_mau WHERE id=$1 RETURNING id',
        [id],
      );
      if (!r.rowCount)
        throw new NotFoundException('Không tìm thấy câu trả lời');
      await c.query(
        "INSERT INTO public.nhat_ky_he_thong(nguoi_thuc_hien_id,hanh_dong,ten_bang,ban_ghi_id) VALUES($1,'Xóa câu trả lời mẫu','cau_tra_loi_mau',$2)",
        [uid, id],
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
  async notifications(uid: string, filter = '', offset = 0) {
    await this.admin.kiemTraQuanTri(uid);
    if (
      !['', 'Đơn mới', 'Đơn hủy'].includes(filter) ||
      !Number.isInteger(offset) ||
      offset < 0 ||
      offset > 1000000
    )
      throw new BadRequestException('Bộ lọc không hợp lệ');
    const c = await this.db();
    try {
      const base = "nguoi_dung_id=$1 AND loai IN ('Đơn mới','Đơn hủy')";
      const list = await c.query(
        'SELECT * FROM public.thong_bao WHERE ' +
          base +
          " AND ($2='' OR loai=$2) ORDER BY ngay_tao DESC,id DESC LIMIT 40 OFFSET $3",
        [uid, filter, offset],
      );
      const count = await c.query(
        "SELECT count(*) FILTER(WHERE da_doc_luc IS NULL)::int AS chua_doc,count(*) FILTER(WHERE $2='' OR loai=$2)::int AS tong_so FROM public.thong_bao WHERE " +
          base,
        [uid, filter],
      );
      return { thong_bao: list.rows, ...count.rows[0] };
    } finally {
      await c.end();
    }
  }
  async readNotification(uid: string, id?: string) {
    await this.admin.kiemTraQuanTri(uid);
    if (id) this.id(id);
    const c = await this.db();
    try {
      const r = await c.query(
        "UPDATE public.thong_bao SET da_doc_luc=coalesce(da_doc_luc,now()) WHERE nguoi_dung_id=$1 AND loai IN ('Đơn mới','Đơn hủy') AND ($2::uuid IS NULL OR id=$2) RETURNING id",
        [uid, id || null],
      );
      if (id && !r.rowCount)
        throw new NotFoundException('Không tìm thấy thông báo');
      return { ok: true };
    } finally {
      await c.end();
    }
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { QuanTriService } from './quan-tri.service.js';
import { docCombo, UUID_COMBO } from './combo.input.js';
type ImageFile = {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname: string;
};
@Injectable()
export class ComboService {
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
  private id(id: string) {
    if (!UUID_COMBO.test(id))
      throw new BadRequestException('ID combo không hợp lệ');
  }
  private storage() {
    const url = process.env.SUPABASE_URL,
      key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key)
      throw new BadRequestException(
        'Chưa cấu hình Supabase Storage tại backend',
      );
    return createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    }).storage.from('anh-combo');
  }
  private failure(e: unknown): never {
    const code = (e as { code?: string }).code;
    if (['42P01', '42703'].includes(code || ''))
      throw new ServiceUnavailableException(
        'Chưa đồng bộ Combo. Chạy npm.cmd run db:dong-bo-combo và npm.cmd run db:anh-combo trong may-chu.',
      );
    if (code === '23503' || code === '23001')
      throw new ConflictException(
        'Combo đang được sử dụng trong đơn hoặc dịch vụ. Có thể chỉnh trạng thái thành Tạm ngưng.',
      );
    if (code === '23514')
      throw new BadRequestException('Dữ liệu combo không thỏa điều kiện');
    throw e;
  }
  async list(uid: string) {
    await this.admin.kiemTraTrang(uid,'goi-combo');
    const c = await this.db();
    try {
      const combos = await c.query(
        `SELECT co.*,ARRAY(SELECT homestay_id FROM public.combo_chi_nhanh WHERE combo_id=co.id ORDER BY homestay_id) AS chi_nhanh_ids,ARRAY(SELECT phong_id FROM public.combo_phong WHERE combo_id=co.id ORDER BY phong_id) AS phong_ids FROM public.combo co ORDER BY co.ten_combo,co.id`,
      );
      const branches = await c.query(
        'SELECT id,ten_homestay FROM public.homestay ORDER BY ten_homestay',
      );
      const rooms = await c.query(
        'SELECT p.id,p.homestay_id,p.ma_phong,p.ten_phong,p.loai_phong_id,l.ten_loai FROM public.phong p JOIN public.loai_phong l ON l.id=p.loai_phong_id ORDER BY p.homestay_id,p.ma_phong',
      );
      const rows = await Promise.all(
        combos.rows.map(async (row) => {
          const keys: string[] = row.anh_combo?.length
            ? row.anh_combo
            : row.anh_dai_dien
              ? [row.anh_dai_dien]
              : [];
          const images = await Promise.all(
            keys.map(async (key) => {
              const { data, error } = await this.storage().createSignedUrl(
                key,
                3600,
              );
              return { key, url: error ? null : data.signedUrl };
            }),
          );
          return { ...row, anh: images, anh_dai_dien: images[0]?.url ?? null };
        }),
      );
      return { combos: rows, chi_nhanh: branches.rows, phong: rooms.rows };
    } catch (e) {
      this.failure(e);
    } finally {
      await c.end();
    }
  }
  private image(file: ImageFile) {
    if (
      !file ||
      !Buffer.isBuffer(file.buffer) ||
      file.buffer.length !== file.size ||
      file.size < 1 ||
      file.size > 5242880
    )
      throw new BadRequestException('Chọn ảnh JPG, PNG hoặc WebP, tối đa 5 MB');
    const b = file.buffer;
    const types: Record<string, [string, boolean]> = {
      'image/jpeg': [
        'jpg',
        b.length > 3 && b[0] === 255 && b[1] === 216 && b[2] === 255,
      ],
      'image/png': [
        'png',
        b.length > 8 &&
          b
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
      ],
      'image/webp': [
        'webp',
        b.length > 12 &&
          b.toString('ascii', 0, 4) === 'RIFF' &&
          b.toString('ascii', 8, 12) === 'WEBP',
      ],
    };
    const entry = types[file.mimetype];
    if (!entry?.[1])
      throw new BadRequestException('Nội dung tệp không đúng định dạng ảnh');
    return entry[0];
  }
  async save(
    uid: string,
    id: string | null,
    body: unknown,
    files?: ImageFile | ImageFile[],
  ) {
    await this.admin.kiemTraTrang(uid,'goi-combo');
    if (id) this.id(id);
    const x = docCombo(body);
    const incoming = files ? (Array.isArray(files) ? files : [files]) : [];
    if (incoming.length > 8)
      throw new BadRequestException('Mỗi combo tối đa 8 ảnh');
    if (!id && !incoming.length)
      throw new BadRequestException('Vui lòng chọn ảnh combo');
    const extensions = incoming.map((file) => this.image(file)),
      c = await this.db();
    const uploaded: string[] = [];
    let oldImages: string[] = [],
      removed: string[] = [],
      committed = false;
    try {
      await c.query('BEGIN');
      const comboId = id || randomUUID();
      if (id) {
        const old = await c.query(
          'SELECT anh_dai_dien,anh_combo FROM public.combo WHERE id=$1 FOR UPDATE',
          [id],
        );
        if (!old.rowCount) throw new NotFoundException('Không tìm thấy combo');
        oldImages = old.rows[0].anh_combo?.length
          ? old.rows[0].anh_combo
          : old.rows[0].anh_dai_dien
            ? [old.rows[0].anh_dai_dien]
            : [];
      }
      if (x.branches.length) {
        const r = await c.query(
          'SELECT id FROM public.homestay WHERE id=ANY($1::uuid[]) FOR KEY SHARE',
          [x.branches],
        );
        if (r.rowCount !== x.branches.length)
          throw new BadRequestException('Chi nhánh không tồn tại');
      }
      if (x.rooms.length) {
        const r = await c.query(
          'SELECT id FROM public.phong WHERE id=ANY($1::uuid[]) FOR KEY SHARE',
          [x.rooms],
        );
        if (r.rowCount !== x.rooms.length)
          throw new BadRequestException('Phòng không tồn tại');
      }
      // Combo gắn sẵn dịch vụ của một chi nhánh không tự mở rộng sang chi nhánh khác.
      if (id) {
        const linked = await c.query(
          'SELECT dv.homestay_id FROM public.combo_dich_vu cd JOIN public.dich_vu dv ON dv.id=cd.dich_vu_id WHERE cd.combo_id=$1',
          [id],
        );
        if (linked.rowCount) {
          const eligible =
            x.scope === 'chi_nhanh'
              ? x.branches
              : x.scope === 'phong'
                ? (
                    await c.query(
                      'SELECT DISTINCT homestay_id FROM public.phong WHERE id=ANY($1::uuid[])',
                      [x.rooms],
                    )
                  ).rows.map((r) => r.homestay_id)
                : [];
          if (
            !eligible.length ||
            linked.rows.some((r) => eligible.some((b) => b !== r.homestay_id))
          )
            throw new ConflictException(
              'Combo đang gắn dịch vụ riêng của chi nhánh; không thể mở rộng phạm vi sang chi nhánh khác',
            );
        }
      }
      const kept = [...new Set(x.keepImages ?? oldImages)];
      if (kept.some((key) => !oldImages.includes(key)))
        throw new BadRequestException('Ảnh giữ lại không thuộc combo này');
      if (kept.length + incoming.length > 8)
        throw new BadRequestException('Mỗi combo tối đa 8 ảnh');
      if (!kept.length && !incoming.length)
        throw new BadRequestException('Combo cần ít nhất một ảnh');
      for (let i = 0; i < incoming.length; i++) {
        const file = incoming[i],
          key = comboId + '/' + randomUUID() + '.' + extensions[i];
        const { error } = await this.storage().upload(key, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });
        if (error)
          throw new BadRequestException(
            'Không lưu được tệp ảnh: ' + error.message,
          );
        uploaded.push(key);
      }
      const images = [...kept, ...uploaded];
      removed = oldImages.filter((key) => !kept.includes(key));
      const args = [
        comboId,
        x.branches.length === 1 ? x.branches[0] : null,
        x.name,
        x.description,
        x.price,
        x.hours,
        x.state,
        x.start,
        x.end,
        x.scope,
        images[0],
        images,
      ];
      await c.query(
        `INSERT INTO public.combo(id,homestay_id,ten_combo,mo_ta,gia_combo,so_gio_bao_gom,trang_thai,bat_dau,ket_thuc,pham_vi,anh_dai_dien,anh_combo) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::text[]) ON CONFLICT(id) DO UPDATE SET homestay_id=$2,ten_combo=$3,mo_ta=$4,gia_combo=$5,so_gio_bao_gom=$6,trang_thai=$7,bat_dau=$8,ket_thuc=$9,pham_vi=$10,anh_dai_dien=$11,anh_combo=$12::text[]`,
        args,
      );
      await c.query('DELETE FROM public.combo_chi_nhanh WHERE combo_id=$1', [
        comboId,
      ]);
      await c.query('DELETE FROM public.combo_phong WHERE combo_id=$1', [
        comboId,
      ]);
      if (x.branches.length)
        await c.query(
          'INSERT INTO public.combo_chi_nhanh SELECT $1,unnest($2::uuid[])',
          [comboId, x.branches],
        );
      if (x.rooms.length)
        await c.query(
          'INSERT INTO public.combo_phong SELECT $1,unnest($2::uuid[])',
          [comboId, x.rooms],
        );
      await c.query('COMMIT');
      committed = true;
      // Dọn ảnh cũ sau commit; lỗi dọn không làm client hiểu nhầm rằng lưu thất bại.
      if (removed.length)
        await this.storage()
          .remove(removed)
          .catch(() => {});
      return { id: comboId };
    } catch (e) {
      if (!committed) await c.query('ROLLBACK').catch(() => {});
      if (uploaded.length && !committed)
        await this.storage()
          .remove(uploaded)
          .catch(() => {});
      this.failure(e);
    } finally {
      await c.end();
    }
  }
  async remove(uid: string, id: string) {
    await this.admin.kiemTraTrang(uid,'goi-combo');
    this.id(id);
    const c = await this.db();
    try {
      const r = await c.query(
        'DELETE FROM public.combo WHERE id=$1 RETURNING anh_dai_dien,anh_combo',
        [id],
      );
      if (!r.rowCount) throw new NotFoundException('Không tìm thấy combo');
      if (r.rows[0].anh_dai_dien) {
        try {
          await this.storage().remove(
            r.rows[0].anh_combo?.length
              ? r.rows[0].anh_combo
              : [r.rows[0].anh_dai_dien],
          );
        } catch {
          /* Dữ liệu đã xóa; không báo thất bại vì lỗi dọn Storage. */
        }
      }
      return { id };
    } catch (e) {
      this.failure(e);
    } finally {
      await c.end();
    }
  }
}

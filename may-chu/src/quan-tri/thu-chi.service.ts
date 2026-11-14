import { docDoiTuong } from './doi-tuong-bieu-do.js';
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
import { dongThuChi, ngayThuChi, UUID_THU_CHI } from './thu-chi.input.js';
import { docTepChat, type ChatFile } from '../khach-hang/chat-tep.js';
@Injectable()
export class ThuChiService {
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
    if (!UUID_THU_CHI.test(id))
      throw new BadRequestException('Mã dòng hoặc chứng từ không hợp lệ');
  }
  private async allow(uid: string) {
    await this.admin.kiemTraTrang(uid, 'bao-cao');
  }
  private storage() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
      throw new ServiceUnavailableException('Chưa cấu hình kho chứng từ');
    return createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    ).storage.from('chung-tu-thu-chi');
  }
  private async audit(
    c: Client,
    uid: string,
    id: string | null,
    action: string,
    old: unknown,
    next: unknown,
  ) {
    await c.query(
      'INSERT INTO public.nhat_ky_thu_chi(thu_chi_id,nguoi_thuc_hien_id,hanh_dong,du_lieu_cu,du_lieu_moi) VALUES($1,$2,$3,$4::jsonb,$5::jsonb)',
      [id, uid, action, JSON.stringify(old), JSON.stringify(next)],
    );
  }
  async list(uid: string, start: string, end: string) {
    await this.allow(uid);
    ngayThuChi(start);
    ngayThuChi(end);
    if (start > end || Date.parse(end) - Date.parse(start) > 366 * 86400000)
      throw new BadRequestException('Khoảng ngày tối đa 367 ngày');
    const c = await this.db();
    try {
      await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const rows = await c.query(
        "SELECT t.*,t.ngay::text AS ngay,h.ten_homestay,p.ten_phong,(SELECT count(*)::int FROM public.chung_tu_thu_chi f WHERE f.thu_chi_id=t.id) AS so_chung_tu,(SELECT coalesce(jsonb_agg(jsonb_build_object('id',f.id,'ten_tep',f.ten_tep) ORDER BY f.ngay_tao,f.id),'[]'::jsonb) FROM public.chung_tu_thu_chi f WHERE f.thu_chi_id=t.id) AS chung_tu FROM public.so_thu_chi t LEFT JOIN public.homestay h ON h.id=t.homestay_id LEFT JOIN public.phong p ON p.id=t.phong_id WHERE t.ngay BETWEEN $1::date AND $2::date ORDER BY t.ngay,t.ngay_tao,t.id LIMIT 5001",
        [start, end],
      );
      if (rows.rowCount! > 5000)
        throw new BadRequestException(
          'Khoảng này có hơn 5.000 dòng; hãy thu hẹp ngày để xem đủ dữ liệu',
        );
      const month = start.slice(0, 7) + '-01';
      const opening = await c.query(
        'SELECT *,thang::text AS thang FROM public.tien_ton_thang WHERE thang=$1',
        [month],
      );
      const sums = await c.query(
        "SELECT coalesce(sum(so_tien) FILTER(WHERE loai='Thu'),0) AS thu,coalesce(sum(so_tien) FILTER(WHERE loai='Chi'),0) AS chi FROM public.so_thu_chi WHERE ngay >= $1::date AND ngay < $1::date+interval '1 month'",
        [month],
      );
      const before = await c.query(
        'SELECT coalesce(sum(so_tien),0) AS tong FROM public.so_thu_chi WHERE ngay >= $1::date AND ngay < $2::date',
        [month, start],
      );
      const branches = await c.query(
        'SELECT id,ten_homestay FROM public.homestay ORDER BY ten_homestay',
      );
      const rooms = await c.query(
        'SELECT id,homestay_id,ten_phong FROM public.phong ORDER BY ten_phong',
      );
      await c.query('COMMIT');
      return {
        dong: rows.rows,
        tien_ton: opening.rows[0] || {
          thang: month,
          so_tien: '0',
          phien_ban: 0,
        },
        tong_thang: sums.rows[0],
        truoc_ky: before.rows[0].tong,
        chi_nhanh: branches.rows,
        phong: rooms.rows,
      };
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      await c.end();
    }
  }
  async save(uid: string, id: string | undefined, body: unknown) {
    await this.allow(uid);
    if (id) this.id(id);
    const x = dongThuChi(body),
      version = Number((body as Record<string, unknown>).phien_ban);
    const c = await this.db();
    try {
      await c.query('BEGIN');
      if (x.phong_id) {
        const r = await c.query(
          'SELECT homestay_id FROM public.phong WHERE id=$1 FOR SHARE',
          [x.phong_id],
        );
        if (
          !r.rowCount ||
          (x.homestay_id && r.rows[0].homestay_id !== x.homestay_id)
        )
          throw new BadRequestException('Phòng không thuộc chi nhánh đã chọn');
        x.homestay_id = r.rows[0].homestay_id;
      }
      if (
        x.homestay_id &&
        !(
          await c.query(
            'SELECT id FROM public.homestay WHERE id=$1 FOR SHARE',
            [x.homestay_id],
          )
        ).rowCount
      )
        throw new BadRequestException('Chi nhánh không tồn tại');
      let old = null;
      if (id) {
        const r = await c.query(
          'SELECT * FROM public.so_thu_chi WHERE id=$1 FOR UPDATE',
          [id],
        );
        if (!r.rowCount) throw new NotFoundException('Không tìm thấy dòng');
        old = r.rows[0];
        if (!Number.isInteger(version) || old.phien_ban !== version)
          throw new ConflictException(
            'Dòng đã được sửa ở nơi khác. Hãy tải lại trước khi lưu',
          );
      }
      const args = [
        x.ngay,
        x.ten,
        x.so_tien,
        x.loai,
        x.homestay_id,
        x.phong_id,
        x.ghi_chu,
        x.mau,
      ];
      const r = id
        ? await c.query(
            'UPDATE public.so_thu_chi SET ngay=$1,ten=$2,so_tien=$3,loai=$4,homestay_id=$5,phong_id=$6,ghi_chu=$7,mau=$8,phien_ban=phien_ban+1,ngay_cap_nhat=now() WHERE id=$9 RETURNING *,ngay::text AS ngay',
            [...args, id],
          )
        : await c.query(
            'INSERT INTO public.so_thu_chi(ngay,ten,so_tien,loai,homestay_id,phong_id,ghi_chu,mau,nguoi_tao_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *,ngay::text AS ngay',
            [...args, uid],
          );
      await this.audit(
        c,
        uid,
        r.rows[0].id,
        id ? 'sua' : 'tao',
        old,
        r.rows[0],
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
  async remove(uid: string, id: string, version: number) {
    await this.allow(uid);
    this.id(id);
    const c = await this.db();
    try {
      await c.query('BEGIN');
      const r = await c.query(
        'SELECT * FROM public.so_thu_chi WHERE id=$1 FOR UPDATE',
        [id],
      );
      if (!r.rowCount) throw new NotFoundException('Không tìm thấy dòng');
      if (r.rows[0].phien_ban !== version)
        throw new ConflictException('Dòng đã thay đổi, hãy tải lại');
      if (
        (
          await c.query(
            'SELECT id FROM public.chung_tu_thu_chi WHERE thu_chi_id=$1 LIMIT 1',
            [id],
          )
        ).rowCount
      )
        throw new ConflictException(
          'Hãy xóa chứng từ của dòng trước khi xóa dòng',
        );
      await this.audit(c, uid, id, 'xoa', r.rows[0], null);
      await c.query('DELETE FROM public.so_thu_chi WHERE id=$1', [id]);
      await c.query('COMMIT');
      return { ok: true };
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      await c.end();
    }
  }
  async opening(uid: string, body: Record<string, unknown>) {
    await this.allow(uid);
    if (!body || !/^\d{4}-(0[1-9]|1[0-2])$/.test(String(body.thang)))
      throw new BadRequestException('Tháng không hợp lệ');
    const month = String(body.thang) + '-01',
      amount = Number(body.so_tien),
      v = Number(body.phien_ban);
    if (
      !Number.isSafeInteger(amount) ||
      Math.abs(amount) > 1e15 ||
      !Number.isInteger(v) ||
      v < 0
    )
      throw new BadRequestException('Tiền tồn hoặc phiên bản không hợp lệ');
    const c = await this.db();
    try {
      await c.query('BEGIN');
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
        'tien-ton:' + month,
      ]);
      const old = await c.query(
        'SELECT *,thang::text AS thang FROM public.tien_ton_thang WHERE thang=$1 FOR UPDATE',
        [month],
      );
      if ((old.rows[0]?.phien_ban || 0) !== v)
        throw new ConflictException(
          'Tiền tồn đã được sửa ở nơi khác; hãy tải lại',
        );
      const r = await c.query(
        'INSERT INTO public.tien_ton_thang(thang,so_tien,nguoi_sua_id) VALUES($1,$2,$3) ON CONFLICT(thang) DO UPDATE SET so_tien=$2,nguoi_sua_id=$3,phien_ban=tien_ton_thang.phien_ban+1,ngay_cap_nhat=now() RETURNING *',
        [month, amount, uid],
      );
      await this.audit(
        c,
        uid,
        null,
        'tien_ton',
        old.rows[0] || null,
        r.rows[0],
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
  async files(uid: string, id: string) {
    await this.allow(uid);
    this.id(id);
    const c = await this.db();
    try {
      const rows = await c.query(
        'SELECT id,duong_dan,ten_tep,mime FROM public.chung_tu_thu_chi WHERE thu_chi_id=$1 ORDER BY ngay_tao,id',
        [id],
      );
      return await Promise.all(
        rows.rows.map(async (f) => {
          const r = await this.storage().createSignedUrl(f.duong_dan, 300, {
            download: f.ten_tep,
          });
          if (r.error)
            throw new ServiceUnavailableException('Không mở được chứng từ');
          return {
            id: f.id,
            ten_tep: f.ten_tep,
            mime: f.mime,
            url: r.data?.signedUrl,
          };
        }),
      );
    } finally {
      await c.end();
    }
  }
  async upload(uid: string, id: string, file: ChatFile) {
    await this.allow(uid);
    this.id(id);
    const f = docTepChat(file),
      c = await this.db();
    let uploaded = '',
      commitAttempted = false;
    try {
      await c.query('BEGIN');
      if (
        !(
          await c.query(
            'SELECT id FROM public.so_thu_chi WHERE id=$1 FOR UPDATE',
            [id],
          )
        ).rowCount
      )
        throw new NotFoundException('Không tìm thấy dòng');
      if (
        Number(
          (
            await c.query(
              'SELECT count(*) AS n FROM public.chung_tu_thu_chi WHERE thu_chi_id=$1',
              [id],
            )
          ).rows[0].n,
        ) >= 10
      )
        throw new BadRequestException('Tối đa 10 chứng từ mỗi dòng');
      const path = id + '/' + randomUUID() + '.' + f.ext;
      const r = await this.storage().upload(path, file.buffer, {
        contentType: f.mime,
        upsert: false,
      });
      if (r.error)
        throw new ServiceUnavailableException('Không tải được chứng từ');
      uploaded = path;
      const saved = await c.query(
        'INSERT INTO public.chung_tu_thu_chi(thu_chi_id,duong_dan,ten_tep,mime,dung_luong) VALUES($1,$2,$3,$4,$5) RETURNING id',
        [id, path, f.name, f.mime, file.size],
      );
      await this.audit(c, uid, id, 'them_chung_tu', null, {
        id: saved.rows[0].id,
        ten_tep: f.name,
      });
      commitAttempted = true;
      await c.query('COMMIT');
      return saved.rows[0];
    } catch (e) {
      await c.query('ROLLBACK');
      if (uploaded && !commitAttempted)
        await this.storage()
          .remove([uploaded])
          .catch(() => {});
      throw e;
    } finally {
      await c.end();
    }
  }
  async removeFile(uid: string, id: string, file: string) {
    await this.allow(uid);
    this.id(id);
    this.id(file);
    const c = await this.db();
    try {
      await c.query('BEGIN');
      await c.query('SELECT id FROM public.so_thu_chi WHERE id=$1 FOR UPDATE', [
        id,
      ]);
      const r = await c.query(
        'SELECT * FROM public.chung_tu_thu_chi WHERE id=$1 AND thu_chi_id=$2 FOR UPDATE',
        [file, id],
      );
      if (!r.rowCount)
        throw new NotFoundException('Chứng từ không thuộc dòng này');
      const removed = await this.storage().remove([r.rows[0].duong_dan]);
      if (removed.error)
        throw new ServiceUnavailableException('Không xóa được tệp');
      await c.query('DELETE FROM public.chung_tu_thu_chi WHERE id=$1', [file]);
      await this.audit(c, uid, id, 'xoa_chung_tu', r.rows[0], null);
      await c.query('COMMIT');
      return { ok: true };
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      await c.end();
    }
  }
  async chartSettings(uid: string) {
    await this.allow(uid);
    const c = await this.db();
    try {
      return (
        (
          await c.query(
            'SELECT doi_tuong,phien_ban FROM public.cau_hinh_bieu_do_thu_chi WHERE nguoi_dung_id=$1',
            [uid],
          )
        ).rows[0] || { doi_tuong: [], phien_ban: 0 }
      );
    } finally {
      await c.end();
    }
  }
  async saveChartSettings(uid: string, body: Record<string, unknown>) {
    await this.allow(uid);
    const objects = docDoiTuong(body?.doi_tuong),
      version = Number(body?.phien_ban);
    if (!Number.isInteger(version) || version < 0)
      throw new BadRequestException('Phiên bản không hợp lệ');
    const c = await this.db();
    try {
      await c.query('BEGIN');
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
        'doi-tuong-bieu-do:' + uid,
      ]);
      const old = await c.query(
        'SELECT * FROM public.cau_hinh_bieu_do_thu_chi WHERE nguoi_dung_id=$1 FOR UPDATE',
        [uid],
      );
      if ((old.rows[0]?.phien_ban || 0) !== version)
        throw new ConflictException(
          'Nhóm so sánh đã được sửa ở máy khác. Hãy tải lại trước khi lưu',
        );
      for (const o of objects) {
        if (o.loai === 'khoan_khac') continue;
        const table = o.loai === 'phong' ? 'public.phong' : 'public.homestay';
        const r = await c.query(
          'SELECT id FROM ' + table + ' WHERE id=ANY($1::uuid[]) FOR SHARE',
          [o.ids],
        );
        if (r.rowCount !== o.ids.length)
          throw new BadRequestException(
            'Có phòng hoặc chi nhánh không còn tồn tại',
          );
      }
      const r = await c.query(
        'INSERT INTO public.cau_hinh_bieu_do_thu_chi(nguoi_dung_id,doi_tuong) VALUES($1,$2::jsonb) ON CONFLICT(nguoi_dung_id) DO UPDATE SET doi_tuong=$2::jsonb,phien_ban=cau_hinh_bieu_do_thu_chi.phien_ban+1,ngay_cap_nhat=now() RETURNING doi_tuong,phien_ban',
        [uid, JSON.stringify(objects)],
      );
      await this.audit(
        c,
        uid,
        null,
        'nhom_so_sanh',
        old.rows[0] || null,
        r.rows[0],
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
}

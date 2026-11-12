import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { QuanTriService } from './quan-tri.service.js';
const ROLES = ['Quản lý', 'Chăm sóc khách hàng', 'Nhân viên vệ sinh'];
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
@Injectable()
export class NhanVienService {
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
  private auth() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
      throw new ServiceUnavailableException(
        'Chưa cấu hình quản lý tài khoản Supabase ở máy chủ',
      );
    return createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    ).auth.admin;
  }
  private id(id: string) {
    if (!UUID.test(id))
      throw new BadRequestException('Mã tài khoản không hợp lệ');
  }
  private input(body: unknown) {
    if (!body || typeof body !== 'object' || Array.isArray(body))
      throw new BadRequestException('Dữ liệu không hợp lệ');
    const x = body as Record<string, unknown>;
    if (
      Object.keys(x).some(
        (k) =>
          ![
            'ho_ten',
            'so_dien_thoai',
            'trang_thai',
            'vai_tro',
            'chi_nhanh_ids',
            'nguoi_dung_id',
            'email',
            'mat_khau',
          ].includes(k),
      )
    )
      throw new BadRequestException('Trường không được phép');
    if (
      typeof x.ho_ten !== 'string' ||
      x.ho_ten.trim().length < 2 ||
      x.ho_ten.trim().length > 150
    )
      throw new BadRequestException('Tên phải từ 2 đến 150 ký tự');
    if (typeof x.vai_tro !== 'string' || !ROLES.includes(x.vai_tro))
      throw new BadRequestException('Vai trò nhân viên không hợp lệ');
    if (!['Đang hoạt động', 'Tạm khóa'].includes(String(x.trang_thai)))
      throw new BadRequestException('Trạng thái không hợp lệ');
    if (
      !Array.isArray(x.chi_nhanh_ids) ||
      !x.chi_nhanh_ids.length ||
      x.chi_nhanh_ids.length > 100 ||
      x.chi_nhanh_ids.some((v) => typeof v !== 'string' || !UUID.test(v))
    )
      throw new BadRequestException('Chọn ít nhất một chi nhánh');
    const phone =
      typeof x.so_dien_thoai === 'string' ? x.so_dien_thoai.trim() : '';
    if (phone && !/^\+?[0-9]{9,15}$/.test(phone))
      throw new BadRequestException('Số điện thoại không hợp lệ');
    return {
      name: x.ho_ten.trim(),
      phone: phone || null,
      state: String(x.trang_thai),
      role: x.vai_tro,
      branches: [...new Set(x.chi_nhanh_ids as string[])],
      raw: x,
    };
  }
  async list(uid: string, id?: string) {
    await this.admin.kiemTraQuanTri(uid);
    const c = await this.db();
    try {
      const r = await c.query(
        `SELECT n.id,n.ho_ten,n.so_dien_thoai,n.trang_thai,a.email,
   coalesce(jsonb_agg(jsonb_build_object('vai_tro',v.ma_vai_tro,'chi_nhanh_id',nv.homestay_id,'ten_chi_nhanh',h.ten_homestay)) FILTER(WHERE nv.ngay_thu_hoi IS NULL),'[]') AS phan_cong
   FROM public.nguoi_dung n JOIN auth.users a ON a.id=n.id JOIN public.nguoi_dung_vai_tro nv ON nv.nguoi_dung_id=n.id JOIN public.vai_tro v ON v.id=nv.vai_tro_id LEFT JOIN public.homestay h ON h.id=nv.homestay_id WHERE v.ma_vai_tro=ANY($1::text[]) AND ($2::uuid IS NULL OR n.id=$2)
   GROUP BY n.id,a.email ORDER BY n.ho_ten,n.id LIMIT 1000`,
        [ROLES, id || null],
      );
      const branches = await c.query(
        'SELECT id,ten_homestay FROM public.homestay ORDER BY ten_homestay',
      );
      return { du_lieu: r.rows, chi_nhanh: branches.rows };
    } finally {
      await c.end();
    }
  }
  async detail(uid: string, id: string) {
    this.id(id);
    const data = await this.list(uid, id);
    const row = data.du_lieu.find((r: { id: string }) => r.id === id);
    if (!row) throw new NotFoundException('Không tìm thấy nhân viên');
    return row;
  }
  async save(uid: string, id: string | undefined, body: unknown) {
    await this.admin.kiemTraQuanTri(uid);
    const updating = !!id;
    const x = this.input(body);
    let created: string | undefined;
    if (!id && x.raw.nguoi_dung_id) {
      id = String(x.raw.nguoi_dung_id);
      this.id(id);
    }
    if (id) this.id(id);
    const c = await this.db();
    let committed = false,
      commitAttempted = false;
    try {
      await c.query('BEGIN');
      const branches = await c.query(
        'SELECT id FROM public.homestay WHERE id=ANY($1::uuid[]) FOR SHARE',
        [x.branches],
      );
      if (branches.rowCount !== x.branches.length)
        throw new BadRequestException('Chi nhánh không tồn tại');
      const role = await c.query(
        'SELECT id FROM public.vai_tro WHERE ma_vai_tro=$1',
        [x.role],
      );
      if (!role.rowCount)
        throw new BadRequestException('Chưa có vai trò nhân viên trong DB');
      if (!id) {
        if (
          typeof x.raw.email !== 'string' ||
          !/^\S+@\S+\.\S+$/.test(x.raw.email) ||
          x.raw.email.length > 254 ||
          typeof x.raw.mat_khau !== 'string' ||
          x.raw.mat_khau.length < 12 ||
          x.raw.mat_khau.length > 128
        )
          throw new BadRequestException(
            'Nhập email và mật khẩu ban đầu từ 12 đến 128 ký tự',
          );
        const r = await this.auth().createUser({
          email: x.raw.email.trim(),
          password: x.raw.mat_khau,
          email_confirm: true,
        });
        if (r.error || !r.data.user)
          throw new ConflictException(
            'Không tạo được tài khoản. Kiểm tra email đã tồn tại hoặc chính sách mật khẩu',
          );
        id = r.data.user.id;
        created = id;
      }
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
        id,
      ]);
      const protectedUser = await c.query(
        "SELECT 1 FROM public.nguoi_dung_vai_tro nv JOIN public.vai_tro v ON v.id=nv.vai_tro_id WHERE nv.nguoi_dung_id=$1 AND nv.ngay_thu_hoi IS NULL AND v.ma_vai_tro='Quản trị hệ thống'",
        [id],
      );
      if (uid === id || protectedUser.rowCount)
        throw new ForbiddenException(
          'Không sửa tài khoản quản trị tại trang Nhân viên',
        );
      const exists = await c.query('SELECT id FROM auth.users WHERE id=$1', [
        id,
      ]);
      if (!exists.rowCount)
        throw new NotFoundException(
          'Tài khoản chưa tồn tại trong Supabase Auth',
        );
      if (updating) {
        const staff = await c.query(
          'SELECT 1 FROM public.nguoi_dung_vai_tro nv JOIN public.vai_tro v ON v.id=nv.vai_tro_id WHERE nv.nguoi_dung_id=$1 AND v.ma_vai_tro=ANY($2::text[]) LIMIT 1',
          [id, ROLES],
        );
        if (!staff.rowCount)
          throw new NotFoundException('Không tìm thấy nhân viên');
      }
      const before = await c.query(
        'SELECT ho_ten,so_dien_thoai,trang_thai FROM public.nguoi_dung WHERE id=$1 FOR UPDATE',
        [id],
      );
      await c.query(
        `INSERT INTO public.nguoi_dung(id,ho_ten,so_dien_thoai,trang_thai) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET ho_ten=$2,so_dien_thoai=$3,trang_thai=$4,ngay_cap_nhat=now()`,
        [id, x.name, x.phone, x.state],
      );
      await c.query(
        'UPDATE public.nguoi_dung_vai_tro SET ngay_thu_hoi=now() WHERE nguoi_dung_id=$1 AND ngay_thu_hoi IS NULL AND vai_tro_id IN(SELECT id FROM public.vai_tro WHERE ma_vai_tro=ANY($2::text[]))',
        [id, ROLES],
      );
      await c.query(
        'INSERT INTO public.nguoi_dung_vai_tro(nguoi_dung_id,vai_tro_id,homestay_id) SELECT $1,$2,unnest($3::uuid[])',
        [id, role.rows[0].id, x.branches],
      );
      await c.query(
        "INSERT INTO public.nhat_ky_he_thong(nguoi_thuc_hien_id,hanh_dong,ten_bang,ban_ghi_id,du_lieu_thay_doi) VALUES($1,$2,'nguoi_dung',$3,$4::jsonb)",
        [
          uid,
          updating ? 'Cập nhật phân công nhân viên' : 'Tạo nhân viên',
          id,
          JSON.stringify({
            truoc: before.rows[0] || null,
            sau: {
              ho_ten: x.name,
              trang_thai: x.state,
              vai_tro: x.role,
              chi_nhanh_ids: x.branches,
            },
          }),
        ],
      );
      commitAttempted = true;
      await c.query('COMMIT');
      committed = true;
      return { id, thong_bao: 'Đã lưu nhân viên' };
    } catch (e) {
      await c.query('ROLLBACK').catch(() => {});
      if (created && commitAttempted && !committed)
        throw new ServiceUnavailableException(
          'Chưa xác định kết quả lưu; quản trị cần kiểm tra tài khoản và phân công trước khi thử lại',
        );
      if (created && !committed) {
        const cleanup = await this.auth().deleteUser(created);
        if (cleanup.error)
          throw new ServiceUnavailableException(
            'Chưa lưu phân công; cần quản trị kiểm tra tài khoản vừa tạo trong Supabase Auth',
          );
      }
      if ((e as { code?: string }).code === '23505')
        throw new ConflictException('Số điện thoại đã được sử dụng');
      throw e;
    } finally {
      await c.end();
    }
  }
  async remove(uid: string, id: string) {
    await this.admin.kiemTraQuanTri(uid);
    this.id(id);
    if (uid === id) throw new ForbiddenException('Không tự thu hồi quyền');
    const c = await this.db();
    try {
      await c.query('BEGIN');
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [
        id,
      ]);
      const p = await c.query(
        "SELECT 1 FROM public.nguoi_dung_vai_tro nv JOIN public.vai_tro v ON v.id=nv.vai_tro_id WHERE nv.nguoi_dung_id=$1 AND nv.ngay_thu_hoi IS NULL AND v.ma_vai_tro='Quản trị hệ thống'",
        [id],
      );
      if (p.rowCount)
        throw new ForbiddenException('Không xóa quản trị tại trang này');
      const r = await c.query(
        'UPDATE public.nguoi_dung_vai_tro SET ngay_thu_hoi=now() WHERE nguoi_dung_id=$1 AND ngay_thu_hoi IS NULL AND vai_tro_id IN(SELECT id FROM public.vai_tro WHERE ma_vai_tro=ANY($2::text[])) RETURNING id',
        [id, ROLES],
      );
      if (!r.rowCount)
        throw new NotFoundException('Nhân viên đã được gỡ hoặc không tồn tại');
      await c.query(
        "INSERT INTO public.nhat_ky_he_thong(nguoi_thuc_hien_id,hanh_dong,ten_bang,ban_ghi_id) VALUES($1,'Thu hồi quyền nhân viên','nguoi_dung',$2)",
        [uid, id],
      );
      await c.query('COMMIT');
      return { thong_bao: 'Đã gỡ nhân viên; giữ tài khoản và lịch sử' };
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      await c.end();
    }
  }
}

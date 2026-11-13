import { GioiHanTruyCapService } from '../xac-thuc/gioi-han.service.js';
import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Client, Pool } from 'pg';
import { createHash } from 'node:crypto';
import { XacThucService } from '../xac-thuc/xac-thuc.service.js';
export type KhachDb = Pick<Client, 'query'> & { end: () => Promise<void> };
export const UUID_KHACH =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const hash = (s: string) => createHash('sha256').update(s).digest('hex');
@Injectable()
export class KetNoiKhachService {
  constructor(
    private readonly auth: XacThucService,
    private readonly limiter: GioiHanTruyCapService,
  ) {
    this.pool.on('error', () =>
      this.logger.warn(
        'Kết nối nền PostgreSQL bị ngắt; pool sẽ mở lại khi có yêu cầu',
      ),
    );
  }
  private readonly logger = new Logger('KetNoiKhach');
  private readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true },
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    query_timeout: 10000,
    max: 10,
  });
  async onModuleDestroy() {
    await this.pool.end();
  }
  async db(): Promise<KhachDb> {
    const c = await this.pool.connect();
    return { query: c.query.bind(c), end: async () => c.release() };
  }
  id(v: string) {
    if (!UUID_KHACH.test(v))
      throw new BadRequestException('Mã dữ liệu không hợp lệ');
    return v;
  }
  async identity(authorization?: string) {
    if (!authorization) return null;
    if (!/^Bearer \S+$/i.test(authorization))
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ');
    const user = await this.auth.xacMinhToken(authorization.slice(7));
    const c = await this.db();
    try {
      await c.query(
        'INSERT INTO public.nguoi_dung(id,ho_ten) VALUES($1,$2) ON CONFLICT(id) DO NOTHING',
        [user.id, 'Khách ' + user.id.slice(0, 6)],
      );
      const r = await c.query(
        'SELECT trang_thai FROM public.nguoi_dung WHERE id=$1',
        [user.id],
      );
      if (r.rows[0]?.trang_thai !== 'Đang hoạt động')
        throw new UnauthorizedException('Tài khoản đang bị khóa');
      return user;
    } finally {
      await c.end();
    }
  }
  async limit(ip: string, action: string, max = 30, seconds = 60) {
    return this.limiter.limit(ip, action, max, seconds);
  }
  async staff(c: KhachDb, id: string, branch?: string | null) {
    const r = await c.query(
      `SELECT EXISTS(SELECT 1 FROM public.nguoi_dung_vai_tro nv JOIN public.vai_tro v ON v.id=nv.vai_tro_id WHERE nv.nguoi_dung_id=$1 AND nv.ngay_thu_hoi IS NULL AND (v.ma_vai_tro='Quản trị hệ thống' AND nv.homestay_id IS NULL OR 'tin-nhan'=ANY(v.quyen_trang) OR v.ma_vai_tro IN ('Quản lý','Chăm sóc khách hàng') AND nv.homestay_id=$2)) AS ok`,
      [id, branch || null],
    );
    return !!r.rows[0].ok;
  }
}

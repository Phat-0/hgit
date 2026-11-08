import { HttpException, Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { createHash } from 'node:crypto';
@Injectable()
export class GioiHanTruyCapService {
  private readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true },
    max: 3,
    connectionTimeoutMillis: 5000,
    query_timeout: 10000,
    idleTimeoutMillis: 30000,
  });
  private readonly logger = new Logger('GioiHan');
  constructor() {
    this.pool.on('error', () =>
      this.logger.warn('Kết nối giới hạn truy cập tạm ngắt'),
    );
  }
  async onModuleDestroy() {
    await this.pool.end();
  }
  async limit(identity: string, action: string, max = 30, seconds = 60) {
    const key = createHash('sha256')
      .update((process.env.RATE_LIMIT_SECRET || '') + identity + ':' + action)
      .digest('hex');
    const r = await this.pool.query(
      `INSERT INTO public.gioi_han_truy_cap(khoa,so_lan,het_han) VALUES($1,1,now()+$2*interval '1 second') ON CONFLICT(khoa) DO UPDATE SET so_lan=CASE WHEN gioi_han_truy_cap.het_han<=now() THEN 1 ELSE gioi_han_truy_cap.so_lan+1 END,het_han=CASE WHEN gioi_han_truy_cap.het_han<=now() THEN now()+$2*interval '1 second' ELSE gioi_han_truy_cap.het_han END RETURNING so_lan`,
      [key, seconds],
    );
    if (r.rows[0].so_lan > max)
      throw new HttpException(
        'Bạn thao tác quá nhanh. Vui lòng thử lại sau.',
        429,
      );
  }
}

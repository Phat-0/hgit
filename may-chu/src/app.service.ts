import { Injectable } from '@nestjs/common';
import { Client } from 'pg';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Máy chủ Homestay đang hoạt động';
  }

  async getDatabaseHealth() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL chưa được cấu hình');
    }

    const client = new Client({
      connectionString,
      connectionTimeoutMillis: 5000,
      query_timeout: 5000,
      statement_timeout: 5000,
      ssl: { rejectUnauthorized: true },
    });

    try {
      await client.connect();
      await client.query('BEGIN READ ONLY');
      const result = await client.query<{ tong_bang: string }>(
        `SELECT count(*)::text AS tong_bang
         FROM information_schema.tables
         WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
      );
      await client.query('COMMIT');
      return {
        trang_thai: 'Đã kết nối',
        tong_bang: Number(result.rows[0]?.tong_bang ?? 0),
      };
    } finally {
      await client.end();
    }
  }
}

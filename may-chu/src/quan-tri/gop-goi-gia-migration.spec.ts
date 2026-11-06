import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
const expand = readFileSync(
  '../co-so-du-lieu/migrations/gop-goi-gia-01-mo-rong.sql',
  'utf8',
);
const backfill = readFileSync(
  '../co-so-du-lieu/migrations/gop-goi-gia-02-chuyen-du-lieu.sql',
  'utf8',
);
const fixture = readFileSync('test/fixtures/gop-goi-gia.sql', 'utf8');
const mapping = `INSERT INTO public.doi_chieu_gop_goi_gia VALUES
('00000000-0000-4000-8000-000000000002','Theo giờ','00000000-0000-4000-8000-000000000003',2,100,true,'Da doi chieu gio'),
('00000000-0000-4000-8000-000000000002','Theo đêm','00000000-0000-4000-8000-000000000004',NULL,300,true,'Da doi chieu dem');`;
describe('Migration gop gia trong PostgreSQL thu nghiem', () => {
  it('mo rong khong doi tien cu; backfill du 2 hinh thuc va quy tac', async () => {
    const db = new PGlite();
    try {
      await db.exec(fixture);
      await db.exec(expand);
      expect(
        (await db.query<any>('SELECT * FROM phong')).rows[0],
      ).toMatchObject({ gia_moi_gio: '100', mo_ban_theo_gio: false });
      await db.exec(mapping);
      await db.exec(backfill);
      expect(
        (await db.query<any>('SELECT * FROM phong')).rows[0],
      ).toMatchObject({
        gia_moi_gio: '200',
        gia_moi_dem: '400',
        gia_moi_ngay: '500',
        so_gio_toi_thieu: 2,
        mo_ban_theo_gio: true,
        mo_ban_theo_dem: true,
        mo_ban_theo_ngay: false,
      });
      expect(
        (await db.query<any>('SELECT * FROM dat_phong')).rows[0],
      ).toMatchObject({
        tien_phong: '123',
        goi_gia_id: '00000000-0000-4000-8000-000000000003',
        cau_hinh_gia_ap_dung: null,
      });
      expect(
        (await db.query<any>('SELECT * FROM gia_lich_phong')).rows[0],
      ).toMatchObject({ gia: '250', muc_uu_tien: 5, loai_gia: 'gio' });
      await db.exec(
        "INSERT INTO dat_phong(id,phong_id,hinh_thuc_dat,tien_phong) VALUES(gen_random_uuid(),'00000000-0000-4000-8000-000000000002','Theo ngày',500)",
      );
      expect(
        (await db.query<any>('SELECT count(*)::int AS n FROM goi_gia')).rows[0]
          .n,
      ).toBe(2);
    } finally {
      await db.close();
    }
  }, 20000);
  it('chan mapping thieu va rollback khi gia phong thay doi', async () => {
    const db = new PGlite();
    try {
      await db.exec(fixture);
      await db.exec(expand);
      await expect(db.exec(backfill)).rejects.toThrow('Chua co mapping');
      await db.exec('ROLLBACK');
      await db.exec(mapping);
      await db.exec('UPDATE phong SET gia_moi_gio=150');
      await expect(db.exec(backfill)).rejects.toThrow('Mapping chua duyet');
      await db.exec('ROLLBACK');
      expect(
        (await db.query<any>('SELECT * FROM phong')).rows[0],
      ).toMatchObject({
        gia_moi_gio: '150',
        gia_moi_dem: '300',
        mo_ban_theo_gio: false,
      });
    } finally {
      await db.close();
    }
  }, 20000);
});

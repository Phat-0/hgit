import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { KetNoiKhachService, type KhachDb } from './ket-noi.service.js';
import { chuanHoaSoDienThoai, tinhGiaKhach } from './tien-phong.js';
import {
  kiemTraCauHinhGio,
  kiemTraThoiGianDat,
  type HinhThucDat,
} from '../quan-tri/khung-gio.js';
import { COMBO_THEO_PHONG } from '../quan-tri/combo.input.js';
const ROOM = `SELECT p.*,h.ten_homestay,h.dia_chi,h.tinh_thanh,l.ten_loai,l.mo_ta,l.suc_chua,l.dien_tich_m2 FROM public.phong p JOIN public.homestay h ON h.id=p.homestay_id JOIN public.loai_phong l ON l.id=p.loai_phong_id WHERE h.trang_thai='Đang hoạt động' AND p.trang_thai_van_hanh NOT IN ('Bảo trì','Bị khóa')`;
@Injectable()
export class TrangKhachService {
  constructor(private readonly conn: KetNoiKhachService) {}
  private timer?: ReturnType<typeof setInterval>;
  private expiring = false;
  private readonly logger = new Logger('GiuPhongKhach');
  onModuleInit() {
    this.timer = setInterval(() => void this.expireBackground(), 30000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  private async expireBackground() {
    if (this.expiring) return;
    this.expiring = true;
    let c: KhachDb | undefined;
    try {
      c = await this.conn.db();
      await this.expire(c);
    } catch {
      this.logger.warn(
        'Chưa dọn được đơn hết hạn; kiểm tra kết nối và migration trang khách',
      );
    } finally {
      await c?.end();
      this.expiring = false;
    }
  }
  private async expire(c: KhachDb) {
    await c.query(
      `WITH expired AS(UPDATE public.dat_phong SET trang_thai='Hết hạn',ngay_cap_nhat=now() WHERE nguon_dat='khach' AND trang_thai='Chờ xác nhận' AND het_han_giu_cho<=now() RETURNING id) INSERT INTO public.nhat_ky_don_dat_phong(dat_phong_id,hanh_dong,du_lieu_moi) SELECT id,'het_han_giu_cho','{"trang_thai":"Hết hạn"}'::jsonb FROM expired`,
    );
  }
  private async config(c: KhachDb) {
    return kiemTraCauHinhGio(
      (
        await c.query(
          'SELECT khung_gio FROM public.cau_hinh_gio_dat_phong WHERE id=1',
        )
      ).rows[0]?.khung_gio,
    );
  }
  private interval(x: Record<string, unknown>) {
    const start = new Date(String(x.bat_dau || '')),
      end = new Date(String(x.ket_thuc || '')),
      kind = String(x.hinh_thuc_dat || '') as HinhThucDat;
    if (
      !['Theo giờ', 'Theo ngày', 'Theo đêm'].includes(kind) ||
      !Number.isFinite(+start) ||
      !Number.isFinite(+end) ||
      start >= end ||
      +end - +start > 31 * 86400000 ||
      +start < Date.now() - 60000 ||
      +start > Date.now() + 180 * 86400000
    )
      throw new BadRequestException(
        'Chọn thời gian tương lai hợp lệ, tối đa 31 ngày mỗi đơn và trong 180 ngày tới',
      );
    return { start, end, kind };
  }
  private async image(key: string | null, bucket = 'anh-phong') {
    if (!key) return null;
    if (key.startsWith('https://')) return key;
    const url = process.env.SUPABASE_URL,
      secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !secret) return null;
    const { data, error } = await createClient(url, secret, {
      auth: { persistSession: false },
    })
      .storage.from(bucket)
      .createSignedUrl(key.replace(/^storage:\/\//, ''), 3600);
    return error ? null : data.signedUrl;
  }
  async options() {
    const c = await this.conn.db();
    try {
      return {
        chi_nhanh: (
          await c.query(
            "SELECT id,ten_homestay,tinh_thanh FROM public.homestay WHERE trang_thai='Đang hoạt động' ORDER BY ten_homestay",
          )
        ).rows,
        khung_gio: await this.config(c),
      };
    } finally {
      await c.end();
    }
  }
  private async free(c: KhachDb, id: string, start: Date, end: Date) {
    const r = await c.query(
      `SELECT EXISTS(SELECT 1 FROM public.dat_phong WHERE phong_id=$1 AND trang_thai IN ('Chờ thanh toán','Chờ xác nhận','Đã xác nhận','Đã nhận phòng') AND nhan_phong_luc<$3 AND tra_phong_luc>$2 UNION ALL SELECT 1 FROM public.chan_lich_phong WHERE phong_id=$1 AND bat_dau<$3 AND ket_thuc>$2) AS busy`,
      [id, start.toISOString(), end.toISOString()],
    );
    return !r.rows[0].busy;
  }
  async rooms(x: Record<string, unknown>) {
    const { start, end, kind } = this.interval(x),
      branch = String(x.chi_nhanh_id || '');
    if (branch) this.conn.id(branch);
    const c = await this.conn.db();
    try {
      await this.expire(c);
      const config = await this.config(c);
      const rows = await c.query(
        ROOM +
          ` AND ($1::uuid IS NULL OR p.homestay_id=$1) AND NOT EXISTS(SELECT 1 FROM public.dat_phong d WHERE d.phong_id=p.id AND d.trang_thai IN ('Chờ thanh toán','Chờ xác nhận','Đã xác nhận','Đã nhận phòng') AND d.nhan_phong_luc<$3 AND d.tra_phong_luc>$2) AND NOT EXISTS(SELECT 1 FROM public.chan_lich_phong cl WHERE cl.phong_id=p.id AND cl.bat_dau<$3 AND cl.ket_thuc>$2) ORDER BY h.ten_homestay,p.ma_phong LIMIT 200`,
        [branch || null, start.toISOString(), end.toISOString()],
      );
      const valid = rows.rows.filter((p) => {
        try {
          kiemTraThoiGianDat(
            kind,
            start,
            end,
            config,
            Number(p.so_gio_toi_thieu),
          );
          return p[
            kind === 'Theo giờ'
              ? 'cho_dat_theo_gio'
              : kind === 'Theo ngày'
                ? 'cho_dat_theo_ngay'
                : 'cho_dat_theo_dem'
          ];
        } catch {
          return false;
        }
      });
      const ids = valid.map((p) => p.id);
      if (!ids.length) return [];
      const rules = await c.query(
        'SELECT * FROM public.gia_lich_phong WHERE phong_id=ANY($1::uuid[]) AND bat_dau<$3 AND ket_thuc>$2',
        [ids, start.toISOString(), end.toISOString()],
      );
      const photos = await c.query(
        'SELECT phong_id,duong_dan FROM public.hinh_anh_phong WHERE phong_id=ANY($1::uuid[]) ORDER BY la_anh_dai_dien DESC,thu_tu,id',
        [ids],
      );
      return await Promise.all(
        valid.map(async (p) => ({
          id: p.id,
          ten_phong: p.ten_phong,
          ma_phong: p.ma_phong,
          ten_homestay: p.ten_homestay,
          dia_chi: p.dia_chi,
          tinh_thanh: p.tinh_thanh,
          ten_loai: p.ten_loai,
          mo_ta: p.mo_ta,
          suc_chua: p.suc_chua,
          dien_tich_m2: p.dien_tich_m2,
          tien_phong: tinhGiaKhach(
            p,
            start,
            end,
            kind,
            rules.rows.filter((r) => r.phong_id === p.id),
          ),
          anh: await Promise.all(
            photos.rows
              .filter((r) => r.phong_id === p.id)
              .slice(0, 8)
              .map((r) => this.image(r.duong_dan)),
          ),
        })),
      );
    } finally {
      await c.end();
    }
  }
  private async price(
    c: KhachDb,
    p: Record<string, any>,
    start: Date,
    end: Date,
    kind: HinhThucDat,
    combo?: any,
  ) {
    const rules = await c.query(
      'SELECT * FROM public.gia_lich_phong WHERE phong_id=$1 AND bat_dau<$3 AND ket_thuc>$2',
      [p.id, start.toISOString(), end.toISOString()],
    );
    return tinhGiaKhach(p as any, start, end, kind, rules.rows, combo);
  }
  private async prepare(c: KhachDb, x: Record<string, unknown>, lock = false) {
    const { start, end, kind } = this.interval(x),
      id = this.conn.id(String(x.phong_id || ''));
    const r = await c.query(
      ROOM + ' AND p.id=$1' + (lock ? ' FOR UPDATE OF p' : ''),
      [id],
    );
    if (!r.rowCount) throw new NotFoundException('Phòng không còn mở bán');
    const p = r.rows[0],
      config = await this.config(c);
    kiemTraThoiGianDat(kind, start, end, config, Number(p.so_gio_toi_thieu));
    if (
      !p[
        kind === 'Theo giờ'
          ? 'cho_dat_theo_gio'
          : kind === 'Theo ngày'
            ? 'cho_dat_theo_ngay'
            : 'cho_dat_theo_dem'
      ]
    )
      throw new BadRequestException('Phòng không nhận kiểu đặt này');
    if (!(await this.free(c, id, start, end)))
      throw new ConflictException(
        'Phòng vừa được đặt. Hãy chọn phòng hoặc thời gian khác',
      );
    let combo;
    if (x.combo_id) {
      this.conn.id(String(x.combo_id));
      const r = await c.query(
        COMBO_THEO_PHONG +
          " AND co.trang_thai='Đang bán' AND (co.bat_dau IS NULL OR co.bat_dau<=$4) AND (co.ket_thuc IS NULL OR co.ket_thuc>=$5) AND (co.so_gio_bao_gom IS NULL OR $6='Theo giờ') FOR SHARE OF co",
        [
          x.combo_id,
          p.homestay_id,
          p.id,
          start.toISOString(),
          end.toISOString(),
          kind,
        ],
      );
      if (!r.rowCount)
        throw new BadRequestException(
          'Combo không áp dụng cho phòng và thời gian này',
        );
      combo = (
        await c.query(
          'SELECT gia_combo,so_gio_bao_gom FROM public.combo WHERE id=$1',
          [x.combo_id],
        )
      ).rows[0];
    }
    return {
      p,
      start,
      end,
      kind,
      config,
      amount: await this.price(c, p, start, end, kind, combo),
    };
  }
  async quote(x: Record<string, unknown>) {
    const c = await this.conn.db();
    try {
      await this.expire(c);
      const q = await this.prepare(c, x);
      return { tien_phong: q.amount, don_vi: 'VND' };
    } finally {
      await c.end();
    }
  }
  async combos(x: Record<string, unknown>) {
    const c = await this.conn.db();
    try {
      const { p, start, end, kind } = await this.prepare(c, x);
      const r = await c.query(
        `SELECT co.*,ARRAY(SELECT homestay_id FROM public.combo_chi_nhanh WHERE combo_id=co.id) AS chi_nhanh_ids FROM public.combo co WHERE co.trang_thai='Đang bán' AND (co.bat_dau IS NULL OR co.bat_dau<=$2) AND (co.ket_thuc IS NULL OR co.ket_thuc>=$3) AND (co.so_gio_bao_gom IS NULL OR $4='Theo giờ') AND (co.pham_vi='toan_he_thong' OR co.pham_vi='chi_nhanh' AND EXISTS(SELECT 1 FROM public.combo_chi_nhanh cc WHERE cc.combo_id=co.id AND cc.homestay_id=$5) OR co.pham_vi='phong' AND EXISTS(SELECT 1 FROM public.combo_phong cp WHERE cp.combo_id=co.id AND cp.phong_id=$1)) ORDER BY co.ten_combo`,
        [p.id, start.toISOString(), end.toISOString(), kind, p.homestay_id],
      );
      return await Promise.all(
        r.rows.map(async (co) => ({
          id: co.id,
          ten_combo: co.ten_combo,
          mo_ta: co.mo_ta,
          gia_combo: co.gia_combo,
          so_gio_bao_gom: co.so_gio_bao_gom,
          bat_dau: co.bat_dau,
          ket_thuc: co.ket_thuc,
          trang_thai: co.trang_thai,
          tong_gia: await this.price(c, p, start, end, kind, co),
          anh: await Promise.all(
            (co.anh_combo?.length
              ? co.anh_combo
              : co.anh_dai_dien
                ? [co.anh_dai_dien]
                : []
            ).map((key: string) => this.image(key, 'anh-combo')),
          ),
        })),
      );
    } finally {
      await c.end();
    }
  }
  async create(x: Record<string, unknown>, authorization?: string) {
    const user = await this.conn.identity(authorization),
      name = String(x.ten_khach || '').trim(),
      phone = chuanHoaSoDienThoai(x.so_dien_thoai),
      guests = Number(x.so_khach),
      note = String(x.ghi_chu || '').trim(),
      requestId = this.conn.id(String(x.khoa_yeu_cau || ''));
    if (
      name.length < 2 ||
      name.length > 150 ||
      note.length > 2000 ||
      !Number.isInteger(guests) ||
      guests < 1
    )
      throw new BadRequestException('Tên, số khách hoặc ghi chú không hợp lệ');
    const c = await this.conn.db();
    try {
      await this.expire(c);
      await c.query('BEGIN');
      await c.query('SELECT pg_advisory_xact_lock(hashtext($1))', [requestId]);
      const old = await c.query(
        'SELECT ma_dat_phong,tong_tien,trang_thai,het_han_giu_cho FROM public.dat_phong WHERE khoa_yeu_cau=$1 AND (so_dien_thoai_dat=$2 OR nguoi_dung_id=$3)',
        [requestId, phone, user?.id ?? null],
      );
      if (old.rowCount) {
        await c.query('COMMIT');
        return old.rows[0];
      }
      const q = await this.prepare(c, x, true);
      if (guests > q.p.suc_chua)
        throw new BadRequestException('Số khách vượt sức chứa phòng');
      const result = await c.query(
        `INSERT INTO public.dat_phong(ma_dat_phong,ten_don,nguoi_dung_id,homestay_id,phong_id,hinh_thuc_dat,nhan_phong_luc,tra_phong_luc,so_khach,trang_thai,tien_phong,het_han_giu_cho,ghi_chu,so_dien_thoai_dat,nguon_dat,combo_id,cau_hinh_gia_chot,khoa_yeu_cau) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'Chờ xác nhận',$10,now()+interval '15 minutes',$11,$12,'khach',$13,$14::jsonb,$15) RETURNING ma_dat_phong,tong_tien,trang_thai,het_han_giu_cho`,
        [
          'DP' + randomUUID().replaceAll('-', '').toUpperCase(),
          name,
          user?.id ?? null,
          q.p.homestay_id,
          q.p.id,
          q.kind,
          q.start.toISOString(),
          q.end.toISOString(),
          guests,
          q.amount,
          note,
          phone,
          x.combo_id || null,
          JSON.stringify({
            khung_gio: q.config,
            tien_phong_chot: q.amount,
            gia_moi_gio: q.p.gia_moi_gio,
            gia_moi_ngay: q.p.gia_moi_ngay,
            gia_moi_dem: q.p.gia_moi_dem,
            gia_phu_thu_gio: q.p.gia_phu_thu_gio,
            so_gio_toi_thieu: q.p.so_gio_toi_thieu,
          }),
          requestId,
        ],
      );
      await c.query('COMMIT');
      return result.rows[0];
    } catch (e) {
      await c.query('ROLLBACK');
      if (['23P01', '23505', 'P0001'].includes((e as any).code))
        throw new ConflictException(
          'Phòng vừa được đặt. Hãy tìm lại lịch trống',
        );
      throw e;
    } finally {
      await c.end();
    }
  }
  async history(authorization?: string) {
    const user = await this.conn.identity(authorization);
    if (!user) throw new UnauthorizedException();
    const c = await this.conn.db();
    try {
      await this.expire(c);
      await c.query('BEGIN');
      if (user.phone && user.phone_verified) {
        const phone = chuanHoaSoDienThoai(user.phone);
        await c.query(
          `WITH claimed AS(UPDATE public.dat_phong SET nguoi_dung_id=$1,ngay_cap_nhat=now() WHERE nguoi_dung_id IS NULL AND CASE WHEN regexp_replace(so_dien_thoai_dat,'[ .()-]','','g')~'^0[0-9]{9}$' THEN '+84'||substr(regexp_replace(so_dien_thoai_dat,'[ .()-]','','g'),2) WHEN so_dien_thoai_dat~'^84[0-9]{9}$' THEN '+'||so_dien_thoai_dat ELSE so_dien_thoai_dat END=$2 RETURNING id) INSERT INTO public.nhat_ky_don_dat_phong(dat_phong_id,nguoi_thuc_hien_id,hanh_dong) SELECT id,$1,'nhan_don_sau_otp' FROM claimed`,
          [user.id, phone],
        );
      }
      const r = await c.query(
        `SELECT d.ma_dat_phong,d.ten_don,d.nhan_phong_luc,d.tra_phong_luc,d.trang_thai,d.tong_tien,d.trang_thai_thanh_toan,d.het_han_giu_cho,p.ten_phong,h.ten_homestay FROM public.dat_phong d JOIN public.phong p ON p.id=d.phong_id JOIN public.homestay h ON h.id=d.homestay_id WHERE d.nguoi_dung_id=$1 ORDER BY d.ngay_tao DESC LIMIT 200`,
        [user.id],
      );
      await c.query('COMMIT');
      return r.rows;
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      await c.end();
    }
  }
}

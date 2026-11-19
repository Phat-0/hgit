import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { QuanTriService } from './quan-tri.service.js';
import { moDb, maId, chu, ghiNhatKy } from './van-hanh.db.js';
import type { Client } from 'pg';
export async function nhacVeSinh(c: Pick<Client, 'query'>) {
  await c.query('BEGIN');
  try {
    await c.query('SELECT pg_advisory_xact_lock(20261119,15)');
    await c.query(
      "UPDATE public.cong_viec_ve_sinh v SET trang_thai='Đã hủy' FROM public.dat_phong d WHERE v.dat_phong_id=d.id AND d.trang_thai IN ('Đã hủy','Không nhận phòng') AND v.trang_thai IN('Chờ nhận','Đã nhận','Đang thực hiện')",
    );
    const due = (
      await c.query(
        "SELECT d.id,d.phong_id,d.homestay_id,CASE WHEN d.trang_thai='Đã trả phòng' THEN coalesce(d.da_tra_phong_luc,d.tra_phong_luc) ELSE d.tra_phong_luc END AS tra_phong_luc,d.trang_thai,p.ma_phong FROM public.dat_phong d JOIN public.phong p ON p.id=d.phong_id WHERE (d.trang_thai='Đã nhận phòng' AND d.tra_phong_luc<=now()+interval '15 minutes' AND d.tra_phong_luc>now()-interval '1 day' OR d.trang_thai='Đã trả phòng' AND coalesce(d.da_tra_phong_luc,d.tra_phong_luc)>now()-interval '1 day' AND coalesce(d.da_tra_phong_luc,d.tra_phong_luc)<=now()) ORDER BY d.tra_phong_luc LIMIT 100",
      )
    ).rows;
    for (const d of due) {
      let job = (
        await c.query(
          "SELECT id FROM public.cong_viec_ve_sinh WHERE dat_phong_id=$1 AND trang_thai<>'Đã hủy' ORDER BY ngay_tao DESC LIMIT 1",
          [d.id],
        )
      ).rows[0];
      if (!job)
        job = (
          await c.query(
            "INSERT INTO public.cong_viec_ve_sinh(phong_id,dat_phong_id,han_hoan_thanh,ghi_chu) VALUES($1,$2,$3,'Nhắc trước checkout 15 phút; chỉ vệ sinh sau khi khách trả phòng') RETURNING id",
            [d.phong_id, d.id, d.tra_phong_luc],
          )
        ).rows[0];
      await c.query("UPDATE public.cong_viec_ve_sinh SET phong_id=$2,han_hoan_thanh=$3 WHERE id=$1 AND trang_thai NOT IN ('Hoàn thành','Đã hủy')",[job.id,d.phong_id,d.tra_phong_luc]);
      await c.query(
        "INSERT INTO public.thong_bao(nguoi_dung_id,tieu_de,noi_dung,loai,du_lieu) SELECT DISTINCT n.id,'Phòng sắp checkout',$2,'Sắp trả phòng',$3::jsonb FROM public.nguoi_dung n JOIN public.nguoi_dung_vai_tro nv ON nv.nguoi_dung_id=n.id JOIN public.vai_tro r ON r.id=nv.vai_tro_id WHERE n.trang_thai='Đang hoạt động' AND nv.ngay_thu_hoi IS NULL AND nv.homestay_id=$1 AND r.ma_vai_tro='Nhân viên vệ sinh' AND NOT EXISTS(SELECT 1 FROM public.thong_bao t WHERE t.nguoi_dung_id=n.id AND t.loai='Sắp trả phòng' AND t.du_lieu->>'cong_viec_id'=$4 AND t.du_lieu->>'checkout'=$5)",
        [
          d.homestay_id,
          'Phòng '+d.ma_phong+' · Out '+new Date(d.tra_phong_luc).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}),
          JSON.stringify({
            cong_viec_id: job.id,
            ma_phong:d.ma_phong,
            phong_id: d.phong_id,
            checkout: new Date(d.tra_phong_luc).toISOString(),
          }),
          job.id,
          new Date(d.tra_phong_luc).toISOString(),
        ],
      );
    }
    await c.query('COMMIT');
    return { so_don: due.length };
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  }
}
@Injectable()
export class VeSinhService {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private readonly logger = new Logger('VeSinh');
  constructor(private readonly admin: QuanTriService) {}
  private db() {
    return moDb();
  }
  onModuleInit() {
    this.timer = setInterval(
      () =>
        void this.tick().catch(() =>
          this.logger.warn('Chưa xử lý được nhắc vệ sinh'),
        ),
      30000,
    );
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const c = await this.db();
      try {
        return await nhacVeSinh(c);
      } finally {
        await c.end();
      }
    } finally {
      this.running = false;
    }
  }
  private async access(c: Pick<Client, 'query'>, uid: string, branch: string) {
    const r = await c.query(
      "SELECT EXISTS(SELECT 1 FROM public.nguoi_dung n JOIN public.nguoi_dung_vai_tro nv ON nv.nguoi_dung_id=n.id JOIN public.vai_tro v ON v.id=nv.vai_tro_id WHERE n.id=$1 AND n.trang_thai='Đang hoạt động' AND nv.ngay_thu_hoi IS NULL AND v.ma_vai_tro<>'Khách hàng') AS ok",
      [uid],
    );
    if (!r.rows[0]?.ok)
      throw new ForbiddenException('Chỉ tài khoản nhân viên đang hoạt động được hoàn thành vệ sinh');
  }
  async list(uid: string) {
    await this.admin.kiemTraTrang(uid, 've-sinh');
    const c = await this.db();
    try {
      return (
        await c.query(
          "SELECT v.id,v.trang_thai,v.hoan_thanh_luc,p.ma_phong,coalesce(d.da_tra_phong_luc,d.tra_phong_luc,v.han_hoan_thanh) AS tra_phong_luc,d.trang_thai AS trang_thai_don,v.dat_phong_id,(d.trang_thai='Đã trả phòng' AND v.trang_thai NOT IN ('Hoàn thành','Đã hủy')) AS co_the_hoan_thanh FROM public.cong_viec_ve_sinh v JOIN public.phong p ON p.id=v.phong_id LEFT JOIN public.dat_phong d ON d.id=v.dat_phong_id WHERE v.trang_thai<>'Đã hủy' AND EXISTS(SELECT 1 FROM public.nguoi_dung_vai_tro nv JOIN public.vai_tro r ON r.id=nv.vai_tro_id JOIN public.nguoi_dung n ON n.id=nv.nguoi_dung_id WHERE n.id=$1 AND n.trang_thai='Đang hoạt động' AND nv.ngay_thu_hoi IS NULL AND r.ma_vai_tro<>'Khách hàng') ORDER BY (v.trang_thai<>'Hoàn thành' AND coalesce(d.da_tra_phong_luc,d.tra_phong_luc,v.han_hoan_thanh)<now()-interval '30 minutes') DESC,(v.trang_thai='Hoàn thành') ASC,coalesce(d.da_tra_phong_luc,d.tra_phong_luc,v.han_hoan_thanh) ASC LIMIT 500",
          [uid],
        )
      ).rows;
    } finally {
      await c.end();
    }
  }
  async update(uid: string, id: string, b: Record<string, unknown>) {
    maId(id);
    const c = await this.db();
    try {
      await c.query('BEGIN');
      const v = (
        await c.query(
          'SELECT v.*,p.homestay_id,d.trang_thai as trang_thai_don FROM public.cong_viec_ve_sinh v JOIN public.phong p ON p.id=v.phong_id LEFT JOIN public.dat_phong d ON d.id=v.dat_phong_id WHERE v.id=$1 FOR UPDATE OF v',
          [id],
        )
      ).rows[0];
      if (!v) throw new BadRequestException('Không tìm thấy việc');
      await this.access(c, uid, v.homestay_id);
      const action = String(b.hanh_dong);
      if (action === 'nhan') {
        if (v.trang_thai !== 'Chờ nhận')
          throw new BadRequestException('Việc đã được nhận');
        await c.query(
          "UPDATE public.cong_viec_ve_sinh SET nhan_vien_id=$2,trang_thai='Đã nhận' WHERE id=$1",
          [id, uid],
        );
      } else if (action === 'hoan-thanh') {
        if(v.trang_thai==='Hoàn thành'){await c.query('COMMIT');return {ok:true};}
        if(!['Chờ nhận','Đã nhận','Đang thực hiện','Chờ kiểm tra'].includes(v.trang_thai))throw new BadRequestException('Công việc không còn hiệu lực');
        const booking=v.dat_phong_id?(await c.query('SELECT trang_thai,phong_id FROM public.dat_phong WHERE id=$1 FOR SHARE',[v.dat_phong_id])).rows[0]:null;
        if(booking&&booking.phong_id!==v.phong_id)throw new BadRequestException('Lịch phòng đã thay đổi. Vui lòng tải lại');
        if (booking?.trang_thai !== 'Đã trả phòng')
          throw new BadRequestException(
            'Chỉ hoàn tất vệ sinh sau khi đơn đã trả phòng',
          );
        const note = chu(b.noi_dung || 'Xác nhận đã hoàn thành vệ sinh', 0, 2000);
        await c.query(
          'INSERT INTO public.bao_cao_ve_sinh(cong_viec_id,nguoi_bao_cao_id,noi_dung) VALUES($1,$2,$3)',
          [id, uid, note],
        );
        await c.query(
          "UPDATE public.cong_viec_ve_sinh SET nhan_vien_id=$2,trang_thai='Hoàn thành',hoan_thanh_luc=now(),bat_dau_luc=coalesce(bat_dau_luc,now()) WHERE id=$1",
          [id,uid],
        );
        await c.query(
          "UPDATE public.phong p SET trang_thai_van_hanh='Trống',trang_thai_cap_nhat_luc=now() WHERE p.id=$1 AND p.trang_thai_van_hanh NOT IN('Bảo trì','Bị khóa') AND NOT EXISTS(SELECT 1 FROM public.dat_phong d WHERE d.phong_id=p.id AND d.trang_thai='Đã nhận phòng')",
          [v.phong_id],
        );
      } else throw new BadRequestException('Thao tác không hợp lệ');
      if(action==='hoan-thanh')await c.query("UPDATE public.thong_bao SET da_doc_luc=coalesce(da_doc_luc,now()) WHERE nguoi_dung_id=$1 AND loai='Sắp trả phòng' AND du_lieu->>'cong_viec_id'=$2",[uid,id]);
      await ghiNhatKy(
        c,
        uid,
        action === 'nhan' ? 'Nhận vệ sinh' : 'Hoàn thành vệ sinh',
        'cong_viec_ve_sinh',
        id,
        {},
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
}

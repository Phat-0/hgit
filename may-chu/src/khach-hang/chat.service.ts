import {
  chatStorage,
  docTepChat,
  type ChatFile,
  type StoredFile,
} from './chat-tep.js';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import { KetNoiKhachService, hash, type KhachDb } from './ket-noi.service.js';
@Injectable()
export class ChatService {
  constructor(private readonly conn: KetNoiKhachService) {}
  private guest(token?: string) {
    if (!token) return null;
    if (!/^[a-f0-9]{64}$/.test(token))
      throw new ForbiddenException('Phiên chat không hợp lệ');
    return hash(token);
  }
  private async access(c: KhachDb, id: string, uid?: string, token?: string) {
    this.conn.id(id);
    const r = await c.query(
      'SELECT * FROM public.cuoc_tro_chuyen WHERE id=$1',
      [id],
    );
    const t = r.rows[0];
    if (!t) throw new ForbiddenException('Không có quyền xem hội thoại');
    const member = uid
      ? (
          await c.query(
            'SELECT 1 FROM public.thanh_vien_tro_chuyen WHERE cuoc_tro_chuyen_id=$1 AND nguoi_dung_id=$2',
            [id, uid],
          )
        ).rowCount
      : 0;
    const staff =
      uid && t.loai === 'ho_tro'
        ? await this.conn.staff(c, uid, t.homestay_id)
        : false;
    if (
      !member &&
      !staff &&
      (!token ||
        !t.khach_vang_lai_hash ||
        (t.khach_hang_id && t.khach_hang_id !== uid) ||
        this.guest(token) !== t.khach_vang_lai_hash)
    )
      throw new ForbiddenException('Không có quyền xem hội thoại');
    return { t, staff };
  }
  async start(
    x: Record<string, unknown>,
    authorization?: string,
    guestToken?: string,
  ) {
    const user = await this.conn.identity(authorization),
      c = await this.conn.db();
    try {
      await c.query('BEGIN');
      if (x.nguoi_nhan_id) {
        if (!user) throw new UnauthorizedException();
        const recipient = this.conn.id(String(x.nguoi_nhan_id));
        if (recipient === user.id)
          throw new BadRequestException('Chọn tài khoản khác');
        const exists = await c.query(
          "SELECT id FROM public.nguoi_dung WHERE id=$1 AND trang_thai='Đang hoạt động'",
          [recipient],
        );
        if (!exists.rowCount)
          throw new BadRequestException(
            'Tài khoản không tồn tại hoặc không nhận tin',
          );
        const key = [user.id, recipient].sort().join(':');
        const r = await c.query(
          "INSERT INTO public.cuoc_tro_chuyen(khach_hang_id,loai,khoa_truc_tiep,che_do_xu_ly) VALUES($1,'truc_tiep',$2,'Nhân viên tiếp quản') ON CONFLICT(khoa_truc_tiep) DO UPDATE SET khoa_truc_tiep=excluded.khoa_truc_tiep RETURNING id",
          [user.id, key],
        );
        await c.query(
          'INSERT INTO public.thanh_vien_tro_chuyen VALUES($1,$2),($1,$3) ON CONFLICT DO NOTHING',
          [r.rows[0].id, user.id, recipient],
        );
        await c.query('COMMIT');
        return { id: r.rows[0].id };
      }
      const branch = x.chi_nhanh_id
        ? this.conn.id(String(x.chi_nhanh_id))
        : null;
      if (
        branch &&
        !(
          await c.query(
            "SELECT 1 FROM public.homestay WHERE id=$1 AND trang_thai='Đang hoạt động'",
            [branch],
          )
        ).rowCount
      )
        throw new BadRequestException('Chi nhánh không tồn tại');
      // Token ngẫu nhiên chỉ lưu ở trình duyệt khách; database chỉ lưu hash.
      const token =
          guestToken || (!user ? randomBytes(32).toString('hex') : null),
        guestHash = token ? this.guest(token) : null;
      if (guestHash) {
        const existing = await c.query(
          'SELECT id,homestay_id,khach_hang_id FROM public.cuoc_tro_chuyen WHERE khach_vang_lai_hash=$1 FOR UPDATE',
          [guestHash],
        );
        if (existing.rowCount) {
          const id = existing.rows[0].id;
          if (existing.rows[0].homestay_id !== branch)
            throw new BadRequestException(
              'Phiên hỗ trợ không thuộc chi nhánh đang chọn',
            );
          if (
            existing.rows[0].khach_hang_id &&
            existing.rows[0].khach_hang_id !== user?.id
          )
            throw new ForbiddenException('Hội thoại đã thuộc tài khoản khác');
          if (user) {
            await c.query(
              'INSERT INTO public.thanh_vien_tro_chuyen VALUES($1,$2) ON CONFLICT DO NOTHING',
              [id, user.id],
            );
            await c.query(
              'UPDATE public.cuoc_tro_chuyen SET khach_hang_id=COALESCE(khach_hang_id,$2) WHERE id=$1',
              [id, user.id],
            );
            await c.query(
              `INSERT INTO public.trang_thai_doc_chat(cuoc_tro_chuyen_id,khoa_nguoi_doc,doc_den_luc,doc_den_id) SELECT cuoc_tro_chuyen_id,$2,doc_den_luc,doc_den_id FROM public.trang_thai_doc_chat WHERE cuoc_tro_chuyen_id=$1 AND khoa_nguoi_doc=$3 ON CONFLICT(cuoc_tro_chuyen_id,khoa_nguoi_doc) DO UPDATE SET doc_den_luc=excluded.doc_den_luc,doc_den_id=excluded.doc_den_id WHERE (excluded.doc_den_luc,excluded.doc_den_id)>(trang_thai_doc_chat.doc_den_luc,trang_thai_doc_chat.doc_den_id)`,
              [id, 'u:' + user.id, 'g:' + guestHash],
            );
          }
          await c.query('COMMIT');
          return { id, guest_token: token };
        }
      }
      if (user) {
        await c.query('SELECT pg_advisory_xact_lock(hashtext($1))', [user.id]);
        const existing = await c.query(
          "SELECT id FROM public.cuoc_tro_chuyen WHERE khach_hang_id=$1 AND loai='ho_tro' AND homestay_id IS NOT DISTINCT FROM $2 AND trang_thai='Đang mở' LIMIT 1",
          [user.id, branch],
        );
        if (existing.rowCount) {
          await c.query('COMMIT');
          return { id: existing.rows[0].id };
        }
      }
      const r = await c.query(
        "INSERT INTO public.cuoc_tro_chuyen(khach_hang_id,homestay_id,khach_vang_lai_hash,che_do_xu_ly) VALUES($1,$2,$3,'Nhân viên tiếp quản') RETURNING id",
        [user?.id ?? null, branch, guestHash],
      );
      if (user)
        await c.query(
          'INSERT INTO public.thanh_vien_tro_chuyen VALUES($1,$2)',
          [r.rows[0].id, user.id],
        );
      await c.query('COMMIT');
      return { id: r.rows[0].id, guest_token: token };
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      await c.end();
    }
  }
  async people(query: string, authorization?: string) {
    const user = await this.conn.identity(authorization);
    if (!user) throw new UnauthorizedException();
    const term = query.trim();
    if (term.length < 2 || term.length > 100)
      throw new BadRequestException('Nhập từ 2 đến 100 ký tự');
    const phone = term.replace(/[ .()-]/g, '');
    const exact = /^\+?[0-9]{9,15}$/.test(phone)
      ? phone.startsWith('0')
        ? '+84' + phone.slice(1)
        : phone.startsWith('84')
          ? '+' + phone
          : phone
      : '';
    const normal = term
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd');
    const c = await this.conn.db();
    try {
      const r = await c.query(
        `SELECT n.id,n.ho_ten AS ten_hien_thi FROM public.nguoi_dung n WHERE n.id<>$1 AND n.trang_thai='Đang hoạt động' AND (
      ($2<>'' AND CASE WHEN regexp_replace(n.so_dien_thoai,'[ .()-]','','g')~'^0[0-9]{9}$' THEN '+84'||substr(regexp_replace(n.so_dien_thoai,'[ .()-]','','g'),2) WHEN n.so_dien_thoai~'^84[0-9]{9}$' THEN '+'||n.so_dien_thoai ELSE n.so_dien_thoai END=$2)
      OR ($2='' AND position($3 in translate(lower(n.ho_ten),'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ','aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'))>0 AND (
        EXISTS(SELECT 1 FROM public.nguoi_dung_vai_tro nv JOIN public.vai_tro v ON v.id=nv.vai_tro_id WHERE nv.nguoi_dung_id=n.id AND nv.ngay_thu_hoi IS NULL AND v.ma_vai_tro IN ('Quản trị hệ thống','Quản lý','Chăm sóc khách hàng'))
        OR EXISTS(SELECT 1 FROM public.thanh_vien_tro_chuyen a JOIN public.thanh_vien_tro_chuyen b ON a.cuoc_tro_chuyen_id=b.cuoc_tro_chuyen_id WHERE a.nguoi_dung_id=$1 AND b.nguoi_dung_id=n.id)
      ))) ORDER BY n.ho_ten,n.id LIMIT 20`,
        [user.id, exact, normal],
      );
      return { nguoi_dung: r.rows };
    } finally {
      await c.end();
    }
  }
  async list(
    authorization?: string,
    token?: string,
    query = '',
    offset = 0,
    simple = false,
  ) {
    const user = await this.conn.identity(authorization),
      guestHash = this.guest(token);
    if (!user && !guestHash) throw new UnauthorizedException();
    if (
      query.length > 100 ||
      !Number.isInteger(offset) ||
      offset < 0 ||
      offset > 1000000
    )
      throw new BadRequestException('Bộ lọc hội thoại không hợp lệ');
    const c = await this.conn.db();
    try {
      const r = await c.query(
        `WITH eligible AS (
        SELECT t.*,h.ten_homestay,n.ho_ten,
        EXISTS(SELECT 1 FROM public.thanh_vien_tro_chuyen m WHERE m.cuoc_tro_chuyen_id=t.id AND m.nguoi_dung_id=$1) AS member,
        ($1::uuid IS NOT NULL AND t.loai='ho_tro' AND EXISTS(SELECT 1 FROM public.nguoi_dung_vai_tro nv JOIN public.vai_tro v ON v.id=nv.vai_tro_id WHERE nv.nguoi_dung_id=$1 AND nv.ngay_thu_hoi IS NULL AND (v.ma_vai_tro='Quản trị hệ thống' AND nv.homestay_id IS NULL OR v.ma_vai_tro IN ('Quản lý','Chăm sóc khách hàng') AND nv.homestay_id=t.homestay_id))) AS staff
        FROM public.cuoc_tro_chuyen t LEFT JOIN public.homestay h ON h.id=t.homestay_id LEFT JOIN public.nguoi_dung n ON n.id=t.khach_hang_id
      ), items AS (
        SELECT e.id,e.loai,e.trang_thai,e.ngay_cap_nhat,e.ten_homestay,
        CASE WHEN e.loai='truc_tiep' THEN COALESCE((SELECT n2.ho_ten FROM public.thanh_vien_tro_chuyen m JOIN public.nguoi_dung n2 ON n2.id=m.nguoi_dung_id WHERE m.cuoc_tro_chuyen_id=e.id AND m.nguoi_dung_id<>$1 LIMIT 1),'Người liên hệ')
        WHEN e.staff AND e.khach_hang_id IS DISTINCT FROM $1 THEN COALESCE(e.ho_ten,'Khách #'||lpad(e.ma_khach_chat::text,greatest(6,length(e.ma_khach_chat::text)),'0')) ELSE 'Hỗ trợ HomeStay' END AS ten_hien_thi,
        last.noi_dung AS tin_cuoi,last.ngay_gui AS tin_cuoi_luc,
        (SELECT count(*)::int FROM public.tin_nhan m WHERE m.cuoc_tro_chuyen_id=e.id AND
          CASE WHEN $1::uuid IS NOT NULL THEN m.nguoi_gui_id IS DISTINCT FROM $1 AND NOT(e.khach_hang_id IS NOT DISTINCT FROM $1 AND m.loai_nguoi_gui='Khách vãng lai') ELSE m.loai_nguoi_gui<>'Khách vãng lai' END
          AND (d.doc_den_luc IS NULL OR (m.ngay_gui,m.id)>(d.doc_den_luc,d.doc_den_id))) AS chua_doc
        FROM eligible e LEFT JOIN LATERAL(SELECT noi_dung,ngay_gui FROM public.tin_nhan WHERE cuoc_tro_chuyen_id=e.id ORDER BY ngay_gui DESC,id DESC LIMIT 1) last ON true
        LEFT JOIN public.trang_thai_doc_chat d ON d.cuoc_tro_chuyen_id=e.id AND d.khoa_nguoi_doc=$3
        WHERE (e.member OR e.staff OR ($2::text IS NOT NULL AND e.khach_vang_lai_hash=$2 AND (e.khach_hang_id IS NULL OR e.khach_hang_id=$1))) AND (NOT $6::boolean OR e.loai='ho_tro' AND (e.khach_hang_id=$1 OR e.khach_vang_lai_hash=$2))
      ), filtered AS(SELECT * FROM items WHERE $4='' OR position($4 in translate(lower(ten_hien_thi||' '||coalesce(ten_homestay,'')),'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ','aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'))>0), page AS(SELECT * FROM filtered ORDER BY coalesce(tin_cuoi_luc,ngay_cap_nhat) DESC,id DESC LIMIT 40 OFFSET $5)
      SELECT coalesce((SELECT jsonb_agg(p ORDER BY coalesce(p.tin_cuoi_luc,p.ngay_cap_nhat) DESC,p.id DESC) FROM page p),'[]') AS hoi_thoai,(SELECT count(*)::int FROM filtered) AS tong_so,coalesce((SELECT sum(chua_doc)::int FROM items),0) AS tong_chua_doc`,
        [
          user?.id || null,
          guestHash,
          user ? 'u:' + user.id : 'g:' + guestHash,
          query
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd'),
          offset,
          simple,
        ],
      );
      return { toi: user?.id || null, ...r.rows[0] };
    } finally {
      await c.end();
    }
  }
  async read(
    id: string,
    messageId: string,
    authorization?: string,
    token?: string,
  ) {
    this.conn.id(messageId);
    const user = await this.conn.identity(authorization),
      c = await this.conn.db();
    try {
      await this.access(c, id, user?.id, token);
      const key = user ? 'u:' + user.id : 'g:' + this.guest(token);
      const r = await c.query(
        `INSERT INTO public.trang_thai_doc_chat(cuoc_tro_chuyen_id,khoa_nguoi_doc,doc_den_luc,doc_den_id) SELECT $1,$2,ngay_gui,id FROM public.tin_nhan WHERE id=$3 AND cuoc_tro_chuyen_id=$1 ON CONFLICT(cuoc_tro_chuyen_id,khoa_nguoi_doc) DO UPDATE SET doc_den_luc=excluded.doc_den_luc,doc_den_id=excluded.doc_den_id WHERE (excluded.doc_den_luc,excluded.doc_den_id)>(trang_thai_doc_chat.doc_den_luc,trang_thai_doc_chat.doc_den_id) RETURNING doc_den_id`,
        [id, key, messageId],
      );
      if (!r.rowCount) {
        const exists = await c.query(
          'SELECT 1 FROM public.tin_nhan WHERE id=$1 AND cuoc_tro_chuyen_id=$2',
          [messageId, id],
        );
        if (!exists.rowCount)
          throw new BadRequestException('Tin nhắn không thuộc hội thoại');
      }
      return { ok: true };
    } finally {
      await c.end();
    }
  }
  async messages(
    id: string,
    authorization?: string,
    token?: string,
    before?: string,
    around?: string,
  ) {
    const user = await this.conn.identity(authorization),
      c = await this.conn.db();
    try {
      const { t: thread, staff } = await this.access(c, id, user?.id, token);
      if (before) this.conn.id(before);
      if (around) {
        this.conn.id(around);
        const anchor = await c.query(
          'SELECT 1 FROM public.tin_nhan WHERE id=$1 AND cuoc_tro_chuyen_id=$2',
          [around, id],
        );
        if (!anchor.rowCount)
          throw new BadRequestException('Tin không thuộc cuộc trò chuyện');
      }
      const r = await c.query(
        `SELECT t.id,t.nguoi_gui_id,t.loai_nguoi_gui,t.noi_dung,t.ngay_gui,COALESCE(n.ho_ten,t.loai_nguoi_gui) AS ten_nguoi_gui FROM public.tin_nhan t LEFT JOIN public.nguoi_dung n ON n.id=t.nguoi_gui_id WHERE t.cuoc_tro_chuyen_id=$1 AND ($2::uuid IS NULL OR (t.ngay_gui,t.id)<(SELECT ngay_gui,id FROM public.tin_nhan WHERE id=$2 AND cuoc_tro_chuyen_id=$1)) AND ($3::uuid IS NULL OR (t.ngay_gui,t.id)<=(SELECT ngay_gui,id FROM public.tin_nhan WHERE id=$3 AND cuoc_tro_chuyen_id=$1)) ORDER BY t.ngay_gui DESC,t.id DESC LIMIT 60`,
        [id, before || null, around || null],
      );
      const attachments = await c.query(
        'SELECT * FROM public.tep_tin_chat WHERE tin_nhan_id=ANY($1::uuid[])',
        [r.rows.map((m) => m.id)],
      );
      const signed = await Promise.all(
        attachments.rows.map((f) => this.signed(f)),
      );
      return {
        duoc_dung_mau: !!staff,
        toi: user?.id ?? null,
        tin_nhan: r.rows.reverse().map((m) => {
          const own = user
            ? m.nguoi_gui_id === user.id ||
              (thread.khach_hang_id === user.id &&
                m.loai_nguoi_gui === 'Khách vãng lai')
            : m.loai_nguoi_gui === 'Khách vãng lai';
          return {
            tep: signed.find((f) => f.tin_nhan_id === m.id) || null,
            id: m.id,
            nguoi_gui_id: m.nguoi_gui_id,
            noi_dung: m.noi_dung,
            ngay_gui: m.ngay_gui,
            cua_toi: own,
            ten_nguoi_gui: own
              ? 'Bạn'
              : thread.loai === 'ho_tro' && !staff
                ? 'Hỗ trợ HomeStay'
                : m.ten_nguoi_gui === 'Khách vãng lai'
                  ? 'Khách #' + String(thread.ma_khach_chat).padStart(6, '0')
                  : m.ten_nguoi_gui,
          };
        }),
        co_tin_cu: r.rows.length === 60,
      };
    } finally {
      await c.end();
    }
  }
  private readonly signedLinks = new Map<
    string,
    { url: string; until: number }
  >();
  private storage() {
    return chatStorage();
  }
  private async signed(file: StoredFile) {
    const { duong_dan, ...publicData } = file;
    const cached = this.signedLinks.get(duong_dan);
    if (cached && cached.until > Date.now())
      return { ...publicData, url: cached.url };
    const { data, error } = await this.storage().createSignedUrl(
      duong_dan,
      900,
      file.la_anh ? undefined : { download: file.ten_tep },
    );
    if (error || !data)
      throw new ServiceUnavailableException('Chưa tải được tệp đính kèm');
    if (this.signedLinks.size >= 1000)
      this.signedLinks.delete(this.signedLinks.keys().next().value!);
    this.signedLinks.set(duong_dan, {
      url: data.signedUrl,
      until: Date.now() + 600000,
    });
    return { ...publicData, url: data.signedUrl };
  }
  async upload(
    id: string,
    x: Record<string, unknown>,
    file: ChatFile | undefined,
    authorization?: string,
    token?: string,
  ) {
    const info = docTepChat(file);
    this.conn.id(String(x.ma_phia_khach || ''));
    const content = typeof x.noi_dung === 'string' ? x.noi_dung.trim() : '';
    if (content.length > 4000)
      throw new BadRequestException('Nội dung tối đa 4.000 ký tự');
    const user = await this.conn.identity(authorization),
      c = await this.conn.db();
    let uploaded = '',
      commitAttempted = false;
    try {
      await c.query('BEGIN');
      const { t, staff } = await this.access(c, id, user?.id, token);
      if (t.trang_thai !== 'Đang mở')
        throw new BadRequestException('Hội thoại đã đóng');
      await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,7))', [
        id,
      ]);
      const old = await c.query(
        'SELECT id FROM public.tin_nhan WHERE cuoc_tro_chuyen_id=$1 AND ma_phia_khach=$2',
        [id, x.ma_phia_khach],
      );
      if (old.rowCount) {
        await c.query('COMMIT');
        return { ok: true, id: old.rows[0].id };
      }
      const quota = await c.query(
        "SELECT count(*)::int AS n,coalesce(sum(dung_luong),0)::bigint AS bytes FROM public.tep_tin_chat WHERE cuoc_tro_chuyen_id=$1 AND ngay_tao>now()-interval '1 hour'",
        [id],
      );
      if (
        quota.rows[0].n >= 20 ||
        Number(quota.rows[0].bytes) + file!.size > 209715200
      )
        throw new BadRequestException(
          'Cuộc trò chuyện đạt giới hạn tệp trong giờ này. Vui lòng thử lại sau',
        );
      const message = randomUUID(),
        key = id + '/' + message + '.' + info.ext;
      const result = await this.storage().upload(key, file!.buffer, {
        contentType: info.mime,
        upsert: false,
      });
      if (result.error)
        throw new ServiceUnavailableException(
          'Tải tệp chưa thành công. Hãy thử lại',
        );
      uploaded = key;
      await c.query(
        'INSERT INTO public.tin_nhan(id,cuoc_tro_chuyen_id,nguoi_gui_id,loai_nguoi_gui,noi_dung,duong_dan_tep,ma_phia_khach) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [
          message,
          id,
          user?.id || null,
          user ? (staff ? 'Nhân viên' : 'Khách hàng') : 'Khách vãng lai',
          content || 'Đã gửi ' + (info.image ? 'ảnh: ' : 'tệp: ') + info.name,
          key,
          x.ma_phia_khach,
        ],
      );
      await c.query(
        'INSERT INTO public.tep_tin_chat(tin_nhan_id,cuoc_tro_chuyen_id,duong_dan,ten_tep,mime,dung_luong,la_anh) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [message, id, key, info.name, info.mime, file!.size, info.image],
      );
      await c.query(
        'UPDATE public.cuoc_tro_chuyen SET ngay_cap_nhat=now() WHERE id=$1',
        [id],
      );
      commitAttempted = true;
      await c.query('COMMIT');
      return { ok: true, id: message };
    } catch (e) {
      await c.query('ROLLBACK').catch(() => {});
      if (uploaded && !commitAttempted)
        await this.storage()
          .remove([uploaded])
          .catch(() => {});
      throw e;
    } finally {
      await c.end();
    }
  }
  async files(
    id: string,
    kind: string,
    query: string,
    offset: number,
    authorization?: string,
    token?: string,
  ) {
    if (
      !['anh', 'tep'].includes(kind) ||
      query.length > 100 ||
      !Number.isInteger(offset) ||
      offset < 0 ||
      offset > 1000000
    )
      throw new BadRequestException('Bộ lọc tệp không hợp lệ');
    const u = await this.conn.identity(authorization),
      c = await this.conn.db();
    try {
      await this.access(c, id, u?.id, token);
      const r = await c.query(
        'SELECT * FROM public.tep_tin_chat WHERE cuoc_tro_chuyen_id=$1 AND la_anh=$2 AND position(lower($3) in lower(ten_tep))>0 ORDER BY ngay_tao DESC,id DESC LIMIT 41 OFFSET $4',
        [id, kind === 'anh', query, offset],
      );
      return {
        tep: await Promise.all(r.rows.slice(0, 40).map((f) => this.signed(f))),
        con_tiep: r.rows.length > 40,
      };
    } finally {
      await c.end();
    }
  }
  async searchMessages(
    id: string,
    query: string,
    offset: number,
    authorization?: string,
    token?: string,
  ) {
    if (
      query.trim().length < 2 ||
      query.length > 100 ||
      !Number.isInteger(offset) ||
      offset < 0 ||
      offset > 1000000
    )
      throw new BadRequestException('Nhập từ 2 đến 100 ký tự');
    const u = await this.conn.identity(authorization),
      c = await this.conn.db();
    try {
      await this.access(c, id, u?.id, token);
      const r = await c.query(
        "SELECT m.id,m.noi_dung,m.ngay_gui FROM public.tin_nhan m WHERE m.cuoc_tro_chuyen_id=$1 AND (position(lower($2) in lower(coalesce(m.noi_dung,'')))>0 OR EXISTS(SELECT 1 FROM public.tep_tin_chat f WHERE f.tin_nhan_id=m.id AND position(lower($2) in lower(f.ten_tep))>0)) ORDER BY m.ngay_gui DESC,m.id DESC LIMIT 41 OFFSET $3",
        [id, query.trim(), offset],
      );
      return { tin_nhan: r.rows.slice(0, 40), con_tiep: r.rows.length > 40 };
    } finally {
      await c.end();
    }
  }
  async replies(id: string, authorization?: string, token?: string) {
    const u = await this.conn.identity(authorization);
    if (!u) throw new UnauthorizedException();
    const c = await this.conn.db();
    try {
      const { t, staff } = await this.access(c, id, u.id, token);
      if (!staff && !(await this.conn.staff(c, u.id, t.homestay_id)))
        throw new ForbiddenException(
          'Chỉ nhân viên hỗ trợ dùng câu trả lời mẫu',
        );
      const r = await c.query(
        'SELECT * FROM public.cau_tra_loi_mau WHERE hien AND (homestay_id IS NULL OR homestay_id=$1) ORDER BY thu_tu,id',
        [t.homestay_id],
      );
      const context = await c.query(
        'SELECT n.ho_ten,h.ten_homestay FROM public.cuoc_tro_chuyen t LEFT JOIN public.nguoi_dung n ON n.id=t.khach_hang_id LEFT JOIN public.homestay h ON h.id=t.homestay_id WHERE t.id=$1',
        [id],
      );
      return {
        mau: r.rows.map((m) => {
          let text = m.noi_dung
            .replace(
              /{{ten_khach}}/g,
              context.rows[0].ho_ten || '{{ten_khach}}',
            )
            .replace(
              /{{chi_nhanh}}/g,
              context.rows[0].ten_homestay || '{{chi_nhanh}}',
            );
          return {
            ...m,
            noi_dung_da_dien: text,
            du_gui_ngay: !/{{[^}]+}}/.test(text),
          };
        }),
      };
    } finally {
      await c.end();
    }
  }
  async send(
    id: string,
    x: Record<string, unknown>,
    authorization?: string,
    token?: string,
  ) {
    const content = typeof x.noi_dung === 'string' ? x.noi_dung.trim() : '';
    if (!content || content.length > 4000)
      throw new BadRequestException('Tin nhắn cần từ 1 đến 4.000 ký tự');
    const messageId = this.conn.id(String(x.ma_phia_khach || '')),
      user = await this.conn.identity(authorization),
      c = await this.conn.db();
    try {
      await c.query('BEGIN');
      const { t, staff } = await this.access(c, id, user?.id, token);
      if (t.trang_thai !== 'Đang mở')
        throw new BadRequestException('Hội thoại đã đóng');
      const r = await c.query(
        `INSERT INTO public.tin_nhan(cuoc_tro_chuyen_id,nguoi_gui_id,loai_nguoi_gui,noi_dung,ma_phia_khach) VALUES($1,$2,$3,$4,$5) ON CONFLICT(cuoc_tro_chuyen_id,ma_phia_khach) WHERE ma_phia_khach IS NOT NULL DO NOTHING RETURNING id`,
        [
          id,
          user?.id ?? null,
          user ? (staff ? 'Nhân viên' : 'Khách hàng') : 'Khách vãng lai',
          content,
          messageId,
        ],
      );
      if (r.rowCount)
        await c.query(
          'UPDATE public.cuoc_tro_chuyen SET ngay_cap_nhat=now() WHERE id=$1',
          [id],
        );
      await c.query('COMMIT');
      return { ok: true, id: r.rows[0]?.id };
    } catch (e) {
      await c.query('ROLLBACK');
      throw e;
    } finally {
      await c.end();
    }
  }
}

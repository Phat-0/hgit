import { Injectable, BadRequestException } from '@nestjs/common';
import { QuanTriService } from './quan-tri.service.js';
import { moDb, ngay } from './van-hanh.db.js';
export const LICH_SU_SQL = `WITH lich AS(
 SELECT id::text,'Hệ thống' AS nhom,nguoi_thuc_hien_id AS nguoi,hanh_dong,ten_bang,ban_ghi_id AS doi_tuong_id,ngay_tao,du_lieu_thay_doi AS du_lieu FROM public.nhat_ky_he_thong
 UNION ALL SELECT id::text,'Đăng nhập',nguoi_dung_id,ket_qua,'nguoi_dung',nguoi_dung_id,ngay_tao,jsonb_build_object('dia_chi_ip',dia_chi_ip,'thiet_bi',thiet_bi) FROM public.lich_su_dang_nhap
 UNION ALL SELECT id::text,'Đơn đặt phòng',nguoi_thuc_hien_id,hanh_dong,'dat_phong',dat_phong_id,ngay_tao,jsonb_build_object('truoc',du_lieu_cu,'sau',du_lieu_moi) FROM public.nhat_ky_don_dat_phong
 UNION ALL SELECT id::text,'Trạng thái đơn',nguoi_thay_doi_id,trang_thai_moi,'dat_phong',dat_phong_id,ngay_thay_doi,jsonb_build_object('truoc',trang_thai_cu,'sau',trang_thai_moi) FROM public.lich_su_dat_phong
 UNION ALL SELECT id::text,'Thu chi',nguoi_thuc_hien_id,hanh_dong,'so_thu_chi',thu_chi_id,ngay_tao,jsonb_build_object('truoc',du_lieu_cu,'sau',du_lieu_moi) FROM public.nhat_ky_thu_chi
 UNION ALL SELECT id::text,'AI',NULL,trang_thai,'cuoc_tro_chuyen',cuoc_tro_chuyen_id,ngay_tao,jsonb_build_object('ma_loi',ma_loi,'cong_cu',cong_cu,'thoi_gian_ms',thoi_gian_ms) FROM public.chatbot_tac_vu)
`;
const ACTIONS: Record<string, string> = {
  cho: 'Chờ AI trả lời',
  xong: 'AI đã trả lời',
  loi: 'AI trả lời bị lỗi',
  sua_tu_lich: 'Sửa thông tin đơn đặt phòng',
  xoa_khoi_lich: 'Hủy đơn khỏi lịch',
  het_han_giu_cho: 'Hết hạn giữ chỗ',
  nhan_don_sau_otp: 'Liên kết đơn sau xác minh điện thoại',
  xac_nhan: 'Xác nhận đơn',
  nhan_phong: 'Xác nhận nhận phòng',
  tra_phong: 'Xác nhận trả phòng',
  khong_nhan: 'Đánh dấu khách không đến',
  cho_xu_ly: 'Chờ AI trả lời',
  dang_chay: 'AI đang soạn câu trả lời',
  hoan_thanh: 'AI đã trả lời',
  that_bai: 'AI trả lời bị lỗi',
  bo_qua: 'Bỏ qua trả lời AI',
};
const OBJECTS: Record<string, string> = {
  phong: 'Phòng',
  loai_phong: 'Loại phòng',
  homestay: 'Chi nhánh',
  combo: 'Combo',
  dat_phong: 'Đơn',
  nguoi_dung: 'Tài khoản',
  ho_so_khach_hang: 'Hồ sơ khách',
  cong_viec_ve_sinh: 'Vệ sinh phòng',
  khuyen_mai: 'Voucher',
  so_thu_chi: 'Khoản thu chi',
  cuoc_tro_chuyen: 'Hội thoại',
  phan_tich_ai: 'Tóm tắt khách',
  vai_tro: 'Vai trò',
  cau_tra_loi_mau: 'Câu trả lời mẫu',
  chatbot_kien_thuc: 'Kiến thức chatbot',
  cau_hinh_trang_chu: 'Nội dung trang chủ',
  gia_lich_phong: 'Lịch giá phòng',
};
const FIELDS: Record<string, string> = {
  ma_dat_phong: 'Mã đơn',
  ten_loai: 'Tên loại phòng',
  ten_homestay: 'Tên chi nhánh',
  hinh_thuc_dat: 'Loại đặt',
  so_khach: 'Số khách',
  tong_tien: 'Tổng tiền',
  ghi_chu: 'Ghi chú',
  ten: 'Tên khoản',
  ma_khuyen_mai: 'Mã voucher',
  suc_chua: 'Sức chứa',
  trang_thai_van_hanh: 'Trạng thái phòng',
  ten_khach: 'Tên khách',
  ten_don: 'Tên đơn',
  ten_phong: 'Tên phòng',
  phong_id: 'Phòng',
  homestay_id: 'Chi nhánh',
  nhan_phong_luc: 'Nhận phòng',
  tra_phong_luc: 'Trả phòng',
  trang_thai: 'Trạng thái',
  trang_thai_thanh_toan: 'Thanh toán',
  tien_phong: 'Tiền phòng',
  tien_da_thanh_toan: 'Tiền đã thu',
  ho_ten: 'Họ tên',
  so_tien: 'Số tiền',
  noi_dung: 'Nội dung',
  gia_moi_gio: 'Giá giờ',
  gia_moi_dem: 'Giá đêm',
  gia_moi_ngay: 'Giá ngày',
  ma_phong: 'Mã phòng',
  ten_combo: 'Tên combo',
  gia_combo: 'Giá combo',
  ma_loi: 'Kết quả xử lý',
  cong_cu: 'Công cụ đã dùng',
  dia_chi_ip: 'Địa chỉ IP',
  thiet_bi: 'Thiết bị',
  thoi_gian_ms: 'Thời gian xử lý (ms)',
  quyen_trang: 'Quyền truy cập',
  vai_tro: 'Vai trò',
  chi_nhanh_ids: 'Chi nhánh được giao',
};
export function moTaLichSu(x: Record<string, any>) {
  const data = (anBiMat(x.du_lieu) as any) || {},
    old =
      typeof data.truoc === 'object'
        ? data.truoc || {}
        : { trang_thai: data.truoc },
    next =
      typeof data.sau === 'object' ? data.sau || {} : { trang_thai: data.sau };
  const name =
    x.ten_doi_tuong ||
    next.ma_dat_phong ||
    old.ma_dat_phong ||
    next.ma_phong ||
    old.ma_phong ||
    next.ten_combo ||
    old.ten_combo ||
    next.ten_homestay ||
    old.ten_homestay ||
    next.ten_loai ||
    old.ten_loai ||
    next.ten_phong ||
    old.ten_phong ||
    next.ho_ten ||
    old.ho_ten ||
    data.ten_khach ||
    data.ho_ten ||
    data.ten_phong;
  const type = OBJECTS[x.ten_bang] || x.ten_bang;
  const target =
    type +
    (name
      ? ' · ' + name
      : x.doi_tuong_id
        ? ' · #' + String(x.doi_tuong_id).slice(0, 8)
        : '');
  const action =
    x.nhom === 'Đăng nhập'
      ? 'Đăng nhập ' + String(x.hanh_dong).toLocaleLowerCase('vi')
      : x.nhom === 'Trạng thái đơn'
        ? 'Chuyển trạng thái đơn'
        : ACTIONS[x.hanh_dong] || x.hanh_dong;
  const keys = [...new Set([...Object.keys(old), ...Object.keys(next)])].filter(
    (k) =>
      !['id', 'ngay_cap_nhat', 'cau_hinh_gia_chot'].includes(k) &&
      JSON.stringify(old[k]) !== JSON.stringify(next[k]),
  );
  const changes = keys.length
    ? keys.map((k) => ({
        truong: FIELDS[k] || k.replaceAll('_', ' '),
        truoc: (k === 'phong_id' ? x.phong_truoc : null) ?? old[k] ?? null,
        sau: (k === 'phong_id' ? x.phong_sau : null) ?? next[k] ?? null,
      }))
    : Object.entries(data)
        .filter(([k]) => !['truoc', 'sau', 'truong_thay_doi'].includes(k))
        .map(([k, v]) => ({
          truong: FIELDS[k] || k.replaceAll('_', ' '),
          truoc: null,
          sau: v,
        }));
  const format = (key: string, value: any): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Có' : 'Không';
    if (typeof value === 'object')
      return Array.isArray(value)
        ? value
            .map((v) =>
              typeof v === 'object'
                ? String(
                    v.ho_ten || v.ten || v.ten_combo || 'Thông tin đã cập nhật',
                  )
                : String(v),
            )
            .join(', ')
        : Object.entries(value)
            .map(
              ([k, v]) =>
                (FIELDS[k] || k.replaceAll('_', ' ')) + ': ' + String(v),
            )
            .join('; ');
    if (
      /^(tien_|tong_tien|gia_|so_tien|don_gia)/.test(key) &&
      Number.isFinite(Number(value))
    )
      return Number(value).toLocaleString('vi-VN') + ' ₫';
    if (/_luc$|^ngay_/.test(key) && !Number.isNaN(Date.parse(String(value))))
      return new Date(value).toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
      });
    return String(value);
  };
  const rows = changes.map((c: any) => ({
    ...c,
    truoc_hien: format(
      Object.keys(FIELDS).find((k) => FIELDS[k] === c.truong) || c.truong,
      c.truoc,
    ),
    sau_hien: format(
      Object.keys(FIELDS).find((k) => FIELDS[k] === c.truong) || c.truong,
      c.sau,
    ),
  }));
  const summary = rows
    .slice(0, 3)
    .map(
      (c) =>
        c.truong +
        ': ' +
        (c.truoc === null
          ? c.sau_hien
          : c.sau === null
            ? 'bỏ ' + c.truoc_hien
            : c.truoc_hien + ' → ' + c.sau_hien),
    )
    .join(' · ');
  return {
    ...x,
    du_lieu: data,
    thao_tac: action,
    doi_tuong: target,
    thay_doi: rows,
    tom_tat: summary,
    nguoi_thuc_hien:
      x.nguoi_thuc_hien ||
      (x.nhom === 'AI'
        ? 'Trợ lý AI'
        : x.nhom === 'Đăng nhập'
          ? 'Khách chưa xác thực'
          : 'Ứng dụng / chưa ghi người'),
  };
}
export function anBiMat(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(anBiMat);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .filter(
          ([k]) =>
            !/(token|password|mat.?khau|api.?key|secret|authorization)/i.test(
              k,
            ),
        )
        .map(([k, v]) => [k, anBiMat(v)]),
    );
  return value;
}
@Injectable()
export class LichSuService {
  constructor(private readonly admin: QuanTriService) {}
  private db() {
    return moDb();
  }
  async list(uid: string, q: Record<string, string>) {
    await this.admin.kiemTraQuanTri(uid);
    const from = ngay(q.tu, '2000-01-01'),
      to = ngay(q.den, '2100-01-01'),
      page = Number(q.trang || 1);
    if (from > to || !Number.isInteger(page) || page < 1 || page > 100000)
      throw new BadRequestException('Bộ lọc không hợp lệ');
    const c = await this.db();
    try {
      const r = await c.query(
        LICH_SU_SQL +
          `SELECT l.*,n.ho_ten AS nguoi_thuc_hien,
 coalesce(CASE WHEN d.id IS NOT NULL THEN concat_ws(' · ',d.ma_dat_phong,coalesce(du.ho_ten,d.ten_don),dp.ma_phong) END,p.ma_phong,h.ten_homestay,lp.ten_loai,co.ten_combo,u.ho_ten,k.ma_khuyen_mai,vp.ma_phong,cu.ho_ten,pr.thong_tin_bo_sung->>'ten_khach',rv.ma_vai_tro,sc.ten,ct.tieu_de,kt.tieu_de) AS ten_doi_tuong,
 pt.ma_phong AS phong_truoc,ps.ma_phong AS phong_sau,count(*) OVER()::int AS tong_so FROM lich l LEFT JOIN public.nguoi_dung n ON n.id=l.nguoi
 LEFT JOIN public.dat_phong d ON l.ten_bang='dat_phong' AND d.id=l.doi_tuong_id
 LEFT JOIN public.nguoi_dung du ON du.id=d.nguoi_dung_id LEFT JOIN public.phong dp ON dp.id=d.phong_id
 LEFT JOIN public.phong pt ON pt.id::text=l.du_lieu->'truoc'->>'phong_id'
 LEFT JOIN public.phong ps ON ps.id::text=l.du_lieu->'sau'->>'phong_id'
 LEFT JOIN public.phong p ON l.ten_bang='phong' AND p.id=l.doi_tuong_id
 LEFT JOIN public.homestay h ON l.ten_bang='homestay' AND h.id=l.doi_tuong_id
 LEFT JOIN public.loai_phong lp ON l.ten_bang='loai_phong' AND lp.id=l.doi_tuong_id
 LEFT JOIN public.combo co ON l.ten_bang='combo' AND co.id=l.doi_tuong_id
 LEFT JOIN public.nguoi_dung u ON l.ten_bang='nguoi_dung' AND u.id=l.doi_tuong_id
 LEFT JOIN public.khuyen_mai k ON l.ten_bang='khuyen_mai' AND k.id=l.doi_tuong_id
 LEFT JOIN public.cong_viec_ve_sinh v ON l.ten_bang='cong_viec_ve_sinh' AND v.id=l.doi_tuong_id LEFT JOIN public.phong vp ON vp.id=v.phong_id
 LEFT JOIN public.cuoc_tro_chuyen t ON l.ten_bang='cuoc_tro_chuyen' AND t.id=l.doi_tuong_id LEFT JOIN public.nguoi_dung cu ON cu.id=t.khach_hang_id
 LEFT JOIN public.ho_so_khach_hang pr ON l.ten_bang='ho_so_khach_hang' AND pr.id=l.doi_tuong_id
 LEFT JOIN public.so_thu_chi sc ON l.ten_bang='so_thu_chi' AND sc.id=l.doi_tuong_id
 LEFT JOIN public.cau_tra_loi_mau ct ON l.ten_bang='cau_tra_loi_mau' AND ct.id=l.doi_tuong_id
 LEFT JOIN public.chatbot_kien_thuc kt ON l.ten_bang='chatbot_kien_thuc' AND kt.id=l.doi_tuong_id
 LEFT JOIN public.vai_tro rv ON l.ten_bang='vai_tro' AND rv.id=l.doi_tuong_id
 WHERE l.ngay_tao>=$1::date AT TIME ZONE 'Asia/Ho_Chi_Minh' AND l.ngay_tao<($2::date+1) AT TIME ZONE 'Asia/Ho_Chi_Minh' AND ($3='' OR l.nhom=$3)
 AND ($4='' OR lower(l.hanh_dong||' '||coalesce(n.ho_ten,'')||' '||coalesce(CASE WHEN d.id IS NOT NULL THEN concat_ws(' · ',d.ma_dat_phong,coalesce(du.ho_ten,d.ten_don),dp.ma_phong) END,p.ma_phong,h.ten_homestay,lp.ten_loai,co.ten_combo,u.ho_ten,k.ma_khuyen_mai,vp.ma_phong,cu.ho_ten,rv.ma_vai_tro,sc.ten,ct.tieu_de,kt.tieu_de,'')||' '||coalesce(l.du_lieu::text,'')) LIKE '%'||lower($4)||'%') ORDER BY l.ngay_tao DESC,l.nhom,l.id LIMIT 50 OFFSET $5`,
        [from, to, q.nhom || '', (q.tim || '').slice(0, 150), (page - 1) * 50],
      );
      return {
        dong: r.rows.map(moTaLichSu),
        tong_so: r.rows[0]?.tong_so || 0,
      };
    } finally {
      await c.end();
    }
  }
}

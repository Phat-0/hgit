import { BadRequestException, Injectable } from '@nestjs/common';
import {
  KetNoiKhachService,
  UUID_KHACH,
} from '../khach-hang/ket-noi.service.js';
import { TrangKhachService } from '../khach-hang/trang-khach.service.js';
import type { Tool } from './gemini.js';
const str = { type: 'STRING' };
const schema = (
  properties: Record<string, unknown>,
  required: string[] = [],
) => ({ type: 'OBJECT', properties, required });
const time = {
  bat_dau: {
    ...str,
    description: 'ISO 8601 có múi giờ +07:00, phải hỏi khách nếu chưa rõ',
  },
  ket_thuc: { ...str, description: 'ISO 8601 có múi giờ +07:00' },
  hinh_thuc_dat: {
    type: 'STRING',
    enum: ['Theo giờ', 'Theo ngày', 'Theo đêm'],
  },
};
export const BOT_TOOLS: Tool[] = [
  {
    name: 'ghi_nhu_cau',
    description:
      'Ghi bản nháp tóm tắt nhu cầu khách đã nói rõ; không suy đoán thông tin nhạy cảm hoặc cập nhật hồ sơ thật. Chỉ ghi khi khách đã cung cấp nhu cầu.',
    parameters: schema(
      {
        tom_tat: str,
        so_khach: { type: 'INTEGER' },
        ngan_sach: { type: 'NUMBER' },
        loai_dat: {
          type: 'STRING',
          enum: ['Theo giờ', 'Theo ngày', 'Theo đêm'],
        },
        mong_muon: { type: 'ARRAY', items: str },
      },
      ['tom_tat'],
    ),
  },
  {
    name: 'xem_danh_muc',
    description:
      'Thông tin công khai các chi nhánh, phòng, giá cơ bản, tiện nghi; không xác nhận còn trống. Giá chính xác phải dùng báo giá.',
    parameters: schema({}),
  },
  {
    name: 'tra_kien_thuc',
    description:
      'Tra chính sách, FAQ, dịch vụ đã được quản trị xuất bản. Không có kết quả thì hỏi lại hoặc chuyển nhân viên.',
    parameters: schema({ tu_khoa: str }, ['tu_khoa']),
  },
  {
    name: 'tim_phong_trong',
    description:
      'Kiểm tra phòng trống cho thời gian và loại đặt cụ thể; kết quả chỉ có hiệu lực lúc tra cứu.',
    parameters: schema({ ...time, chi_nhanh_id: str }, [
      'bat_dau',
      'ket_thuc',
      'hinh_thuc_dat',
    ]),
  },
  {
    name: 'bao_gia_phong',
    description:
      'Tính tổng tiền chính xác bởi hệ thống, kiểm tra phòng trống và các combo; không giữ chỗ hoặc tạo đơn.',
    parameters: schema(
      { ...time, phong_id: str, combo_ids: { type: 'ARRAY', items: str } },
      ['bat_dau', 'ket_thuc', 'hinh_thuc_dat', 'phong_id'],
    ),
  },
  {
    name: 'xem_combo',
    description: 'Tra combo phù hợp khoảng thời gian, loại đặt và chi nhánh.',
    parameters: schema({ ...time, chi_nhanh_id: str }, [
      'bat_dau',
      'ket_thuc',
      'hinh_thuc_dat',
    ]),
  },
  {
    name: 'chuyen_nhan_vien',
    description:
      'Chuyển nhân viên khi khách yêu cầu, khiếu nại, thanh toán, hủy/đổi đơn hoặc thiếu dữ liệu đáng tin cậy.',
    parameters: schema({ ly_do: str }, ['ly_do']),
  },
];
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
export function rankKnowledge(
  rows: { id: string; tieu_de: string; noi_dung: string }[],
  query: string,
) {
  const terms = [
    ...new Set(
      normalize(query)
        .split(/[^a-z0-9]+/)
        .filter((x) => x.length > 1),
    ),
  ].slice(0, 20);
  return rows
    .map((r) => ({
      r,
      score: terms.reduce(
        (sum, t) =>
          sum +
          (normalize(r.tieu_de).includes(t) ? 3 : 0) +
          (normalize(r.noi_dung).includes(t) ? 1 : 0),
        0,
      ),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((x) => x.r);
}
@Injectable()
export class ChatbotCongCu {
  constructor(
    private readonly conn: KetNoiKhachService,
    private readonly guest: TrangKhachService,
  ) {}
  async run(
    name: string,
    args: Record<string, unknown>,
    branch: string | null,
    allowedSources?: string[],
  ) {
    const tool = BOT_TOOLS.find((t) => t.name === name);
    if (!tool) throw new BadRequestException('Công cụ không được phép');
    const props = tool.parameters.properties as Record<string, unknown>,
      required = tool.parameters.required as string[];
    if (
      Object.keys(args).some((k) => !Object.hasOwn(props, k)) ||
      required.some((k) => !args[k])
    )
      throw new BadRequestException('Thiếu hoặc thừa tham số');
    for (const [k, v] of Object.entries(args)) {
      if (k === 'combo_ids') {
        if (
          !Array.isArray(v) ||
          v.length > 10 ||
          v.some((x) => typeof x !== 'string' || !UUID_KHACH.test(x))
        )
          throw new BadRequestException('Combo không hợp lệ');
      } else if (
        name === 'ghi_nhu_cau' &&
        (k === 'so_khach' || k === 'ngan_sach' || k === 'mong_muon')
      )
        continue;
      else if (typeof v !== 'string' || v.length > 500)
        throw new BadRequestException('Tham số không hợp lệ');
    }
    if (branch && args.chi_nhanh_id && args.chi_nhanh_id !== branch)
      return {
        loi: 'Hội thoại thuộc chi nhánh khác; cần nhân viên hỗ trợ đổi chi nhánh.',
      };
    if (name === 'ghi_nhu_cau') {
      if (
        args.so_khach !== undefined &&
        (!Number.isInteger(args.so_khach) ||
          Number(args.so_khach) < 1 ||
          Number(args.so_khach) > 100)
      )
        throw new BadRequestException('Số khách không hợp lệ');
      if (
        args.ngan_sach !== undefined &&
        (typeof args.ngan_sach !== 'number' ||
          !Number.isFinite(args.ngan_sach) ||
          args.ngan_sach < 0 ||
          args.ngan_sach > 100000000)
      )
        throw new BadRequestException('Ngân sách không hợp lệ');
      if (
        args.loai_dat !== undefined &&
        !['Theo giờ', 'Theo ngày', 'Theo đêm'].includes(String(args.loai_dat))
      )
        throw new BadRequestException('Loại đặt không hợp lệ');
      if (
        args.mong_muon !== undefined &&
        (!Array.isArray(args.mong_muon) ||
          args.mong_muon.length > 10 ||
          args.mong_muon.some((x) => typeof x !== 'string' || x.length > 100))
      )
        throw new BadRequestException('Mong muốn không hợp lệ');
      return { trang_thai: 'Bản nháp AI — cần nhân viên đối chiếu', ...args };
    }
    if (name === 'chuyen_nhan_vien') return { da_yeu_cau: true };
    if (name === 'tra_kien_thuc') {
      const c = await this.conn.db();
      try {
        return rankKnowledge(
          (
            await c.query(
              "SELECT id,tieu_de,noi_dung FROM public.chatbot_kien_thuc WHERE xuat_ban AND tieu_de NOT LIKE 'Tình huống: %' AND ($1::uuid[] IS NULL OR id=ANY($1::uuid[])) ORDER BY ngay_sua DESC LIMIT 300",
              [allowedSources ?? null],
            )
          ).rows,
          String(args.tu_khoa),
        );
      } finally {
        await c.end();
      }
    }
    if (name === 'xem_danh_muc') {
      const c = await this.guest.catalog();
      return {
        chi_nhanh: c.chi_nhanh.filter((p) => !branch || p.id === branch),
        phong: c.phong
          .filter((p) => !branch || p.homestay_id === branch)
          .slice(0, 40)
          .map(({ anh, anh_chon, luot_dat, ...p }) => p),
        ghi_chu:
          'Giá cơ bản; chưa kiểm tra phòng trống, không phải báo giá cuối cùng.',
        khung_gio: await this.guest.options(),
      };
    }
    for (const k of ['bat_dau', 'ket_thuc'])
      if (
        typeof args[k] !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(String(args[k]))
      )
        throw new BadRequestException('Thời gian cần ISO có múi giờ');
    const x = { ...args, ...(branch ? { chi_nhanh_id: branch } : {}) };
    try {
      if (name === 'tim_phong_trong')
        return {
          kiem_tra_luc: new Date().toISOString(),
          phong: (await this.guest.rooms(x))
            .slice(0, 10)
            .map(({ anh, ...p }) => p),
        };
      if (name === 'xem_combo')
        return (await this.guest.featuredCombos(x))
          .slice(0, 20)
          .map(({ anh, ...p }) => p);
      if (name === 'bao_gia_phong') {
        if (branch) {
          const c = await this.conn.db();
          try {
            if (
              !(
                await c.query(
                  'SELECT 1 FROM public.phong WHERE id=$1 AND homestay_id=$2',
                  [this.conn.id(String(args.phong_id)), branch],
                )
              ).rowCount
            )
              throw new BadRequestException('Phòng không thuộc chi nhánh');
          } finally {
            await c.end();
          }
        }
        return {
          ...(await this.guest.quote(x)),
          kiem_tra_luc: new Date().toISOString(),
          giu_cho: false,
        };
      }
    } catch (e) {
      if (e instanceof BadRequestException) return { loi: e.message };
      throw e;
    }
    throw new BadRequestException('Công cụ không hợp lệ');
  }
}

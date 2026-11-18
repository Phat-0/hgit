import { BadRequestException } from '@nestjs/common';
export type CachTraLoi = {
  cau_hoi_mau: string[];
  tu_khoa: string[];
  tra_loi: string;
  nguon_ids?: string[];
};
export type DieuKien = {
  cau_hoi_mau: string[];
  tu_khoa: string[];
  kieu_khop: 'bat_ky' | 'tat_ca';
  uu_tien: number;
  cac_tra_loi?: CachTraLoi[];
  suy_nghi_sau?: boolean;
  nguon_ids?: string[];
};
export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b(?:chi phi|gia tien|price|cost)\b/g, 'gia')
    .replace(/\b(?:check in|checkin)\b/g, 'nhan phong')
    .replace(/\b(?:check out|checkout)\b/g, 'tra phong')
    .replace(/\b(?:booking|thue phong)\b/g, 'dat phong');
export function parseCondition(value: unknown): DieuKien {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new BadRequestException('Điều kiện tình huống không hợp lệ');
  const x = value as Record<string, unknown>;
  if (
    Object.keys(x).some(
      (k) =>
        ![
          'cau_hoi_mau',
          'tu_khoa',
          'kieu_khop',
          'uu_tien',
          'cac_tra_loi',
          'suy_nghi_sau',
          'nguon_ids',
        ].includes(k),
    )
  )
    throw new BadRequestException('Trường điều kiện không hợp lệ');
  function list(v: unknown, max: number) {
    if (v === undefined) return [];
    if (
      !Array.isArray(v) ||
      v.length > 20 ||
      v.some(
        (t) => typeof t !== 'string' || !normalize(t) || t.trim().length > max,
      )
    )
      throw new BadRequestException(
        'Tối đa 20 câu hỏi/từ khóa, không được để dòng trống',
      );
    return [...new Set((v as string[]).map((t) => t.trim()))];
  }
  const mode = x.kieu_khop ?? 'bat_ky',
    priority = x.uu_tien ?? 0;
  if (
    !['bat_ky', 'tat_ca'].includes(String(mode)) ||
    !Number.isInteger(priority) ||
    Number(priority) < 0 ||
    Number(priority) > 100
  )
    throw new BadRequestException('Cách khớp hoặc ưu tiên không hợp lệ');
  function sourceIds(v: unknown) {
    if (v === undefined) return undefined;
    if (
      !Array.isArray(v) ||
      v.length > 10 ||
      v.some(
        (id) =>
          typeof id !== 'string' ||
          !/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(
            id,
          ) ||
          id.length !== 36,
      )
    )
      throw new BadRequestException('Tối đa 10 nguồn tài liệu có mã hợp lệ');
    return [...new Set(v as string[])];
  }
  let answers: CachTraLoi[] | undefined;
  if (x.cac_tra_loi !== undefined) {
    if (!Array.isArray(x.cac_tra_loi) || x.cac_tra_loi.length > 10)
      throw new BadRequestException('Tối đa 10 cách trả lời trong một nhóm');
    answers = x.cac_tra_loi.map((raw) => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        throw new BadRequestException('Cách trả lời không hợp lệ');
      const item = raw as Record<string, unknown>;
      if (
        Object.keys(item).some(
          (k) =>
            !['cau_hoi_mau', 'tu_khoa', 'tra_loi', 'nguon_ids'].includes(k),
        )
      )
        throw new BadRequestException('Trường câu trả lời không hợp lệ');
      const questions = list(item.cau_hoi_mau, 200),
        keywords = list(item.tu_khoa, 80);
      if (!questions.length && !keywords.length)
        throw new BadRequestException(
          'Mỗi cách trả lời cần câu hỏi mẫu hoặc từ khóa',
        );
      if (
        typeof item.tra_loi !== 'string' ||
        !item.tra_loi.trim() ||
        item.tra_loi.trim().length > 1000
      )
        throw new BadRequestException(
          'Nội dung mỗi cách trả lời cần 1–1.000 ký tự',
        );
      return {
        cau_hoi_mau: questions,
        tu_khoa: keywords,
        tra_loi: item.tra_loi.trim(),
        ...(item.nguon_ids !== undefined
          ? { nguon_ids: sourceIds(item.nguon_ids) }
          : {}),
      };
    });
  }
  if (x.suy_nghi_sau !== undefined && typeof x.suy_nghi_sau !== 'boolean')
    throw new BadRequestException('Chế độ suy nghĩ không hợp lệ');
  const sources = sourceIds(x.nguon_ids);
  return {
    ...(x.suy_nghi_sau !== undefined
      ? { suy_nghi_sau: x.suy_nghi_sau as boolean }
      : {}),
    ...(sources ? { nguon_ids: sources } : {}),
    cau_hoi_mau: list(x.cau_hoi_mau, 200),
    tu_khoa: list(x.tu_khoa, 80),
    kieu_khop: mode as DieuKien['kieu_khop'],
    uu_tien: Number(priority),
    ...(answers ? { cac_tra_loi: answers } : {}),
  };
}
const stop = new Set(
  'toi minh ban cho xin co khong nhe la thi o a va muon can'.split(' '),
);
const terms = (s: string) => [
  ...new Set(
    normalize(s)
      .split(' ')
      .filter((t) => t.length > 1 && !stop.has(t)),
  ),
];
export type TinhHuong = {
  id?: string;
  tieu_de: string;
  noi_dung: string;
  dieu_kien?: unknown;
};
/** Matching only selects trusted admin guidance; it never changes tool permissions or bookings. */
export function matchSituations(rows: TinhHuong[], question: string) {
  const expanded = rows.flatMap((row) => {
    try {
      const rule = parseCondition(row.dieu_kien || {});
      return [
        { ...row, groupKey: row.id || row.tieu_de, isVariant: false },
        ...(rule.cac_tra_loi || []).map((item, index) => ({
          ...row,
          groupKey: row.id || row.tieu_de,
          isVariant: true,
          tieu_de: row.tieu_de + ' / Cách trả lời ' + (index + 1),
          noi_dung:
            row.noi_dung + '\nHướng dẫn cho cách hỏi đã khớp:\n' + item.tra_loi,
          dieu_kien: {
            cau_hoi_mau: item.cau_hoi_mau,
            tu_khoa: item.tu_khoa,
            kieu_khop: rule.kieu_khop,
            uu_tien: rule.uu_tien,
            suy_nghi_sau: rule.suy_nghi_sau,
            nguon_ids: item.nguon_ids || rule.nguon_ids,
          },
        })),
      ];
    } catch {
      return [];
    }
  });
  const query = normalize(question),
    padded = ' ' + query + ' ',
    words = new Set(terms(question));
  const matches = expanded
    .map((row) => {
      let rule: DieuKien;
      try {
        rule = parseCondition(row.dieu_kien || {});
      } catch {
        return null;
      }
      const configured = !!(rule.tu_khoa.length || rule.cau_hoi_mau.length);
      const hits = rule.tu_khoa.filter((k) =>
        padded.includes(' ' + normalize(k) + ' '),
      );
      const keywordMatch =
        rule.tu_khoa.length > 0 &&
        (rule.kieu_khop === 'tat_ca'
          ? hits.length === rule.tu_khoa.length
          : hits.length > 0);
      const sampleScore = rule.cau_hoi_mau.reduce((best, sample) => {
        const normalized = normalize(sample);
        if (normalized === query) return 100;
        const keys = terms(sample),
          count = keys.filter((t) => words.has(t)).length;
        return Math.max(
          best,
          keys.length >= 2 && count >= 2 && count / keys.length >= 0.7
            ? Math.round((count / keys.length) * 80)
            : 0,
        );
      }, 0);
      if (configured && !keywordMatch && !sampleScore) return null;
      return {
        row,
        configured,
        priority: rule.uu_tien,
        score:
          sampleScore + hits.reduce((sum, k) => sum + terms(k).length * 10, 0),
        ly_do: keywordMatch
          ? 'Từ khóa: ' + hits.join(', ')
          : sampleScore
            ? 'Gần câu hỏi mẫu'
            : 'Hướng dẫn chung',
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
  const childGroups = new Set(
    matches
      .filter((x) => x.row.isVariant && x.configured)
      .map((x) => x.row.groupKey),
  );
  const relevant = matches.filter(
    (x) => x.row.isVariant || !childGroups.has(x.row.groupKey),
  );
  const selected = relevant.some((x) => x.configured)
    ? relevant.filter((x) => x.configured)
    : relevant;
  return selected
    .sort(
      (a, b) =>
        b.priority - a.priority ||
        b.score - a.score ||
        a.row.tieu_de.localeCompare(b.row.tieu_de, 'vi'),
    )
    .slice(0, selected.some((x) => x.configured) ? 3 : 20);
}

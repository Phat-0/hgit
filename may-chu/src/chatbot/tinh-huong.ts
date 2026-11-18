import { BadRequestException } from '@nestjs/common';
export type DieuKien = {
  cau_hoi_mau: string[];
  tu_khoa: string[];
  kieu_khop: 'bat_ky' | 'tat_ca';
  uu_tien: number;
};
export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
export function parseCondition(value: unknown): DieuKien {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new BadRequestException('Điều kiện tình huống không hợp lệ');
  const x = value as Record<string, unknown>;
  if (
    Object.keys(x).some(
      (k) => !['cau_hoi_mau', 'tu_khoa', 'kieu_khop', 'uu_tien'].includes(k),
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
  return {
    cau_hoi_mau: list(x.cau_hoi_mau, 200),
    tu_khoa: list(x.tu_khoa, 80),
    kieu_khop: mode as DieuKien['kieu_khop'],
    uu_tien: Number(priority),
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
  const query = normalize(question),
    padded = ' ' + query + ' ',
    words = new Set(terms(question));
  const matches = rows
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
  const selected = matches.some((x) => x.configured)
    ? matches.filter((x) => x.configured)
    : matches;
  return selected
    .sort(
      (a, b) =>
        b.priority - a.priority ||
        b.score - a.score ||
        a.row.tieu_de.localeCompare(b.row.tieu_de, 'vi'),
    )
    .slice(0, selected.some(x=>x.configured)?3:20);
}

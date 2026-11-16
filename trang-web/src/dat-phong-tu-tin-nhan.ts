export type LichTuTinNhan = { start: string; end: string; kind: 'ngay' | 'dem'; guests?: number };

/** Only complete, explicit date ranges trigger a preview; never creates a booking. */
export function lichTuTinNhan(text: string, now = new Date()): LichTuTinNhan | null {
  const dates = [...text.matchAll(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/g)];
  if (dates.length !== 2 || /theo giờ|theo gio|\d{1,2}:\d{2}/i.test(text)) return null;
  const parsed = dates.map(m => {
    const day = Number(m[1]), month = Number(m[2]), year = Number(m[3] || now.getFullYear());
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
      ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
  });
  if (!parsed[0] || !parsed[1] || parsed[1] <= parsed[0]) return null;
  const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  if (parsed[0] < today) return null;
  const guest = text.match(/\b(\d{1,2})\s*(?:khách|người|nguoi|khach)/i);
  return { start: parsed[0], end: parsed[1], kind: /qua đêm|theo đêm|qua dem|theo dem/i.test(text) ? 'dem' : 'ngay', ...(guest && Number(guest[1]) > 0 ? { guests: Number(guest[1]) } : {}) };
}

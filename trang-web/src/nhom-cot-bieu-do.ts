export type DiemBieuDo = {
  id: string;
  ten: string;
  value: number | null;
  unit?: string;
  calc?: string;
  category?: string;
  branch?: string;
  objectKey?: string;
  objectName?: string;
  seriesKey?: string;
  seriesName?: string;
  periodKey?: string;
  periodName?: string;
  days?: string[];
};
export const khoaGiaTri = (p: DiemBieuDo) => p.seriesKey || p.id;
export function boTriCot(
  points: DiemBieuDo[],
  sort = "",
  series = [...new Set(points.map(khoaGiaTri))],
  objectOrder=[...new Set(points.map(p=>p.objectKey||p.id))],
) {
  const byObject = new Map<
    string,
    { key: string; ten: string; points: DiemBieuDo[] }
  >();
  for (const p of points) {
    const key = p.objectKey || p.id;
    if (!byObject.has(key))
      byObject.set(key, { key, ten: p.objectName || p.ten, points: [] });
    byObject.get(key)!.points.push(p);
  }
  const objects = [...byObject.values()].sort((a, b) =>
    sort === "az" || sort === "za"
      ? (sort === "za" ? -1 : 1) *
        a.ten.localeCompare(b.ten, "vi", { numeric: true })
      : sort === "asc" || sort === "desc"
        ? (sort === "desc" ? -1 : 1) *
          (a.points.reduce((s, p) => s + (p.value || 0), 0) -
            b.points.reduce((s, p) => s + (p.value || 0), 0))
        : objectOrder.indexOf(a.key)-objectOrder.indexOf(b.key),
  );
  const bars: { point: DiemBieuDo; x: number; center: number; labelOffset:number }[] = [],
    labels: { key: string; ten: string; x: number; branch?: string }[] = [],
    periods: { key: string; ten: string; x: number }[] = [];
  let cursor = 65;
  for (const object of objects) {
    const start = cursor;
    const groups = new Map<string, DiemBieuDo[]>();
    for (const p of object.points) {
      const key = p.periodKey || "chung";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(p);
    }
    for (const [key, ps] of groups) {
      ps.sort(
        (a, b) => series.indexOf(khoaGiaTri(a)) - series.indexOf(khoaGiaTri(b)),
      );
      const width = Math.max(72, ps.length * 32 + 16);
      ps.forEach((point, i) =>
        bars.push({
          point,
          x: cursor + 8 + i * 32,
          center: cursor + 20 + i * 32,
          labelOffset: (i % 2) * 12,
        }),
      );
      if (key !== "chung")
        periods.push({
          key: object.key + ":" + key,
          ten: ps[0].periodName || key,
          x: cursor + width / 2,
        });
      cursor += width + 10;
    }
    labels.push({
      key: object.key,
      ten: object.ten,
      x: (start + cursor - 10) / 2,
      branch: object.points[0].branch,
    });
    cursor += 22;
  }
  return { bars, labels, periods, width: Math.max(620, cursor + 20) };
}
export function nhomNutAnHien(points: DiemBieuDo[], pie = false) {
  const groups = new Map<
    string,
    { key: string; ten: string; points: DiemBieuDo[] }
  >();
  for (const p of points) {
    const key =
      (p.objectKey || (pie ? "time" : p.id)) +
      "|" +
      (p.seriesKey || (pie ? "pie" : p.id));
    if (!groups.has(key))
      groups.set(key, {
        key,
        ten: [p.objectName, p.seriesName].filter(Boolean).join(" · ") || p.ten,
        points: [],
      });
    groups.get(key)!.points.push(p);
  }
  const objects = [
    ...new Set(points.map((p) => p.objectKey || (pie ? "time" : p.id))),
  ];
  return [...groups.values()].sort(
    (a, b) =>
      objects.indexOf(
        a.points[0].objectKey || (pie ? "time" : a.points[0].id),
      ) -
      objects.indexOf(b.points[0].objectKey || (pie ? "time" : b.points[0].id)),
  );
}

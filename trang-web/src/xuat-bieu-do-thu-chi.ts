import { taiTep, csvThuChi } from "./xuat-so-thu-chi";
type Nhom = { label: string; thu: number; chi: number };
const esc = (s: unknown) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
export function xuatBieuDoThuChi(
  data: Nhom[],
  income: string,
  expense: string,
  percent: boolean,
  format: "svg" | "csv",
) {
  income = /^#[0-9a-f]{6}$/i.test(income) ? income : "#42b69a";
  expense = /^#[0-9a-f]{6}$/i.test(expense) ? expense : "#b16bd4";
  const thu = data.reduce((s, d) => s + d.thu, 0),
    chi = data.reduce((s, d) => s + d.chi, 0),
    total = thu + chi,
    max = Math.max(1, ...data.map((d) => Math.max(d.thu, d.chi)));
  const value = (n: number) =>
    percent
      ? (total ? ((n / total) * 100).toFixed(1) : "0") + "%"
      : n.toLocaleString("vi-VN") + " đ";
  if (format === "csv") {
    taiTep(
      "bieu-do-thu-chi.csv",
      csvThuChi([
        ["Nhóm", "Thu VND", "Chi VND (trị tuyệt đối)", "Thu %", "Chi %"],
        ...data.map((d) => [
          d.label,
          d.thu,
          d.chi,
          total ? (d.thu / total) * 100 : 0,
          total ? (d.chi / total) * 100 : 0,
        ]),
      ]),
      "text/csv;charset=utf-8",
    );
    return;
  }
  const height = Math.max(380, 120 + data.length * 62),
    radius = 76,
    circumference = 2 * Math.PI * radius,
    ratio = total ? thu / total : 0;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}"><rect width="1200" height="${height}" fill="white"/><g font-family="Arial,sans-serif" fill="#4e365f"><text x="28" y="34" font-size="21">Báo cáo thu chi · ${percent ? "% tổng dòng tiền" : "VND"}</text><text x="28" y="62" font-size="12">Thu: ${esc(value(thu))} · Chi: ${esc(value(chi))} · Không gồm tiền tồn</text>${data
    .map((d, i) => {
      const y = 100 + i * 62;
      return `<g><text x="28" y="${y + 17}" font-size="12"><title>${esc(d.label)}</title>${esc(d.label.slice(0, 32))}</text><rect x="260" y="${y}" height="18" width="${(d.thu / max) * 420}" rx="3" fill="${income}"/><text x="${268 + (d.thu / max) * 420}" y="${y + 13}" font-size="10">${esc(value(d.thu))}</text><rect x="260" y="${y + 22}" height="18" width="${(d.chi / max) * 420}" rx="3" fill="${expense}"/><text x="${268 + (d.chi / max) * 420}" y="${y + 35}" font-size="10">${esc(value(d.chi))}</text></g>`;
    })
    .join(
      "",
    )}<circle cx="990" cy="174" r="76" fill="none" stroke="${total ? expense : "#e8e1ee"}" stroke-width="30"/>${total ? `<circle cx="990" cy="174" r="76" fill="none" stroke="${income}" stroke-width="30" stroke-dasharray="${circumference * ratio} ${circumference * (1 - ratio)}" transform="rotate(-90 990 174)"/>` : ""}<text x="990" y="179" text-anchor="middle" font-size="14">${esc(percent ? (total ? "100%" : "0%") : value(total))}</text><text x="875" y="290" font-size="13">Thu: ${(ratio * 100).toFixed(1)}%</text><text x="875" y="315" font-size="13">Chi: ${(total ? 100 - ratio * 100 : 0).toFixed(1)}%</text></g></svg>`;
  taiTep("bieu-do-thu-chi.svg", svg, "image/svg+xml;charset=utf-8");
}

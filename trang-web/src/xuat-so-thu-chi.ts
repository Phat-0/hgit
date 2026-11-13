import type { DongThuChi } from "./so-thu-chi";
export type OXuat = string | number;
const xml = (s: unknown) =>
  String(s ?? "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    .replace(
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
export function csvThuChi(rows: OXuat[][]) {
  return (
    "\ufeff" +
    rows
      .map((row) =>
        row
          .map(
            (x) =>
              '"' +
              (typeof x === "number"
                ? String(x)
                : String(x).replace(/^[\s]*[=+@-]/, "'$&")
              ).replace(/"/g, '""') +
              '"',
          )
          .join(","),
      )
      .join("\r\n")
  );
}
export function taiTep(name: string, body: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// ZIP không nén, OOXML chuẩn: không phụ thuộc CDN hoặc thư viện bảng tính ngoài.
const encoder = new TextEncoder();
function crc32(a: Uint8Array) {
  let c = 0xffffffff;
  for (const n of a) {
    c ^= n;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
function u16(a: Uint8Array, o: number, n: number) {
  new DataView(a.buffer).setUint16(o, n, true);
}
function u32(a: Uint8Array, o: number, n: number) {
  new DataView(a.buffer).setUint32(o, n, true);
}
export function xlsxThuChi(sheets: { name: string; rows: OXuat[][] }[]) {
  const files: { name: string; data: string }[] = [
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`,
    },
    {
      name: "_rels/.rels",
      data: '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    },
    {
      name: "xl/workbook.xml",
      data: `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${xml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}</Relationships>`,
    },
  ];
  const col = (n: number) => {
    let s = "";
    do {
      s = String.fromCharCode(65 + (n % 26)) + s;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return s;
  };
  sheets.forEach((s, i) =>
    files.push({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>${s.rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => (typeof v === "number" && Number.isFinite(v) ? `<c r="${col(ci)}${ri + 1}"><v>${v}</v></c>` : `<c r="${col(ci)}${ri + 1}" t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is></c>`)).join("")}</row>`).join("")}</sheetData><autoFilter ref="A1:${col(Math.max(0, (s.rows[0]?.length || 1) - 1))}${Math.max(1, s.rows.length)}"/></worksheet>`,
    }),
  );
  const chunks: Uint8Array[] = [],
    central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = encoder.encode(f.name),
      data = encoder.encode(f.data),
      crc = crc32(data),
      h = new Uint8Array(30 + name.length);
    u32(h, 0, 0x04034b50);
    u16(h, 4, 20);
    u16(h, 6, 0x800);
    u16(h, 12, 0x21);
    u32(h, 14, crc);
    u32(h, 18, data.length);
    u32(h, 22, data.length);
    u16(h, 26, name.length);
    h.set(name, 30);
    chunks.push(h, data);
    const c = new Uint8Array(46 + name.length);
    u32(c, 0, 0x02014b50);
    u16(c, 4, 20);
    u16(c, 6, 20);
    u16(c, 8, 0x800);
    u16(c, 14, 0x21);
    u32(c, 16, crc);
    u32(c, 20, data.length);
    u32(c, 24, data.length);
    u16(c, 28, name.length);
    u32(c, 42, offset);
    c.set(name, 46);
    central.push(c);
    offset += h.length + data.length;
  }
  const size = central.reduce((n, c) => n + c.length, 0),
    end = new Uint8Array(22);
  u32(end, 0, 0x06054b50);
  u16(end, 8, files.length);
  u16(end, 10, files.length);
  u32(end, 12, size);
  u32(end, 16, offset);
  const out = new Uint8Array(offset + size + 22);
  let at = 0;
  for (const c of [...chunks, ...central, end]) {
    out.set(c, at);
    at += c.length;
  }
  return out.buffer;
}
export function bangXuatThuChi(
  rows: DongThuChi[],
  branches: { id: string; ten_homestay: string }[],
  rooms: { id: string; ten_phong: string }[],
  balances: Map<string, number>,
) {
  return [
    [
      "Ngày",
      "Tên khoản",
      "Số tiền VND",
      "Thu / chi",
      "Chi nhánh",
      "Phòng",
      "Ghi chú",
      "Chứng từ",
      "Số dư lũy kế VND",
      "Màu hàng",
    ],
    ...rows.map((r) => [
      r.ngay,
      r.ten,
      Number(r.so_tien),
      r.loai,
      branches.find((b) => b.id === r.homestay_id)?.ten_homestay ||
        "Toàn hệ thống",
      rooms.find((p) => p.id === r.phong_id)?.ten_phong || "",
      r.ghi_chu,
      r.chung_tu?.map((f) => f.ten_tep).join("; ") || r.so_chung_tu || 0,
      balances.get(r.id) || 0,
      r.mau,
    ]),
  ] as OXuat[][];
}

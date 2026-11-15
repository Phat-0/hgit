import { useLuaChonNoi } from "./lua-chon-noi";
import { useRef, useState } from "react";
import { csvThuChi, taiTep, xlsxThuChi } from "./xuat-so-thu-chi";
import { hienSo } from "./thong-ke-thu-chi";
export default function BieuDoThongKe({
  title,
  unit,
  points,
  comparisonOnly = false,
}: {
  comparisonOnly?: boolean;
  title: string;
  unit: string;
  points: { id: string; ten: string; value: number | null }[];
}) {
  useLuaChonNoi();
  const [percent, setPercent] = useState(false),
    [line, setLine] = useState(false),
    [hidden, setHidden] = useState<string[]>([]),
    [removed, setRemoved] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const data = points.filter(
      (p) =>
        !hidden.includes(p.id) && !removed.includes(p.id) && p.value !== null,
    ),
    sum = data.reduce((s, p) => s + Math.abs(p.value!), 0);
  const usePercent = percent && !comparisonOnly;
  const value = (n: number) => (usePercent ? (sum ? (n / sum) * 100 : 0) : n);
  const low = Math.min(0, ...data.map((p) => value(p.value!))),
    high = Math.max(1, ...data.map((p) => value(p.value!)));
  const y = (n: number) => 240 - ((value(n) - low) / (high - low)) * 170;
  const txt = (n: number) => hienSo(value(n)) + (usePercent ? "%" : " " + unit);
  const width = Math.max(620, data.length * 130 + 90),
    colors = ["#42b69a", "#b16bd4", "#df9750", "#6398db", "#d26994"];
  let offset = 0;
  const circ = Math.PI * 140;
  function exportFile(format: string) {
    const table = [
      ["Đối tượng", title, "Đơn vị"],
      ...data.map((p) => [p.ten, p.value!, unit]),
    ];
    if (format === "csv")
      taiTep(
        "bieu-do-thong-ke.csv",
        csvThuChi(table),
        "text/csv;charset=utf-8",
      );
    else if (format === "xlsx")
      taiTep(
        "bieu-do-thong-ke.xlsx",
        xlsxThuChi([{ name: "Bieu do", rows: table }]),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
    else {
      let height = 0;
      const body = Array.from(ref.current?.querySelectorAll("svg") || [])
        .map((svg) => {
          const copy = svg.cloneNode(true) as SVGSVGElement;
          copy.setAttribute("x", "0");
          copy.setAttribute("y", String(height));
          height += 310;
          return copy.outerHTML;
        })
        .join("");
      taiTep(
        "bieu-do-thong-ke.svg",
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${body}</svg>`,
        "image/svg+xml",
      );
    }
  }
  return (
    <section className="stc-charts tk-chart">
      <header>
        <h3>{title}</h3>
        <details className="stc-check-picker stc-chart-menu">
          <summary aria-label="Tùy chọn biểu đồ thống kê">☰</summary>
          <div>
            <label>
              <input
                type="checkbox"
                checked={usePercent}
                disabled={comparisonOnly}
                onChange={(e) => setPercent(e.target.checked)}
              />
              Hiện %
            </label>
            <label>
              <input
                type="checkbox"
                checked={line}
                onChange={(e) => setLine(e.target.checked)}
              />
              Thêm đường
            </label>
            <select
              aria-label="Xuất biểu đồ thống kê"
              value=""
              onChange={(e) => exportFile(e.target.value)}
            >
              <option value="" disabled>
                Xuất file…
              </option>
              <option value="csv">CSV</option>
              <option value="xlsx">Excel</option>
              <option value="svg">SVG</option>
            </select>
          </div>
        </details>
      </header>
      <div className="stc-selected-objects">
        {points
          .filter((p) => !removed.includes(p.id))
          .map((p) => (
            <div className="stc-object-chip" key={p.id}>
              <button
                type="button"
                aria-pressed={!hidden.includes(p.id)}
                onClick={() =>
                  setHidden((old) =>
                    old.includes(p.id)
                      ? old.filter((x) => x !== p.id)
                      : [...old, p.id],
                  )
                }
              >
                {p.ten}
              </button>
              <button
                type="button"
                className="stc-chip-remove"
                aria-label={"Bỏ khỏi biểu đồ " + p.ten}
                onClick={() => setRemoved((old) => [...old, p.id])}
              >
                ×
              </button>
            </div>
          ))}
        {removed.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setRemoved([]);
              setHidden([]);
            }}
          >
            Hiện lại tất cả
          </button>
        )}
      </div>
      <div className="stc-chart-grid" ref={ref}>
        <figure>
          <figcaption>{usePercent ? "Tỷ trọng (%)" : unit}</figcaption>
          <div className="stc-svg-scroll">
            <svg
              width={width}
              height="300"
              role="img"
              aria-label="Biểu đồ cột thống kê"
            >
              <line
                x1="55"
                x2={width - 15}
                y1={y(0)}
                y2={y(0)}
                stroke="#cbbbdb"
              />
              {data.map((p, i) => (
                <g key={p.id}>
                  <rect
                    x={85 + i * 130}
                    y={Math.min(y(0), y(p.value!))}
                    width="38"
                    height={Math.abs(y(p.value!) - y(0))}
                    fill={colors[i % colors.length]}
                    rx="4"
                  >
                    <title>{p.ten + ": " + txt(p.value!)}</title>
                  </rect>
                  <text
                    x={104 + i * 130}
                    y={y(p.value!) - 8}
                    textAnchor="middle"
                    fontSize="10"
                  >
                    {txt(p.value!)}
                  </text>
                  <text
                    x={104 + i * 130}
                    y="278"
                    textAnchor="middle"
                    fontSize="10"
                  >
                    <title>{p.ten}</title>
                    {p.ten.length > 18 ? p.ten.slice(0, 17) + "…" : p.ten}
                  </text>
                </g>
              ))}
              {line && (
                <polyline
                  fill="none"
                  stroke="#745097"
                  strokeWidth="2"
                  points={data
                    .map((p, i) => `${104 + i * 130},${y(p.value!)}`)
                    .join(" ")}
                />
              )}
            </svg>
          </div>
        </figure>
        <figure>
          <figcaption>Tỷ trọng các đối tượng</figcaption>
          {comparisonOnly ? (
            <p>
              Các đối tượng được chọn có dữ liệu bao gồm nhau. Dùng biểu đồ cột
              để so sánh, hoặc bỏ tổng/chi nhánh bao gồm phòng để xem tỷ trọng.
            </p>
          ) : data.some((p) => p.value! < 0) ? (
            <p>Không tính tỷ trọng hình tròn cho giá trị âm.</p>
          ) : (
            <svg
              width="380"
              height="300"
              viewBox="0 0 380 300"
              role="img"
              aria-label="Biểu đồ tròn thống kê"
            >
              <circle
                cx="190"
                cy="145"
                r="70"
                fill="none"
                stroke="#eee6f3"
                strokeWidth="35"
              />
              {data
                .filter((p) => p.value! > 0)
                .map((p, i) => {
                  const length = (p.value! / sum) * circ,
                    o = offset;
                  offset += length;
                  return (
                    <circle
                      key={p.id}
                      cx="190"
                      cy="145"
                      r="70"
                      fill="none"
                      stroke={colors[data.indexOf(p) % colors.length]}
                      strokeWidth="35"
                      strokeDasharray={`${length} ${circ - length}`}
                      strokeDashoffset={-o}
                      transform="rotate(-90 190 145)"
                    >
                      <title>{p.ten + ": " + txt(p.value!)}</title>
                    </circle>
                  );
                })}
              <text x="190" y="150" textAnchor="middle" fontSize="12">
                {hienSo(sum)} {unit}
              </text>
            </svg>
          )}
        </figure>
      </div>
    </section>
  );
}

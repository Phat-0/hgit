import { SapXepTrucTiep, XuatBieuDo } from "./TuyChonBieuDo";
import { useLuaChonNoi } from "./lua-chon-noi";
import { useRef, useState } from "react";
import { csvThuChi, taiTep, xlsxThuChi } from "./xuat-so-thu-chi";
import { hienSo } from "./thong-ke-thu-chi";
export default function BieuDoThongKe({
  title,
  unit,
  points,
  comparisonOnly = false,
  pieReason,
}: {
  comparisonOnly?: boolean;
  pieReason?: string;
  title: string;
  unit: string;
  points: {
    id: string;
    ten: string;
    value: number | null;
    unit?: string;
    calc?: string;
    category?: string;
    branch?: string;
  }[];
}) {
  useLuaChonNoi();
  const [percent, setPercent] = useState(false),
    [line, setLine] = useState(false),
    [hidden, setHidden] = useState<string[]>([]),
    [removed, setRemoved] = useState<string[]>([]),
    [sort, setSort] = useState("default");
  const ref = useRef<HTMLDivElement>(null);
  const data = points
      .filter(
        (p) =>
          !hidden.includes(p.id) && !removed.includes(p.id) && p.value !== null,
      )
      .sort((a, b) =>
        sort === "asc" || sort === "desc"
          ? (sort === "desc" ? -1 : 1) * (a.value! - b.value!)
          : sort === "az" || sort === "za"
            ? (sort === "za" ? -1 : 1) *
              a.ten.localeCompare(b.ten, "vi", { numeric: true })
            : 0,
      ),
    sum = data.reduce((s, p) => s + Math.abs(p.value!), 0);
  const usePercent = percent && !comparisonOnly && unit !== "nhiều đơn vị";
  const value = (n: number) => (usePercent ? (sum ? (n / sum) * 100 : 0) : n);
  const low = Math.min(0, ...data.map((p) => value(p.value!))),
    high = Math.max(1, ...data.map((p) => value(p.value!)));
  const y = (n: number) => 240 - ((value(n) - low) / (high - low)) * 170;
  const txt = (n: number, u = unit) =>
    hienSo(value(n)) + (usePercent ? "%" : " " + u);
  const width = Math.max(620, data.length * 130 + 90),
    colors = ["#99cdbd", "#c7b2df", "#e8c79f", "#afc9e8", "#e4b3c8"];
  let offset = 0;
  const circ = Math.PI * 140;
  function exportFile(format: string) {
    const table = [
      ["Đối tượng", title, "Đơn vị"],
      ...data.map((p) => [p.ten, p.value!, p.unit || unit]),
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
            <SapXepTrucTiep
              label="Sắp xếp biểu đồ thống kê"
              value={sort}
              onChange={(v) => {
                setSort(v);
              }}
              options={[
                ["default", "Thứ tự bảng"],
                ["az", "A–Z"],
                ["za", "Z–A"],
                ["asc", "Nhỏ → lớn"],
                ["desc", "Lớn → nhỏ"],
              ]}
            />
            <label>
              <input
                type="checkbox"
                checked={usePercent}
                disabled={comparisonOnly || unit === "nhiều đơn vị"}
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
            <XuatBieuDo label="Xuất biểu đồ thống kê" onExport={exportFile} />
          </div>
        </details>
      </header>
      <div className="stc-selected-objects">
        {[...new Set(points.map((p) => p.calc || "Tổng"))].map((calc) => (
          <section className="tk-chart-calc-group" key={calc}>
            <h4>{calc}</h4>
            {[
              ...new Set(
                points
                  .filter((p) => (p.calc || "Tổng") === calc)
                  .map((p) => p.category || "Tổng"),
              ),
            ].map((category) => (
              <div className="tk-chart-category" key={category}>
                <h5>{category}</h5>
                {[
                  ...new Set(
                    points
                      .filter(
                        (p) =>
                          (p.calc || "Tổng") === calc &&
                          (p.category || "Tổng") === category,
                      )
                      .map((p) => p.branch || ""),
                  ),
                ].map((branch) => (
                  <div className="tk-chart-branch" key={branch}>
                    {branch && <h6>{branch}</h6>}
                    <div>
                      {points
                        .filter(
                          (p) =>
                            !removed.includes(p.id) &&
                            (p.calc || "Tổng") === calc &&
                            (p.category || "Tổng") === category &&
                            (p.branch || "") === branch,
                        )
                        .map((p) => (
                          <div
                            className="stc-object-chip"
                            data-visible={!hidden.includes(p.id)}
                            key={p.id}
                            style={{
                              background:
                                colors[points.indexOf(p) % colors.length] +
                                "65",
                              borderColor:
                                colors[points.indexOf(p) % colors.length],
                            }}
                          >
                            <button
                              type="button"
                              title={p.ten}
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
                              onClick={() =>
                                setRemoved((old) => [...old, p.id])
                              }
                            >
                              ×
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </section>
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
              width={data.length > 5 ? width : "100%"}
              viewBox={`0 0 ${width} 300`}
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
                    fill={
                      colors[
                        points.findIndex((x) => x.id === p.id) % colors.length
                      ]
                    }
                    rx="4"
                  >
                    <title>{p.ten + ": " + txt(p.value!, p.unit)}</title>
                  </rect>
                  <text
                    x={104 + i * 130}
                    y={y(p.value!) - 8}
                    textAnchor="middle"
                    fontSize="10"
                  >
                    {txt(p.value!, p.unit)}
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
          {unit === "nhiều đơn vị" ? (
            <p>Chọn các giá trị cùng đơn vị để xem tỷ trọng.</p>
          ) : comparisonOnly ? (
            <p>
              {pieReason ||
                "Các đối tượng được chọn có dữ liệu bao gồm nhau. Chỉ xem tỷ trọng khi các phần không trùng nhau."}
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
                      stroke={
                        colors[
                          points.findIndex((x) => x.id === p.id) % colors.length
                        ]
                      }
                      strokeWidth="35"
                      strokeDasharray={`${length} ${circ - length}`}
                      strokeDashoffset={-o}
                      transform="rotate(-90 190 145)"
                    >
                      <title>{p.ten + ": " + txt(p.value!, p.unit)}</title>
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

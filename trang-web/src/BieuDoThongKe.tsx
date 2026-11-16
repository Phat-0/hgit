import {
  boTriCot,
  khoaGiaTri,
  nhomNutAnHien,
  type DiemBieuDo,
} from "./nhom-cot-bieu-do";
import { chuCacKhoang } from "./lich-hien-thi";
import { gopNgayThanhKhoang } from "./bieu-do-bo-sung";
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
  variant = "both",
}: {
  comparisonOnly?: boolean;
  pieReason?: string;
  variant?: "bar" | "pie" | "both";
  title: string;
  unit: string;
  points: DiemBieuDo[];
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
        variant !== "pie"
          ? 0
          : sort === "asc" || sort === "desc"
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
  const colors = [
    "#99cdbd",
    "#c7b2df",
    "#e8c79f",
    "#afc9e8",
    "#e4b3c8",
    "#b7c792",
    "#a5cbd1",
    "#d4b99e",
  ];
  const series = [
    ...new Map(
      points.map((p) => [
        khoaGiaTri(p),
        { key: khoaGiaTri(p), ten: p.seriesName || p.ten },
      ]),
    ).values(),
  ];
  const color = (p: DiemBieuDo) =>
    colors[
      (variant === "pie"
        ? points.findIndex((x) => x.id === p.id)
        : series.findIndex((s) => s.key === khoaGiaTri(p))) % colors.length
    ];
  const layout = boTriCot(
      data,
      sort,
      series.map((s) => s.key),
      [...new Set(points.map(p=>p.objectKey||p.id))],
    ),
    width = layout.width;
  const groups = nhomNutAnHien(
    points.filter((p) => !removed.includes(p.id)),
    variant === "pie",
  );
  function toggle(ids: string[]) {
    setHidden((old) =>
      ids.every((id) => old.includes(id))
        ? old.filter((id) => !ids.includes(id))
        : [...new Set([...old, ...ids])],
    );
  }
  function periodText(ps: DiemBieuDo[]) {
    const ranges = gopNgayThanhKhoang(ps.flatMap((p) => p.days || []));
    return ranges.length ? chuCacKhoang(ranges) : "";
  }
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
          const vb = svg.viewBox.baseVal,
            sw = vb.width || Number(svg.getAttribute("width")) || 380,
            sh = vb.height || Number(svg.getAttribute("height")) || 300;
          let extra = 0;
          const exportSeries = series.filter((s) =>
            data.some((p) => khoaGiaTri(p) === s.key),
          );
          if (
            svg.getAttribute("aria-label") === "Biểu đồ cột thống kê" &&
            exportSeries.length
          ) {
            extra = Math.ceil(exportSeries.length / 3) * 22 + 10;
            const ns = "http://www.w3.org/2000/svg",
              plot = document.createElementNS(ns, "g");
            while (copy.firstChild) plot.append(copy.firstChild);
            plot.setAttribute("transform", `translate(0 ${extra})`);
            copy.append(plot);
            const legend = document.createElementNS(ns, "g");
            exportSeries.forEach((s, i) => {
              const x = 55 + (i % 3) * Math.min(240, (sw - 70) / 3),
                y = 18 + Math.floor(i / 3) * 22,
                rect = document.createElementNS(ns, "rect"),
                text = document.createElementNS(ns, "text");
              rect.setAttribute("x", String(x));
              rect.setAttribute("y", String(y - 9));
              rect.setAttribute("width", "12");
              rect.setAttribute("height", "10");
              rect.setAttribute(
                "fill",
                colors[
                  series.findIndex((v) => v.key === s.key) % colors.length
                ],
              );
              text.setAttribute("x", String(x + 17));
              text.setAttribute("y", String(y));
              text.setAttribute("font-size", "11");
              text.textContent = s.ten;
              legend.append(rect, text);
            });
            copy.append(legend);
          }
          copy.setAttribute("width", String(sw));
          copy.setAttribute("height", String(sh + extra));
          copy.setAttribute("viewBox", `0 0 ${sw} ${sh + extra}`);
          copy.setAttribute("x", "0");
          copy.setAttribute("y", String(height));
          height += sh + extra + 10;
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
      {variant !== "pie" && (
        <div
          className="tk-series-legend"
          role="group"
          aria-label="Chú thích màu giá trị"
        >
          {series.map((s) => {
            const ps = points.filter(
              (p) => khoaGiaTri(p) === s.key && !removed.includes(p.id),
            );
            return (
              <button
                type="button"
                key={s.key}
                aria-pressed={ps.some((p) => !hidden.includes(p.id))}
                onClick={() => toggle(ps.map((p) => p.id))}
              >
                <i
                  style={{
                    background: colors[series.indexOf(s) % colors.length],
                  }}
                />
                {s.ten}
              </button>
            );
          })}
        </div>
      )}
      <div className="stc-selected-objects tk-compact-point-controls">
        {groups.map((group) => {
          const ids = group.points.map((p) => p.id),
            shown = group.points.filter((p) => !hidden.includes(p.id)).length,
            label =
              group.ten +
              (group.points.length > 1 && periodText(group.points)
                ? " · " + periodText(group.points)
                : "");
          const months = [
            ...new Set(group.points.map((p) => p.days?.[0]?.slice(0, 7) || "")),
          ];
          return (
            <div className="tk-point-group" key={group.key}>
              <div
                className="stc-object-chip"
                data-visible={shown > 0}
                style={{
                  background:
                    variant === "pie"
                      ? "#e9dff4"
                      : color(group.points[0]) + "65",
                  borderColor:
                    variant === "pie" ? "#d2bfe2" : color(group.points[0]),
                }}
              >
                <button
                  type="button"
                  title={label}
                  aria-pressed={
                    shown === ids.length ? true : shown === 0 ? false : "mixed"
                  }
                  onClick={() => toggle(ids)}
                >
                  {label}
                </button>
                {group.points.length > 1 && (
                  <details className="stc-check-picker tk-point-detail">
                    <summary aria-label={"Chọn ngày " + group.ten}>▾</summary>
                    <div>
                      {months.map((month) => (
                        <div className="tk-compact-month" key={month}>
                          {month && (
                            <span>
                              {month.slice(5)}
                              {Number(month.slice(0, 4)) ===
                              new Date().getFullYear()
                                ? ""
                                : "/" + month.slice(0, 4)}
                            </span>
                          )}
                          <div>
                            {group.points
                              .filter(
                                (p) =>
                                  (p.days?.[0]?.slice(0, 7) || "") === month,
                              )
                              .map((p) => (
                                <button
                                  type="button"
                                  key={p.id}
                                  title={p.ten}
                                  aria-pressed={!hidden.includes(p.id)}
                                  style={{ background: color(p) + "55" }}
                                  onClick={() => toggle([p.id])}
                                >
                                  {p.periodKey &&
                                  /^\d{4}-\d{2}-\d{2}$/.test(p.periodKey)
                                    ? p.periodKey.slice(8)
                                    : p.periodName || p.ten}
                                </button>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
                <button
                  type="button"
                  className="stc-chip-remove"
                  aria-label={"Bỏ khỏi biểu đồ " + group.ten}
                  onClick={() =>
                    setRemoved((old) => [...new Set([...old, ...ids])])
                  }
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
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
      <div className={"stc-chart-grid tk-chart-variant-" + variant} ref={ref}>
        {variant !== "pie" && (
          <figure>
            <figcaption>{usePercent ? "Tỷ trọng (%)" : unit}</figcaption>
            <div className="stc-svg-scroll">
              <svg
                width={width > 620 ? width : "100%"}
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
                {layout.bars.map(({ point: p, x, center, labelOffset }) => (
                  <g key={p.id}>
                    <rect
                      data-object={p.objectKey}
                      data-series={khoaGiaTri(p)}
                      data-period={p.periodKey}
                      x={x}
                      y={Math.min(y(0), y(p.value!))}
                      width="24"
                      height={Math.abs(y(p.value!) - y(0))}
                      fill={color(p)}
                      rx="4"
                    >
                      <title>{p.ten + ": " + txt(p.value!, p.unit)}</title>
                    </rect>
                    <text
                      x={center}
                      y={y(p.value!) - 8 - labelOffset}
                      textAnchor="middle"
                      fontSize="9"
                    >
                      {txt(p.value!, p.unit)}
                    </text>
                  </g>
                ))}
                {layout.periods.map((p) => (
                  <text
                    key={p.key}
                    x={p.x}
                    y="264"
                    textAnchor="middle"
                    fontSize="9"
                  >
                    <title>{p.ten}</title>
                    {p.ten.length > 20 ? p.ten.slice(0, 19) + "…" : p.ten}
                  </text>
                ))}
                {layout.labels.map((p) => (
                  <text
                    key={p.key}
                    data-object-label={p.key}
                    x={p.x}
                    y="286"
                    textAnchor="middle"
                    fontSize="11"
                  >
                    <title>{p.ten + (p.branch ? " · " + p.branch : "")}</title>
                    {p.ten.length > 22 ? p.ten.slice(0, 21) + "…" : p.ten}
                  </text>
                ))}
                {line &&
                  series.map((s) => {
                    const bars = layout.bars.filter(
                      (b) => khoaGiaTri(b.point) === s.key,
                    );
                    return (
                      bars.length > 0 && (
                        <polyline
                          key={s.key}
                          fill="none"
                          stroke={colors[series.indexOf(s) % colors.length]}
                          strokeWidth="2"
                          points={bars
                            .map((b) => `${b.center},${y(b.point.value!)}`)
                            .join(" ")}
                        />
                      )
                    );
                  })}
              </svg>
            </div>
          </figure>
        )}
        {variant !== "bar" && (
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
                        stroke={color(p)}
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
        )}
      </div>
    </section>
  );
}

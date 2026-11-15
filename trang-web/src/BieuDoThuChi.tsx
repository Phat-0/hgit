import { useLuaChonNoi } from "./lua-chon-noi";
import { useEffect, useMemo, useRef, useState } from "react";
import { RangePicker } from "./RangePicker";
import { quanTriApi, vnd } from "./bao-cao-api";
import { taiTep, csvThuChi, xlsxThuChi } from "./xuat-so-thu-chi";
import {
  cacNgay,
  nhomThuChi,
  mauNhom,
  type TuyChonBieuDo,
} from "./bieu-do-thu-chi";
import type { DongThuChi } from "./so-thu-chi";
const readColor = (key: string, fallback: string) => {
  try {
    const c = localStorage.getItem(key) || "";
    return /^#[0-9a-f]{6}$/i.test(c) ? c : fallback;
  } catch {
    return fallback;
  }
};
export default function BieuDoThuChi({
  token,
  start,
  end,
  rows,
  branches,
  rooms,
}: {
  token: string;
  start: string;
  end: string;
  rows: DongThuChi[];
  branches: TuyChonBieuDo[];
  rooms: TuyChonBieuDo[];
}) {
  useLuaChonNoi();
  const [chartStart, setChartStart] = useState(start),
    [chartEnd, setChartEnd] = useState(end),
    [source, setSource] = useState<DongThuChi[]>(rows),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<string[]>(["tong"]),
    [hidden, setHidden] = useState<string[]>([]),
    [metric, setMetric] = useState("thu"),
    [scope, setScope] = useState("chi_nhanh"),
    [sort, setSort] = useState("ngay"),
    [percent, setPercent] = useState(false),
    [showLine, setShowLine] = useState(false),
    [income, setIncome] = useState(() =>
      readColor("thu-chi:mau-thu", "#42b69a"),
    ),
    [expense, setExpense] = useState(() =>
      readColor("thu-chi:mau-chi", "#b16bd4"),
    );
  const grid = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    if (chartStart === start && chartEnd === end) {
      setSource(rows);
      setLoading(false);
      return () => {
        live = false;
      };
    }
    setSource([]);
    void quanTriApi<{ dong: DongThuChi[] }>(
      token,
      "thu-chi?" +
        new URLSearchParams({ tu_ngay: chartStart, den_ngay: chartEnd }),
    )
      .then((x) => {
        if (live) setSource(x.dong);
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [token, chartStart, chartEnd, rows, start, end]);
  const choices = useMemo(
    () => [
      { key: "tong", label: "Toàn hệ thống", mau: mauNhom[0] },
      ...branches.map((b, i) => ({
        key: "cn:" + b.id,
        label: b.ten_homestay || "Chi nhánh",
        mau: mauNhom[i % mauNhom.length],
      })),
      ...rooms.map((r, i) => ({
        key: "p:" + r.id,
        label:
          (branches.find((b) => b.id === r.homestay_id)?.ten_homestay || "") +
          " · " +
          r.ten_phong,
        mau: mauNhom[i % mauNhom.length],
      })),
    ],
    [branches, rooms],
  );
  const activeKeys = selected.filter((key) => !hidden.includes(key));
  const matches = (r: DongThuChi, key: string) =>
    key === "tong" ||
    key === "cn:" + r.homestay_id ||
    key === "p:" + r.phong_id;
  const filtered = source.filter((r) =>
    activeKeys.some((key) => matches(r, key)),
  );
  const groups = useMemo(() => {
    if (sort === "ngay") {
      return cacNgay(chartStart, chartEnd)
        .map((day) => {
          const chosen = filtered.filter((r) => r.ngay === day);
          const total = nhomThuChi(chosen, "tong", [], [], [])[0];
          return {
            ...total,
            key: day,
            label: day.slice(8) + "/" + day.slice(5, 7),
          };
        })
        .filter(() => activeKeys.length > 0);
    }
    return choices
      .filter((c) => activeKeys.includes(c.key))
      .map((c) => ({
        ...nhomThuChi(
          source.filter((r) => matches(r, c.key)),
          "tong",
          [],
          [],
          [],
        )[0],
        ...c,
      }))
      .sort(
        (a, b) =>
          (sort === "za" ? -1 : 1) *
          a.label.localeCompare(b.label, "vi", { numeric: true }),
      );
  }, [source, selected, hidden, choices, sort, chartStart, chartEnd]);
  const group =
    sort === "ngay" || activeKeys.length !== 1 || activeKeys[0] !== "tong"
      ? "chon"
      : "tong";
  function toggleChoice(key: string) {
    const nextScope = key.startsWith("p:") ? "phong" : "chi_nhanh";
    setScope(nextScope);
    setSelected((old) =>
      old.includes(key)
        ? old.filter((x) => x !== key)
        : key === "tong"
          ? [key]
          : [
              ...old.filter(
                (x) =>
                  x !== "tong" &&
                  x.startsWith(nextScope === "phong" ? "p:" : "cn:"),
              ),
              key,
            ],
    );
    setHidden((old) => old.filter((x) => x !== key));
  }
  const series = (
    metric === "thu" ? ["thu"] : metric === "chi" ? ["chi"] : ["thu", "chi"]
  ) as ("thu" | "chi")[];
  const sum = groups.reduce(
      (s, g) => s + series.reduce((n, k) => n + g[k], 0),
      0,
    ),
    max = groups.reduce(
      (m, g) => series.reduce((n, k) => Math.max(n, g[k]), m),
      1,
    ),
    text = (n: number) =>
      percent ? (sum ? ((n / sum) * 100).toFixed(1) : "0") + "%" : vnd(n),
    modeName =
      metric === "thu" ? "Thu" : metric === "chi" ? "Chi" : "Thu / chi";
  const pie = (["thu", "chi"] as const).map((k) => ({
    key: k,
    label: k === "thu" ? "Thu" : "Chi",
    money: filtered.reduce(
      (sum, r) =>
        sum +
        (k === "thu"
          ? Math.max(0, Number(r.so_tien))
          : Math.max(0, -Number(r.so_tien))),
      0,
    ),
    color: k === "thu" ? income : expense,
  }));
  const pieTotal = pie.reduce((s, p) => s + p.money, 0),
    circ = 2 * Math.PI * 70;
  let offset = 0;
  const days = useMemo(
    () => cacNgay(chartStart, chartEnd),
    [chartStart, chartEnd],
  );
  const lineSeries = useMemo(
    () =>
      groups
        .filter((g) => g.rows.length > 0)
        .flatMap((g) => {
          const byDay = new Map<string, { thu: number; chi: number }>();
          for (const r of g.rows) {
            const d = byDay.get(r.ngay) || { thu: 0, chi: 0 };
            const n = Number(r.so_tien);
            if (n > 0) d.thu += n;
            else d.chi -= n;
            byDay.set(r.ngay, d);
          }
          return (
            metric === "thu"
              ? ["thu"]
              : metric === "chi"
                ? ["chi"]
                : ["thu", "chi"]
          ).map((k) => ({
            key: g.key + k,
            label:
              (group === "tong" ? "" : g.label + " · ") +
              (k === "thu" ? "Thu" : "Chi"),
            color: group === "tong" ? (k === "thu" ? income : expense) : g.mau,
            dashed: k === "chi",
            values: days.map(
              (day) => byDay.get(day)?.[k as "thu" | "chi"] || 0,
            ),
          }));
        }),
    [groups, metric, group, income, expense, days],
  );
  const duplicated =
    sort !== "ngay" &&
    filtered.some(
      (r) => activeKeys.filter((key) => matches(r, key)).length > 1,
    );
  function saveColor(key: string, value: string, set: (s: string) => void) {
    set(value);
    try {
      localStorage.setItem(key, value);
    } catch {}
  }
  function exportChart(format: string) {
    const grouped = [
      [
        "Đối tượng",
        "Thu VND",
        "Chi VND (trị tuyệt đối)",
        "Giá trị đang hiển thị",
        "Tỷ trọng %",
      ],
      ...groups.map((g) => {
        const n = series.reduce((s, k) => s + g[k], 0);
        return [g.label, g.thu, g.chi, n, sum ? (n / sum) * 100 : 0];
      }),
    ];
    const daily = [
      ["Ngày", ...lineSeries.map((s) => s.label)],
      ...days.map((d, i) => [d, ...lineSeries.map((s) => s.values[i])]),
    ];
    const suffix = chartStart + "-" + chartEnd;
    if (format === "csv")
      taiTep(
        "bieu-do-" + suffix + ".csv",
        csvThuChi(grouped),
        "text/csv;charset=utf-8",
      );
    else if (format === "xlsx")
      taiTep(
        "bieu-do-" + suffix + ".xlsx",
        xlsxThuChi([
          { name: "Doi tuong", rows: grouped },
          { name: "Theo ngay", rows: daily },
        ]),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
    else {
      const svgs = Array.from(
        grid.current?.querySelectorAll<SVGSVGElement>("svg[data-chart]") || [],
      );
      let y = 0;
      let width = 700;
      const body = svgs
        .map((svg) => {
          const w = Number(svg.getAttribute("width")) || 400,
            h = Number(svg.getAttribute("height")) || 320;
          width = Math.max(width, w);
          const xml = svg.cloneNode(true) as SVGSVGElement;
          xml.setAttribute("x", "0");
          xml.setAttribute("y", String(y));
          const labels =
            svg.dataset.chart === "tron"
              ? pie.map((p) => ({
                  label: p.label,
                  value: percent
                    ? (pieTotal ? (p.money / pieTotal) * 100 : 0).toFixed(1) +
                      "%"
                    : vnd(p.money),
                  color: p.color,
                }))
              : svg.dataset.chart === "duong"
                ? lineSeries.map((s) => ({
                    label: s.label + (s.dashed ? " (nét đứt)" : ""),
                    value: "",
                    color: s.color,
                  }))
                : [];
          let actualHeight = h;
          if (labels.length) {
            actualHeight = h + labels.length * 22 + 20;
            xml.setAttribute("height", String(actualHeight));
            xml.setAttribute("viewBox", `0 0 ${w} ${actualHeight}`);
            labels.forEach((l, i) => {
              const g = document.createElementNS(
                  "http://www.w3.org/2000/svg",
                  "g",
                ),
                dot = document.createElementNS(
                  "http://www.w3.org/2000/svg",
                  "rect",
                ),
                t = document.createElementNS(
                  "http://www.w3.org/2000/svg",
                  "text",
                );
              dot.setAttribute("x", "18");
              dot.setAttribute("y", String(h + i * 22));
              dot.setAttribute("width", "9");
              dot.setAttribute("height", "9");
              dot.setAttribute("fill", l.color);
              t.setAttribute("x", "35");
              t.setAttribute("y", String(h + i * 22 + 9));
              t.setAttribute("font-size", "11");
              t.textContent = l.label + (l.value ? " · " + l.value : "");
              g.append(dot, t);
              xml.append(g);
            });
          }
          y += actualHeight + 20;
          return xml.outerHTML;
        })
        .join("");
      taiTep(
        "bieu-do-" + suffix + ".svg",
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${y}" viewBox="0 0 ${width} ${y}"><rect width="100%" height="100%" fill="white"/>${body}</svg>`,
        "image/svg+xml;charset=utf-8",
      );
    }
  }
  return (
    <section className="stc-charts">
      <header>
        <h2>Biểu đồ thu chi</h2>
        <div className="stc-tools">
          <RangePicker
            compact
            quickMonth
            start={chartStart}
            end={chartEnd}
            onChange={(a, b) => {
              setChartStart(a);
              setChartEnd(b);
            }}
          />
          <select
            aria-label="Loại đối tượng biểu đồ"
            value={scope}
            onChange={(e) => {
              setScope(e.target.value);
              setSelected([]);
              setHidden([]);
            }}
          >
            <option value="chi_nhanh">Chi nhánh</option>
            <option value="phong">Phòng</option>
          </select>
          {scope === "chi_nhanh" && (
            <details className="stc-check-picker">
              <summary>
                Chi nhánh ({selected.filter((k) => k.startsWith("cn:")).length})
              </summary>
              <div role="group" aria-label="Chọn chi nhánh biểu đồ">
                <label>
                  <input
                    type="checkbox"
                    checked={selected.includes("tong")}
                    onChange={() => toggleChoice("tong")}
                  />
                  Toàn hệ thống
                </label>
                {branches.map((b) => (
                  <label key={b.id}>
                    <input
                      type="checkbox"
                      checked={selected.includes("cn:" + b.id)}
                      onChange={() => toggleChoice("cn:" + b.id)}
                    />
                    {b.ten_homestay}
                  </label>
                ))}
              </div>
            </details>
          )}
          {scope === "phong" && (
            <details className="stc-check-picker">
              <summary>
                Phòng ({selected.filter((k) => k.startsWith("p:")).length})
              </summary>
              <div role="group" aria-label="Chọn phòng biểu đồ">
                {rooms.map((r) => (
                  <label key={r.id}>
                    <input
                      type="checkbox"
                      checked={selected.includes("p:" + r.id)}
                      onChange={() => toggleChoice("p:" + r.id)}
                    />
                    {choices.find((c) => c.key === "p:" + r.id)?.label}
                  </label>
                ))}
                {!rooms.length && <span>Chưa có phòng.</span>}
              </div>
            </details>
          )}
          <select
            aria-label="Sắp xếp biểu đồ"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="ngay">Theo ngày</option>
            <option value="az">A–Z</option>
            <option value="za">Z–A</option>
          </select>
          <div className="stc-chart-actions">
            <select
              aria-label="Hiển thị thu hoặc chi"
              value={metric}
              onChange={(e) => setMetric(e.target.value)}
            >
              <option value="thu">Chỉ thu</option>
              <option value="chi">Chỉ chi</option>
            </select>
            <details className="stc-check-picker stc-chart-menu">
              <summary aria-label="Tùy chọn biểu đồ" title="Tùy chọn biểu đồ">
                ☰
              </summary>
              <div>
                <label>
                  <input
                    aria-label="Hiện phần trăm biểu đồ"
                    type="checkbox"
                    checked={percent}
                    onChange={(e) => setPercent(e.target.checked)}
                  />
                  Hiện %
                </label>
                <label>
                  <input
                    aria-label="Vẽ thêm đường trên biểu đồ cột"
                    type="checkbox"
                    checked={showLine}
                    onChange={(e) => setShowLine(e.target.checked)}
                  />
                  Thêm đường
                </label>
                <label>
                  Thu
                  <input
                    type="color"
                    aria-label="Màu biểu đồ thu"
                    value={income}
                    onChange={(e) =>
                      saveColor("thu-chi:mau-thu", e.target.value, setIncome)
                    }
                  />
                </label>
                <label>
                  Chi
                  <input
                    type="color"
                    aria-label="Màu biểu đồ chi"
                    value={expense}
                    onChange={(e) =>
                      saveColor("thu-chi:mau-chi", e.target.value, setExpense)
                    }
                  />
                </label>
                <select
                  aria-label="Xuất biểu đồ"
                  value=""
                  onChange={(e) => exportChart(e.target.value)}
                  disabled={loading || !!error}
                >
                  <option value="" disabled>
                    ↗ Xuất biểu đồ
                  </option>
                  <option value="svg">SVG · các biểu đồ đang hiện</option>
                  <option value="csv">CSV · đối tượng</option>
                  <option value="xlsx">Excel · đối tượng và ngày</option>
                </select>{" "}
              </div>
            </details>
          </div>
        </div>
      </header>
      <div
        className="stc-selected-objects"
        role="group"
        aria-label="Đối tượng đã chọn"
      >
        {choices
          .filter((c) => selected.includes(c.key))
          .map((c) => (
            <div className="stc-object-chip" key={c.key}>
              <button
                type="button"
                aria-pressed={!hidden.includes(c.key)}
                onClick={() =>
                  setHidden((old) =>
                    old.includes(c.key)
                      ? old.filter((k) => k !== c.key)
                      : [...old, c.key],
                  )
                }
              >
                <i style={{ background: c.mau }} />
                {c.label}
              </button>
              <button
                type="button"
                className="stc-chip-remove"
                aria-label={"Bỏ " + c.label}
                onClick={() => {
                  setSelected((old) => old.filter((k) => k !== c.key));
                  setHidden((old) => old.filter((k) => k !== c.key));
                }}
              >
                ×
              </button>
            </div>
          ))}
        {!selected.length && (
          <small>Chọn chi nhánh hoặc phòng để hiển thị biểu đồ.</small>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
      {loading && <p role="status">Đang tải biểu đồ theo khoảng ngày riêng…</p>}
      {duplicated && (
        <p className="stc-chart-note">
          Các đối tượng có dữ liệu giao nhau. Tỷ trọng tính trên tổng giá trị
          các đối tượng hiển thị, không phải số dư sổ.
        </p>
      )}
      <div className="stc-chart-grid" ref={grid}>
        <figure>
          <figcaption>
            {modeName} · {percent ? "% giá trị hiển thị" : "VND"}
          </figcaption>
          <div className="stc-svg-scroll">
            <svg
              data-chart="cot"
              width={Math.max(600, groups.length * 176 + 80)}
              height="330"
              role="img"
              aria-label="Biểu đồ cột thu chi"
            >
              <text x="20" y="24">
                {modeName} theo đối tượng
              </text>
              {[0, 0.5, 1].map((t) => (
                <g key={t}>
                  <line
                    x1="60"
                    x2={Math.max(600, groups.length * 176 + 80) - 20}
                    y1={260 - t * 170}
                    y2={260 - t * 170}
                    stroke="#e9e0ef"
                  />
                  <text x="54" y={264 - t * 170} textAnchor="end" fontSize="9">
                    {percent
                      ? text(max * t)
                      : ((max * t) / 1000).toLocaleString("vi-VN", {
                          maximumFractionDigits: 0,
                        }) + "k"}
                  </text>
                </g>
              ))}
              {groups.map((g, i) => (
                <g key={g.key}>
                  {series.map((k, j) => {
                    const h = (g[k] / max) * 170,
                      x = 106 + i * 176 + j * 58;
                    return (
                      <g key={k}>
                        <title>
                          {g.label +
                            " · " +
                            (k === "thu" ? "Thu" : "Chi") +
                            ": " +
                            vnd(g[k])}
                        </title>
                        <rect
                          x={x}
                          y={260 - h}
                          width="36"
                          height={h}
                          rx="5"
                          fill={k === "thu" ? income : expense}
                        />
                        <text
                          x={x + 18}
                          y={250 - h - (j ? 15 : 0)}
                          textAnchor="middle"
                          fontSize="10"
                        >
                          {text(g[k])}
                        </text>
                      </g>
                    );
                  })}
                  <text
                    x={125 + i * 176 + (series.length > 1 ? 28 : 0)}
                    y="286"
                    textAnchor="middle"
                    fontSize="10"
                  >
                    <title>{g.label}</title>
                    {g.label.length > 23 ? g.label.slice(0, 22) + "…" : g.label}
                  </text>
                </g>
              ))}
              {showLine &&
                series.map((k, j) => (
                  <g key={"line-" + k} className="stc-column-line">
                    <polyline
                      points={groups
                        .map(
                          (g, i) =>
                            `${124 + i * 176 + j * 58},${260 - (g[k] / max) * 170}`,
                        )
                        .join(" ")}
                      fill="none"
                      stroke={k === "thu" ? income : expense}
                      strokeWidth="2.5"
                      strokeDasharray={k === "chi" ? "6 4" : undefined}
                    />
                    {groups.map((g, i) => (
                      <circle
                        key={g.key}
                        cx={124 + i * 176 + j * 58}
                        cy={260 - (g[k] / max) * 170}
                        r="4"
                        fill="white"
                        stroke={k === "thu" ? income : expense}
                        strokeWidth="2"
                      >
                        <title>{g.label + " · " + k + ": " + text(g[k])}</title>
                      </circle>
                    ))}
                  </g>
                ))}
            </svg>
          </div>
          {!filtered.length && !loading && (
            <p>Chưa có thu chi trong khoảng và phạm vi đã chọn.</p>
          )}
        </figure>
        <figure>
          <figcaption>Giữa thu và chi</figcaption>
          <svg
            data-chart="tron"
            width="380"
            height="270"
            viewBox="0 0 380 270"
            role="img"
            aria-label="Biểu đồ tròn giữa thu và chi"
          >
            <text x="15" y="24" fontSize="14">
              Giữa thu và chi
            </text>
            <circle
              cx="190"
              cy="150"
              r="70"
              fill="none"
              stroke="#e9e3ef"
              strokeWidth="35"
            />
            {pie
              .filter((p) => p.money > 0)
              .map((p) => {
                const length = (p.money / pieTotal) * circ,
                  o = offset;
                offset += length;
                return (
                  <circle
                    key={p.key}
                    cx="190"
                    cy="150"
                    r="70"
                    fill="none"
                    stroke={p.color}
                    strokeWidth="35"
                    strokeDasharray={`${length} ${circ - length}`}
                    strokeDashoffset={-o}
                    transform="rotate(-90 190 150)"
                  >
                    <title>
                      {p.label +
                        ": " +
                        vnd(p.money) +
                        " · " +
                        ((p.money / pieTotal) * 100).toFixed(1) +
                        "%"}
                    </title>
                  </circle>
                );
              })}
            <text
              x="190"
              y="143"
              textAnchor="middle"
              fontSize="12"
              fill={income}
            >
              Thu{" "}
              {percent
                ? (pieTotal ? (pie[0].money / pieTotal) * 100 : 0).toFixed(1) +
                  "%"
                : vnd(pie[0].money)}
            </text>
            <text
              x="190"
              y="164"
              textAnchor="middle"
              fontSize="12"
              fill={expense}
            >
              Chi{" "}
              {percent
                ? (pieTotal ? (pie[1].money / pieTotal) * 100 : 0).toFixed(1) +
                  "%"
                : vnd(pie[1].money)}
            </text>
          </svg>
        </figure>
      </div>
      <p className="stc-chart-note">
        Lịch biểu đồ độc lập với lịch bảng. Chi dùng trị tuyệt đối để so sánh; %
        tính trên các giá trị đang hiển thị, không gồm tiền tồn.
      </p>
    </section>
  );
}

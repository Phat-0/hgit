import { useEffect, useMemo, useRef, useState } from "react";
import { RangePicker } from "./RangePicker";
import { quanTriApi, vnd } from "./bao-cao-api";
import { taiTep, csvThuChi, xlsxThuChi } from "./xuat-so-thu-chi";
import {
  cacNgay,
  nhomThuChi,
  type DoiTuongBieuDo,
  type TuyChonBieuDo,
} from "./bieu-do-thu-chi";
import DoiTuongBieuDoPanel from "./DoiTuongBieuDo";
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
  const [chartStart, setChartStart] = useState(start),
    [chartEnd, setChartEnd] = useState(end),
    [source, setSource] = useState<DongThuChi[]>(rows),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [branch, setBranch] = useState(""),
    [room, setRoom] = useState(""),
    [group, setGroup] = useState("tong"),
    [metric, setMetric] = useState("ca_hai"),
    [sort, setSort] = useState("ten"),
    [percent, setPercent] = useState(false),
    [showLine, setShowLine] = useState(false),
    [objects, setObjects] = useState<DoiTuongBieuDo[]>([]),
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
  const filtered = useMemo(
    () =>
      source.filter(
        (r) =>
          (!branch || r.homestay_id === branch) &&
          (!room || r.phong_id === room),
      ),
    [source, branch, room],
  );
  const groups = useMemo(() => {
    const value = (n: { thu: number; chi: number }) =>
      metric === "thu" ? n.thu : metric === "chi" ? n.chi : n.thu + n.chi;
    return nhomThuChi(
      filtered,
      group,
      branches.filter((b) => !branch || b.id === branch),
      rooms.filter(
        (p) =>
          (!branch || p.homestay_id === branch) && (!room || p.id === room),
      ),
      objects,
    ).sort((a, b) =>
      sort === "lon"
        ? value(b) - value(a)
        : sort === "be"
          ? value(a) - value(b)
          : a.label.localeCompare(b.label, "vi"),
    );
  }, [filtered, group, branches, rooms, objects, sort, metric, branch, room]);
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
  const pie =
    group === "tong"
      ? series.map((k) => ({
          key: k,
          label: k === "thu" ? "Thu" : "Chi",
          money: groups[0]?.[k] || 0,
          color: k === "thu" ? income : expense,
        }))
      : groups.map((g) => ({
          key: g.key,
          label: g.label,
          money: series.reduce((s, k) => s + g[k], 0),
          color: g.mau,
        }));
  const pieTotal = pie.reduce((s, p) => s + p.money, 0),
    circ = 2 * Math.PI * 70;
  let offset = 0;
  const days = useMemo(
    () => cacNgay(chartStart, chartEnd),
    [chartStart, chartEnd],
  );
  const lineWidth = Math.max(660, days.length * 28);
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
  const lineMax = lineSeries.reduce(
    (m, s) => s.values.reduce((a, b) => Math.max(a, b), m),
    1,
  );
  const duplicated =
    group === "doi_tuong" &&
    filtered.some(
      (r) => groups.filter((g) => g.rows.some((x) => x.id === r.id)).length > 1,
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
                  value: text(p.money),
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
            aria-label="Nhóm biểu đồ"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
          >
            <option value="tong">Tổng thu chi</option>
            <option value="chi_nhanh">Giữa các chi nhánh</option>
            <option value="phong">Giữa các phòng</option>
            <option value="doi_tuong">Đối tượng tùy chỉnh</option>
          </select>
          <select
            aria-label="Hiển thị thu hoặc chi"
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
          >
            <option value="ca_hai">Thu và chi</option>
            <option value="thu">Chỉ thu</option>
            <option value="chi">Chỉ chi</option>
          </select>
          <select
            aria-label="Chi nhánh biểu đồ"
            value={branch}
            onChange={(e) => {
              setBranch(e.target.value);
              setRoom("");
            }}
          >
            <option value="">Tất cả chi nhánh</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.ten_homestay}
              </option>
            ))}
          </select>
          <select
            aria-label="Phòng biểu đồ"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          >
            <option value="">Tất cả phòng</option>
            {rooms
              .filter((p) => !branch || p.homestay_id === branch)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.ten_phong}
                </option>
              ))}
          </select>
          <select
            aria-label="Sắp xếp biểu đồ"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="ten">Tên đối tượng</option>
            <option value="lon">Lớn → bé</option>
            <option value="be">Bé → lớn</option>
          </select>
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
              aria-label="Hiện biểu đồ đường"
              type="checkbox"
              checked={showLine}
              onChange={(e) => setShowLine(e.target.checked)}
            />
            Biểu đồ đường
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
          </select>
        </div>
      </header>
      <DoiTuongBieuDoPanel
        token={token}
        branches={branches}
        rooms={rooms}
        onChanged={setObjects}
      />
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
            </svg>
          </div>
          {!filtered.length && !loading && (
            <p>Chưa có thu chi trong khoảng và phạm vi đã chọn.</p>
          )}
        </figure>
        <figure>
          <figcaption>
            {group === "tong"
              ? "Cơ cấu thu / chi"
              : modeName + " giữa các đối tượng"}
          </figcaption>
          <svg
            data-chart="tron"
            width="380"
            height="270"
            viewBox="0 0 380 270"
            role="img"
            aria-label="Biểu đồ tròn theo đối tượng"
          >
            <text x="15" y="24" fontSize="14">
              {group === "tong"
                ? "Cơ cấu thu / chi"
                : modeName + " theo đối tượng"}
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
            <text x="190" y="154" textAnchor="middle" fontSize="13">
              {percent ? (pieTotal ? "100%" : "0%") : vnd(pieTotal)}
            </text>
          </svg>
          <div className="stc-chart-legend">
            {pie.map((p) => (
              <span key={p.key}>
                <i style={{ background: p.color }} />
                <span>{p.label}</span>
                <b>
                  {percent
                    ? (pieTotal ? (p.money / pieTotal) * 100 : 0).toFixed(1) +
                      "%"
                    : vnd(p.money)}
                </b>
              </span>
            ))}
          </div>
        </figure>
        {showLine && (
          <figure className="stc-line-figure">
            <figcaption>Diễn biến theo ngày · {modeName}</figcaption>
            <div className="stc-svg-scroll">
              <svg
                data-chart="duong"
                width={lineWidth}
                height="320"
                role="img"
                aria-label="Biểu đồ đường theo ngày"
              >
                <text x="20" y="24">
                  Diễn biến {modeName.toLocaleLowerCase("vi")} theo ngày
                </text>
                {[0, 0.5, 1].map((t) => (
                  <g key={t}>
                    <line
                      x1="60"
                      x2={lineWidth - 20}
                      y1={260 - t * 170}
                      y2={260 - t * 170}
                      stroke="#e9e0ef"
                    />
                    <text
                      x="55"
                      y={264 - t * 170}
                      fontSize="9"
                      textAnchor="end"
                    >
                      {percent
                        ? text(lineMax * t)
                        : ((lineMax * t) / 1000).toLocaleString("vi-VN", {
                            maximumFractionDigits: 0,
                          }) + "k"}
                    </text>
                  </g>
                ))}
                {lineSeries.map((s) => (
                  <g key={s.key}>
                    <polyline
                      points={s.values
                        .map(
                          (n, i) =>
                            `${70 + (i * (lineWidth - 100)) / Math.max(1, days.length - 1)},${260 - (n / lineMax) * 170}`,
                        )
                        .join(" ")}
                      fill="none"
                      stroke={s.color}
                      strokeWidth="2"
                      strokeDasharray={s.dashed ? "6 4" : undefined}
                    />
                    {s.values.map((n, i) => (
                      <circle
                        key={i}
                        cx={
                          70 +
                          (i * (lineWidth - 100)) / Math.max(1, days.length - 1)
                        }
                        cy={260 - (n / lineMax) * 170}
                        r="3"
                        fill={s.color}
                      >
                        <title>
                          {days[i] + " · " + s.label + ": " + vnd(n)}
                        </title>
                      </circle>
                    ))}
                  </g>
                ))}
                {days.map((d, i) =>
                  i % Math.max(1, Math.ceil(days.length / 12)) === 0 ? (
                    <text
                      key={d}
                      x={
                        70 +
                        (i * (lineWidth - 100)) / Math.max(1, days.length - 1)
                      }
                      y="286"
                      textAnchor="middle"
                      fontSize="10"
                    >
                      {d.slice(8) + "/" + d.slice(5, 7)}
                    </text>
                  ) : null,
                )}
              </svg>
            </div>
            <div className="stc-chart-legend stc-line-legend">
              {lineSeries.map((s) => (
                <span key={s.key}>
                  <i style={{ background: s.color }} />
                  {s.label}
                  {s.dashed ? " (nét đứt)" : ""}
                </span>
              ))}
            </div>
          </figure>
        )}
      </div>
      <p className="stc-chart-note">
        Lịch biểu đồ độc lập với lịch bảng. Chi dùng trị tuyệt đối để so sánh; %
        tính trên các giá trị đang hiển thị, không gồm tiền tồn.
      </p>
    </section>
  );
}

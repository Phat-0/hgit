import { useLuaChonNoi, useBamNgoai } from "./lua-chon-noi";
import { useEffect, useMemo, useRef, useState } from "react";
import { RangePicker } from "./RangePicker";
import { ngayVN, quanTriApi } from "./bao-cao-api";
import { ngayCuoiThang } from "./so-thu-chi";
import { csvThuChi, taiTep, xlsxThuChi, type OXuat } from "./xuat-so-thu-chi";
import {
  CHI_SO,
  THU,
  hienSo,
  ngayNgan,
  nhomNgay,
  tenCot,
  tinhGiaTri,
  khungGioPhoBien,
  chuKhungGio,
  type CotThongKe,
  type DuLieuThongKe,
  type PhamVi,
} from "./thong-ke-thu-chi";
import BieuDoThongKe from "./BieuDoThongKe";
import "./thong-ke-thu-chi.css";
const allDays = [0, 1, 2, 3, 4, 5, 6];
const roomMetric = (key: string) => !["thu", "chi", "so_du"].includes(key);
type Row = PhamVi & { key: string; branch?: string };
function newColumn(metric: string, tu: string, den: string): CotThongKe {
  return {
    id: crypto.randomUUID(),
    chiSo: metric,
    cachTinh: "tong",
    chia: "chung",
    lichRieng: false,
    tu,
    den,
    thu: [...allDays],
    loaiDat: metric === "thoi_gian" ? ["Theo giờ"] : [],
    khungGio: false,
  };
}
function period(c: CotThongKe, tu: string, den: string) {
  return c.lichRieng
    ? c.tu && c.den
      ? `${ngayNgan(c.tu)}–${ngayNgan(c.den)}`
      : "Chưa chọn lịch"
    : `${ngayNgan(tu)}–${ngayNgan(den)}`;
}
export default function ThongKeThuChi({
  token,
  initial,
  onDirtyChange,
}: {
  token: string;
  initial?: { tu_ngay?: string; den_ngay?: string };
  onDirtyChange: (dirty: boolean) => void;
}) {
  useLuaChonNoi();
  const [tu, setTu] = useState(
      initial?.tu_ngay || ngayVN().slice(0, 7) + "-01",
    ),
    [den, setDen] = useState(
      initial?.den_ngay || ngayCuoiThang(ngayVN().slice(0, 7)),
    );
  const [columns, setColumns] = useState<CotThongKe[]>(() =>
    ["thu", "chi", "so_du", "dat", "huy"].map((m) => newColumn(m, tu, den)),
  );
  const [data, setData] = useState<DuLieuThongKe | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [revision, setRevision] = useState(0);
  const [chosenScopes, setChosenScopes] = useState<string[]>(["tong"]),
    [rowOrder, setRowOrder] = useState<string[]>([]),
    [selectedRows, setSelectedRows] = useState<string[]>([]),
    [editing, setEditing] = useState<string | null>(null);
  const [chart, setChart] = useState(false),
    [chartKeys, setChartKeys] = useState<string[]>([]),
    [saved, setSaved] = useState(false);
  const dragging = useRef("");
  useBamNgoai(
    !!editing,
    ".tk-column-editor,.tk-column-list,.tk-add-column,.lp-range-portal",
    () => setEditing(null),
  );
  const mark = () => {
    setSaved(false);
    onDirtyChange(true);
  };
  const allRanges = [
    { tu, den },
    ...columns
      .filter((c) => c.lichRieng && (c.tu || c.den))
      .map((c) => ({ tu: c.tu, den: c.den })),
  ];
  const from = allRanges.map((r) => r.tu).sort()[0],
    to = allRanges
      .map((r) => r.den)
      .sort()
      .at(-1)!;
  const valid =
    allRanges.every(
      (r) =>
        /^\d{4}-\d{2}-\d{2}$/.test(r.tu) &&
        /^\d{4}-\d{2}-\d{2}$/.test(r.den) &&
        r.tu <= r.den,
    ) && Date.parse(to) - Date.parse(from) <= 366 * 86400000;
  useEffect(() => {
    let live = true;
    setData(null);
    setError("");
    if (!valid) {
      setLoading(false);
      setError(
        "Lịch phải hợp lệ; khoảng dữ liệu chung và riêng tối đa 367 ngày.",
      );
      return;
    }
    setLoading(true);
    void quanTriApi<DuLieuThongKe>(
      token,
      "thu-chi/thong-ke?" +
        new URLSearchParams({ tu_ngay: from, den_ngay: to }),
    )
      .then((d) => {
        if (live) {
          setData(d);
          setSaved(false);
          onDirtyChange(true);
        }
      })
      .catch((e) => {
        if (live) setError((e as Error).message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [token, from, to, valid, revision, onDirtyChange]);
  const scopes: Row[] = useMemo(
    () =>
      !data
        ? []
        : [
            {
              key: "tong",
              id: "tong",
              loai: "tong",
              ten: "Tổng các chi nhánh",
            },
            ...data.chi_nhanh.map((b) => ({
              key: "cn:" + b.id,
              id: b.id,
              loai: "chi_nhanh" as const,
              ten: b.ten_homestay,
            })),
            ...data.phong.map((p) => ({
              key: "p:" + p.id,
              id: p.id,
              loai: "phong" as const,
              branch: p.homestay_id,
              ten:
                (data.chi_nhanh.find((b) => b.id === p.homestay_id)
                  ?.ten_homestay || "") +
                " · " +
                p.ten_phong,
            })),
          ],
    [data],
  );
  const rows = useMemo(
    () =>
      scopes
        .filter((p) => chosenScopes.includes(p.key))
        .sort((a, b) => {
          const ia = rowOrder.indexOf(a.key),
            ib = rowOrder.indexOf(b.key);
          return (
            (ia < 0 ? 1e6 : ia) - (ib < 0 ? 1e6 : ib) ||
            a.ten.localeCompare(b.ten, "vi", { numeric: true })
          );
        }),
    [scopes, chosenScopes, rowOrder],
  );
  const expanded = useMemo(
    () =>
      columns.map((c) => {
        const bins = nhomNgay(c, tu, den);
        return {
          config: c,
          bins: bins.length
            ? bins
            : [
                {
                  key: "empty",
                  ten:
                    c.lichRieng && !c.tu ? "Chọn lịch riêng" : "Chưa chọn thứ",
                  ngay: [] as string[],
                },
              ],
        };
      }),
    [columns, tu, den],
  );
  const leaves = useMemo(
    () =>
      expanded.flatMap((g) =>
        g.bins.map((b) => ({ key: g.config.id + ":" + b.key, c: g.config, b })),
      ),
    [expanded],
  );
  const tooLarge = leaves.length > 500 || leaves.length * rows.length > 50000;
  const chartRows = rows.filter((p) => selectedRows.includes(p.key));
  const comparisonOnly =
    chartRows.length > 1 &&
    (chartRows.some((p) => p.loai === "tong") ||
      chartRows.some(
        (p) =>
          p.loai === "chi_nhanh" &&
          chartRows.some((r) => r.loai === "phong" && r.branch === p.id),
      ));
  const chartLeaves = leaves.filter(
    (l) => chartKeys.includes(l.key) && l.b.ngay.length > 0,
  );
  function toggleScope(key: string) {
    setChosenScopes((old) =>
      old.includes(key) ? old.filter((k) => k !== key) : [...old, key],
    );
    setSelectedRows((old) => old.filter((k) => k !== key));
    mark();
  }
  function toggleRow(key: string) {
    setSelectedRows((old) =>
      old.includes(key) ? old.filter((k) => k !== key) : [...old, key],
    );
    mark();
  }
  function patch(id: string, x: Partial<CotThongKe>) {
    setColumns((old) => old.map((c) => (c.id === id ? { ...c, ...x } : c)));
    mark();
  }
  function moveRow(id: string, target: string) {
    const ids = rows.map((p) => p.key),
      a = ids.indexOf(id),
      b = ids.indexOf(target);
    if (a < 0 || b < 0 || a === b) return;
    ids.splice(a, 1);
    ids.splice(b, 0, id);
    setRowOrder(ids);
    mark();
  }
  function addColumn(metric: string) {
    const c = newColumn(metric, tu, den);
    setColumns((old) => [...old, c]);
    setEditing(c.id);
    mark();
  }
  function cellText(p: Row, c: CotThongKe, days: string[]) {
    const n = tinhGiaTri(data!, p, c, days),
      k = khungGioPhoBien(data!, p, c, days);
    return { n, k };
  }
  function exportFile(format: string) {
    if (!data || loading || error || tooLarge) return;
    const top: OXuat[] = ["Đối tượng"],
      bottom: OXuat[] = ["Phạm vi"];
    for (const l of leaves) {
      top.push(
        tenCot(l.c) +
          " · " +
          period(l.c, tu, den) +
          (l.c.loaiDat.length ? " · " + l.c.loaiDat.join(", ") : ""),
      );
      bottom.push(
        l.b.ten + " · " + (CHI_SO.find((m) => m[0] === l.c.chiSo)?.[2] || ""),
      );
      if (l.c.khungGio) {
        top.push("Khung giờ phổ biến · " + period(l.c, tu, den));
        bottom.push(l.b.ten + " · loại đặt giờ");
      }
    }
    const table: OXuat[][] = [
      top,
      bottom,
      ...rows.map((p) => [
        p.ten,
        ...leaves.flatMap((l) => {
          const { n, k } = cellText(p, l.c, l.b.ngay);
          return l.c.khungGio
            ? [n === null ? "" : n, chuKhungGio(k)]
            : [n === null ? "" : n];
        }),
      ]),
    ];
    const name = "thong-ke-" + tu + "-" + den;
    if (format === "csv")
      taiTep(name + ".csv", csvThuChi(table), "text/csv;charset=utf-8");
    else if (format === "xlsx")
      taiTep(
        name + ".xlsx",
        xlsxThuChi([
          { name: "Thong ke", rows: table },
          {
            name: "Quy tac",
            rows: [
              ["Chỉ tiêu", "Cách tính"],
              [
                "Thu/chi",
                "Từ sổ đã lưu; trung bình ngày/tuần gồm ngày/tuần không phát sinh.",
              ],
              [
                "Đơn",
                "Ngày tạo đơn theo giờ Việt Nam; đặt/giá/thời gian chỉ tính đơn đã xác nhận/nhận/trả. Hủy tính trạng thái đã hủy.",
              ],
              [
                "TB thời gian lưu trú",
                "Tổng giờ lưu trú / lượt đặt hợp lệ của loại đã chọn. Trung bình ngày/tuần lấy trung bình các mức trung bình của ngày/tuần có đơn.",
              ],
              [
                "Khung giờ phổ biến",
                "Chỉ loại Theo giờ. Nhóm theo giờ bắt đầu, chọn nhóm nhiều lượt nhất (hòa chọn giờ sớm hơn). Bắt đầu/kết thúc là trung bình trong nhóm đó; không phải giờ cao điểm công suất sử dụng.",
              ],
              [
                "Số dư",
                "Tổng hệ thống dùng tiền tồn từng tháng; chi nhánh/phòng chỉ lũy kế khoản gán, không phân bổ tiền tồn chung.",
              ],
              [
                "Phạm vi",
                "Các hàng có thể chồng nhau (tổng/chi nhánh/phòng); không cộng các hàng thành tổng mới.",
              ],
              ["Trống", "Chưa chọn lịch hoặc không có mẫu số."],
            ],
          },
        ]),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
    else if (format === "json")
      taiTep(
        name + ".json",
        JSON.stringify(
          {
            phien_ban: 2,
            tu,
            den,
            doi_tuong: chosenScopes,
            cot: columns,
            thu_tu: rows.map((p) => p.key),
            hang_da_chon: selectedRows,
            cot_bieu_do: chartKeys,
            bang: table,
            xuat_luc: new Date().toISOString(),
          },
          null,
          2,
        ),
        "application/json",
      );
    else return;
    setSaved(true);
    onDirtyChange(false);
  }
  const current = columns.find((c) => c.id === editing);
  const kinds = [
    ...new Set([
      "Theo giờ",
      "Theo ngày",
      "Theo đêm",
      ...(data?.don.map((d) => d.hinh_thuc_dat) || []),
    ]),
  ];
  const scopeInput = (p: Row) => (
    <label key={p.key}>
      <input
        type="checkbox"
        aria-label={"Hiển thị " + p.ten}
        checked={chosenScopes.includes(p.key)}
        onChange={() => toggleScope(p.key)}
      />
      {p.ten}
    </label>
  );
  return (
    <section className="stc-page tk-page">
      <section className="stc-block">
        <header className="tk-heading">
          <h2>Thống kê</h2>
          <span className={saved ? "tk-saved" : "tk-unsaved"}>
            {saved ? "Đã xuất bản hiện tại" : "Chưa lưu ra file"}
          </span>
        </header>
        <div className="tk-toolbar">
          <span>Lịch chung</span>
          <RangePicker
            compact
            quickMonth
            start={tu}
            end={den}
            onChange={(a, b) => {
              setTu(a);
              setDen(b);
              mark();
            }}
          />
          <details className="stc-check-picker tk-scope-picker">
            <summary aria-label="Đối tượng thống kê">
              Đối tượng ({chosenScopes.length})
            </summary>
            <div role="group" aria-label="Chọn nhiều đối tượng thống kê">
              {scopes.filter((p) => p.loai === "tong").map(scopeInput)}
              <details>
                <summary>Chi nhánh</summary>
                <div>
                  {scopes.filter((p) => p.loai === "chi_nhanh").map(scopeInput)}
                </div>
              </details>
              <details>
                <summary>Phòng theo chi nhánh</summary>
                <div>
                  {data?.chi_nhanh.map((b) => (
                    <details className="tk-room-branch" key={b.id}>
                      <summary>{b.ten_homestay}</summary>
                      <div>
                        {scopes
                          .filter(
                            (p) => p.loai === "phong" && p.branch === b.id,
                          )
                          .map(scopeInput)}
                        {!scopes.some(
                          (p) => p.loai === "phong" && p.branch === b.id,
                        ) && <small>Chưa có phòng.</small>}
                      </div>
                    </details>
                  ))}
                </div>
              </details>
            </div>
          </details>
          <details className="stc-check-picker tk-add-column">
            <summary aria-label="Thêm cột thống kê" title="Thêm cột thống kê">
              ＋
            </summary>
            <div>
              {CHI_SO.map((m) => (
                <button
                  type="button"
                  key={m[0]}
                  disabled={columns.length >= 20}
                  onClick={(e) => {
                    addColumn(m[0]);
                    e.currentTarget.closest("details")?.removeAttribute("open");
                  }}
                >
                  {m[1]}
                </button>
              ))}
            </div>
          </details>
          <button
            type="button"
            onClick={() => {
              setRevision((n) => n + 1);
              mark();
            }}
            disabled={loading}
          >
            ↻ Cập nhật
          </button>
          <details className="stc-check-picker stc-chart-menu">
            <summary aria-label="Lưu hoặc xuất thống kê">☰</summary>
            <div>
              <select
                aria-label="Xuất bảng thống kê"
                value=""
                disabled={
                  !data ||
                  loading ||
                  !!error ||
                  tooLarge ||
                  !rows.length ||
                  !leaves.length
                }
                onChange={(e) => exportFile(e.target.value)}
              >
                <option value="" disabled>
                  Xuất file…
                </option>
                <option value="xlsx">Excel (.xlsx)</option>
                <option value="csv">CSV (.csv)</option>
                <option value="json">Lưu bản thống kê (.json)</option>
              </select>
            </div>
          </details>
        </div>
        {error && <p role="alert">{error}</p>}
        {loading && <p role="status">Đang tổng hợp dữ liệu…</p>}
        <div className="tk-column-list" aria-label="Các cột thống kê">
          {columns.map((c) => (
            <div key={c.id}>
              <button
                type="button"
                aria-pressed={editing === c.id}
                onClick={() => setEditing(editing === c.id ? null : c.id)}
              >
                {tenCot(c)} ⚙
              </button>
              <button
                type="button"
                aria-label={"Bỏ cột " + tenCot(c)}
                onClick={() => {
                  setColumns((old) => old.filter((x) => x.id !== c.id));
                  if (editing === c.id) setEditing(null);
                  mark();
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        {current && (
          <div
            className="tk-column-editor tk-editor-compact"
            role="group"
            aria-label="Thiết lập cột thống kê"
          >
            <select
              aria-label="Chỉ số cột"
              title="Chỉ số"
              value={current.chiSo}
              onChange={(e) =>
                patch(current.id, {
                  chiSo: e.target.value,
                  cachTinh: "tong",
                  loaiDat: e.target.value === "thoi_gian" ? ["Theo giờ"] : [],
                  khungGio: false,
                })
              }
            >
              {CHI_SO.map((m) => (
                <option key={m[0]} value={m[0]}>
                  {m[1]}
                </option>
              ))}
            </select>
            {roomMetric(current.chiSo) && (
              <select
                aria-label="Loại đặt của cột"
                title="Loại đặt"
                value={current.loaiDat[0] || ""}
                onChange={(e) =>
                  patch(current.id, {
                    loaiDat: e.target.value ? [e.target.value] : [],
                    khungGio: false,
                  })
                }
              >
                {current.chiSo !== "thoi_gian" && (
                  <option value="">Tất cả loại đặt</option>
                )}
                {kinds.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            )}
            <select
              aria-label="Cách tính cột"
              title="Cách tính"
              value={current.cachTinh}
              onChange={(e) => patch(current.id, { cachTinh: e.target.value })}
            >
              <option value="tong">Tổng</option>
              <option value="tb_ngay">Trung bình ngày</option>
              <option value="tb_tuan">Trung bình tuần</option>
            </select>
            <select
              aria-label="Chia cột thống kê"
              title="Chia cột"
              value={current.chia}
              onChange={(e) => {
                const chia = e.target.value;
                patch(current.id, {
                  chia,
                  lichRieng: chia === "tuan",
                  tu: chia === "tuan" ? "" : tu,
                  den: chia === "tuan" ? "" : den,
                  thu: [...allDays],
                });
              }}
            >
              <option value="chung">Chung</option>
              <option value="ngay">Theo ngày</option>
              <option value="tuan">Theo tuần</option>
            </select>
            {current.chia === "tuan" && (
              <RangePicker
                compact
                quickMonth
                start={current.tu}
                end={current.den}
                placeholder={!current.tu ? "Chọn lịch riêng" : undefined}
                onChange={(a, b) => patch(current.id, { tu: a, den: b })}
              />
            )}
            {current.chia === "ngay" && (
              <div className="tk-weekdays">
                {THU.map((t, i) => (
                  <label key={t}>
                    <input
                      type="checkbox"
                      checked={current.thu.includes(i)}
                      onChange={(e) =>
                        patch(current.id, {
                          thu: e.target.checked
                            ? [...current.thu, i]
                            : current.thu.filter((x) => x !== i),
                        })
                      }
                    />
                    {t}
                  </label>
                ))}
              </div>
            )}
            {roomMetric(current.chiSo) && current.loaiDat[0] === "Theo giờ" && (
              <label className="tk-check">
                <input
                  type="checkbox"
                  aria-label="Hiện khung giờ phổ biến"
                  checked={!!current.khungGio}
                  onChange={(e) =>
                    patch(current.id, { khungGio: e.target.checked })
                  }
                />
                Lượt theo khung giờ
              </label>
            )}
            <button type="button" onClick={() => setEditing(null)}>
              Xong
            </button>
          </div>
        )}
        {tooLarge && (
          <p role="alert">
            Tối đa 500 cột con và 50.000 ô; hãy thu hẹp lịch hoặc bớt cột/hàng.
          </p>
        )}
        {data && !error && !tooLarge && (
          <div className="tk-sheet-scroll">
            <table className="tk-sheet">
              <thead>
                <tr>
                  <th className="tk-row-check" rowSpan={2}>
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả hàng thống kê"
                      checked={
                        !!rows.length &&
                        rows.every((p) => selectedRows.includes(p.key))
                      }
                      onChange={(e) => {
                        setSelectedRows(
                          e.target.checked ? rows.map((p) => p.key) : [],
                        );
                        mark();
                      }}
                    />
                  </th>
                  <th rowSpan={2} className="tk-name">
                    Đối tượng
                  </th>
                  {expanded.map((g) => (
                    <th key={g.config.id} colSpan={g.bins.length}>
                      <button
                        type="button"
                        onClick={() => setEditing(g.config.id)}
                      >
                        {tenCot(g.config)}
                        <small>
                          {period(g.config, tu, den)} ·{" "}
                          {CHI_SO.find((m) => m[0] === g.config.chiSo)?.[2]}
                          {g.config.loaiDat.length
                            ? " · " + g.config.loaiDat.join(", ")
                            : ""}
                          {g.config.khungGio ? " · Khung giờ phổ biến" : ""}
                        </small>
                      </button>
                    </th>
                  ))}
                </tr>
                <tr>
                  {leaves.map((l) => (
                    <th key={l.key}>{l.b.ten}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr
                    key={p.key}
                    data-row-key={p.key}
                    aria-selected={selectedRows.includes(p.key)}
                    onClick={(e) => {
                      if (!(e.target as HTMLElement).closest("input,button"))
                        toggleRow(p.key);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      moveRow(dragging.current, p.key);
                      dragging.current = "";
                    }}
                  >
                    <td className="tk-row-check">
                      <input
                        type="checkbox"
                        aria-label={"Chọn hàng " + p.ten}
                        checked={selectedRows.includes(p.key)}
                        onChange={() => toggleRow(p.key)}
                      />
                    </td>
                    <th scope="row" className="tk-name">
                      <div>
                        <button
                          type="button"
                          draggable
                          aria-label={"Kéo hàng " + p.ten}
                          title="Kéo để đổi thứ tự; dùng Alt + phím lên/xuống khi chọn nút"
                          onDragStart={(e) => {
                            dragging.current = p.key;
                            e.dataTransfer.setData("text/plain", p.key);
                          }}
                          onDragEnd={() => {
                            dragging.current = "";
                          }}
                          onKeyDown={(e) => {
                            if (
                              !e.altKey ||
                              !["ArrowUp", "ArrowDown"].includes(e.key)
                            )
                              return;
                            e.preventDefault();
                            const next =
                              rows[
                                rows.findIndex((r) => r.key === p.key) +
                                  (e.key === "ArrowUp" ? -1 : 1)
                              ];
                            if (next) moveRow(p.key, next.key);
                          }}
                        >
                          ⠿
                        </button>
                        <span>
                          {p.ten}
                          <small>
                            {p.loai === "tong"
                              ? "Toàn hệ thống"
                              : p.loai === "chi_nhanh"
                                ? "Chi nhánh"
                                : "Phòng"}
                          </small>
                        </span>
                      </div>
                    </th>
                    {leaves.map((l) => {
                      const { n, k } = cellText(p, l.c, l.b.ngay);
                      return (
                        <td tabIndex={0} key={l.key}>
                          {hienSo(n)}
                          {l.c.khungGio && (
                            <small
                              className="tk-peak-time"
                              title="Nhóm giờ bắt đầu có nhiều lượt đặt nhất; giờ đầu/cuối là trung bình của nhóm"
                            >
                              {chuKhungGio(k)}
                            </small>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={2 + leaves.length}>
                      Chọn đối tượng để hiển thị bảng.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {!columns.length && <p>Nhấn ＋ để thêm cột.</p>}
        <div
          className="tk-chart-controls"
          aria-label="Thiết lập biểu đồ thống kê"
        >
          <span>Đã chọn {chartRows.length} hàng</span>
          <details className="stc-check-picker">
            <summary>Đối tượng biểu đồ ({chartRows.length})</summary>
            <div>
              {rows.map((p) => (
                <label key={p.key}>
                  <input
                    type="checkbox"
                    checked={selectedRows.includes(p.key)}
                    onChange={() => toggleRow(p.key)}
                  />
                  {p.ten}
                </label>
              ))}
            </div>
          </details>
          <details className="stc-check-picker">
            <summary>Giá trị biểu đồ ({chartLeaves.length})</summary>
            <div>
              {leaves
                .filter((l) => l.b.ngay.length)
                .map((l) => (
                  <label key={l.key}>
                    <input
                      type="checkbox"
                      checked={chartKeys.includes(l.key)}
                      onChange={(e) => {
                        setChartKeys((old) =>
                          e.target.checked
                            ? [...old, l.key]
                            : old.filter((k) => k !== l.key),
                        );
                        mark();
                      }}
                    />
                    {tenCot(l.c)} · {l.c.loaiDat.join(", ")} · {l.b.ten}
                  </label>
                ))}
            </div>
          </details>
          <button
            type="button"
            aria-label="Hiển thị biểu đồ thống kê"
            aria-pressed={chart}
            onClick={() => {
              setChart((v) => !v);
              mark();
            }}
          >
            {chart ? "Ẩn biểu đồ" : "Hiện biểu đồ"}
          </button>
        </div>
        {chart && (!chartRows.length || !chartLeaves.length) && (
          <p className="tk-empty-chart">
            Chọn hàng đối tượng và giá trị để vẽ biểu đồ.
          </p>
        )}
        {chart && chartRows.length > 0 && chartLeaves.length > 8 && (
          <p role="alert">Chọn tối đa 8 giá trị để xem biểu đồ cùng lúc.</p>
        )}
        <details className="tk-rules">
          <summary>Quy tắc tính số liệu</summary>
          <p>
            Thu/chi lấy từ sổ đã lưu. Đặt/hủy theo ngày tạo đơn tại Việt Nam.
            Đặt, giá và thời gian chỉ tính đơn đã xác nhận, nhận hoặc trả phòng;
            hủy tính đơn đã hủy. Các hàng tổng/chi nhánh/phòng có thể chồng nhau
            và không cộng lại thành một tổng mới.
          </p>
          <p>
            Trung bình ngày/tuần của thu, chi, giá và lượt chia cho tất cả
            ngày/tuần được chọn, kể cả không phát sinh. Thời gian lưu trú luôn
            là trung bình mỗi lượt đặt theo loại; chọn trung bình ngày/tuần để
            lấy trung bình các mức trung bình của ngày/tuần có đơn. Không có đơn
            hiển thị “—”.
          </p>
          <p>
            Lượt theo khung giờ chỉ dùng cho loại Theo giờ: chọn nhóm giờ bắt
            đầu có nhiều lượt nhất; nếu hòa chọn giờ sớm hơn. Khoảng đầu/cuối là
            trung bình các đơn trong nhóm, không phải thống kê công suất theo
            thời gian sử dụng phòng.
          </p>
          <p>
            Số dư toàn hệ thống dùng tiền tồn từng tháng; chi nhánh/phòng lũy kế
            khoản được gán, không tự chia tiền tồn chung. Cấu hình và kết quả
            không lưu DB. Xuất file trước khi đóng trang.
          </p>
        </details>
      </section>
      {chart &&
        data &&
        !tooLarge &&
        chartRows.length > 0 &&
        chartLeaves.length <= 8 &&
        chartLeaves.map((l) => (
          <BieuDoThongKe
            key={l.key}
            comparisonOnly={comparisonOnly}
            title={
              tenCot(l.c) + " · " + l.c.loaiDat.join(", ") + " · " + l.b.ten
            }
            unit={CHI_SO.find((m) => m[0] === l.c.chiSo)?.[2] || ""}
            points={chartRows.map((p) => ({
              id: p.key,
              ten: p.ten,
              value: tinhGiaTri(data, p, l.c, l.b.ngay),
            }))}
          />
        ))}
    </section>
  );
}

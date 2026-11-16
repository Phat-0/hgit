import { useLuaChonNoi, useBamNgoai } from "./lua-chon-noi";
import { useEffect, useMemo, useRef, useState } from "react";
import { NhieuKhoangNgay } from "./NhieuKhoangNgay";
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
  ngayCuaCot,
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
const CALCS = [
  { id: "tong", ten: "Tổng", mau: "#e5d9f2" },
  { id: "tb_ngay", ten: "Trung bình ngày", mau: "#d8eee5" },
  { id: "tb_tuan", ten: "Trung bình tuần", mau: "#f5e7d2" },
];
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
      ? `${ngayNgan(c.tu)}–${ngayNgan(c.den)}` +
        (c.khoang && c.khoang.length > 1 ? ` · ${c.khoang.length} khoảng` : "")
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
  const rowAnchor = useRef<string | null>(null);
  const selection = useRef<{
    start: number;
    base: string[];
    add: boolean;
  } | null>(null);
  const [sortRows, setSortRows] = useState("manual");
  const [chartTu, setChartTu] = useState(tu),
    [chartDen, setChartDen] = useState(den);
  useEffect(() => {
    const stop = () => {
      selection.current = null;
    };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, []);

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
      .flatMap((c) =>
        c.khoang?.length ? c.khoang : [{ tu: c.tu, den: c.den }],
      ),
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
            {
              key: "tong_phong",
              id: "tong_phong",
              loai: "tong_phong",
              ten: "Tổng phòng",
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
              ten: p.ma_phong || p.ten_phong,
            })),
          ],
    [data],
  );
  const rows = useMemo(
    () =>
      scopes
        .filter((p) => chosenScopes.includes(p.key))
        .sort((a, b) => {
          if (sortRows === "az" || sortRows === "za")
            return (
              (sortRows === "za" ? -1 : 1) *
              a.ten.localeCompare(b.ten, "vi", { numeric: true })
            );
          if (sortRows === "asc" || sortRows === "desc") {
            const col = columns[0];
            const dates = col
              ? nhomNgay(col, tu, den).flatMap((b) => b.ngay)
              : [];
            const diff =
              data && col
                ? (tinhGiaTri(data, a, col, dates) || 0) -
                  (tinhGiaTri(data, b, col, dates) || 0)
                : 0;
            return (sortRows === "desc" ? -1 : 1) * diff;
          }
          const ia = rowOrder.indexOf(a.key),
            ib = rowOrder.indexOf(b.key);
          return (
            (ia < 0 ? 1e6 : ia) - (ib < 0 ? 1e6 : ib) ||
            a.ten.localeCompare(b.ten, "vi", { numeric: true })
          );
        }),
    [scopes, chosenScopes, rowOrder, sortRows, columns, data, tu, den],
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
  const hasSubheaders = expanded.some(
    (g) => g.config.chia !== "chung" && g.bins.some((b) => b.ngay.length),
  );
  const headerRows = hasSubheaders ? 2 : 1;
  const tooLarge = leaves.length > 500 || leaves.length * rows.length > 50000;
  const chartRows = rows.filter((p) => selectedRows.includes(p.key));
  const comparisonOnly =
    chartRows.length > 1 &&
    (chartRows.some((p) => p.loai === "tong" || p.loai === "tong_phong") ||
      chartRows.some(
        (p) =>
          p.loai === "chi_nhanh" &&
          chartRows.some((r) => r.loai === "phong" && r.branch === p.id),
      ));
  const chartOptions = columns.flatMap((c) => {
    const days = ngayCuaCot(c, tu, den).filter(
      (d) => d >= chartTu && d <= chartDen,
    );
    return [
      {
        key: c.id + ":chung",
        c,
        b: { key: "chung", ten: "Cả kỳ", ngay: days },
      },
      ...days.map((d) => ({
        key: c.id + ":" + d,
        c,
        b: { key: d, ten: ngayNgan(d), ngay: [d] },
      })),
    ];
  });
  const chartLeaves = chartOptions.filter(
    (l) =>
      chartKeys.includes(l.key) &&
      l.b.ngay.some((d) => d >= chartTu && d <= chartDen),
  );
  function toggleScope(key: string) {
    setChosenScopes((old) =>
      old.includes(key) ? old.filter((k) => k !== key) : [...old, key],
    );
    setSelectedRows((old) => old.filter((k) => k !== key));
    mark();
  }
  function toggleRow(key: string) {
    rowAnchor.current = key;
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
    setSortRows("manual");
    setRowOrder(ids);
    mark();
  }
  function addColumn(metric: string, cachTinh = "tong") {
    const c = { ...newColumn(metric, tu, den), cachTinh };
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
      <span title={p.ten}>{p.ten}</span>
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
              <details>
                <summary>Chi nhánh</summary>
                <div>
                  {scopes.filter((p) => p.loai === "tong").map(scopeInput)}
                  {scopes.filter((p) => p.loai === "chi_nhanh").map(scopeInput)}
                </div>
              </details>
              <details>
                <summary>Phòng</summary>
                <div>
                  {scopes
                    .filter((p) => p.loai === "tong_phong")
                    .map(scopeInput)}
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
              {CALCS.map((group) => (
                <details key={group.id} className="tk-calc-options">
                  <summary>{group.ten}</summary>
                  <div>
                    {CHI_SO.map((m) => (
                      <button
                        type="button"
                        key={m[0]}
                        disabled={columns.length >= 20}
                        onClick={(e) => {
                          addColumn(m[0], group.id);
                          e.currentTarget
                            .closest(".tk-add-column")
                            ?.removeAttribute("open");
                        }}
                      >
                        {m[1]}
                      </button>
                    ))}
                  </div>
                </details>
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
                aria-label="Sắp xếp hàng thống kê"
                value={sortRows}
                onChange={(e) => {
                  setSortRows(e.target.value);
                  mark();
                }}
              >
                <option value="manual">Thứ tự kéo thả</option>
                <option value="az">A–Z</option>
                <option value="za">Z–A</option>
                <option value="asc">Giá trị nhỏ → lớn</option>
                <option value="desc">Giá trị lớn → nhỏ</option>
              </select>
              <small>Sắp xếp giá trị theo cột đầu tiên.</small>
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
          {CALCS.filter((group) =>
            columns.some((c) => c.cachTinh === group.id),
          ).map((group) => (
            <section className="tk-calc-group" key={group.id}>
              <h4>{group.ten}</h4>
              <div>
                {columns
                  .filter((c) => c.cachTinh === group.id)
                  .map((c) => (
                    <div
                      className="tk-value-chip"
                      key={c.id}
                      style={{ background: group.mau }}
                    >
                      <button
                        type="button"
                        title={tenCot(c)}
                        aria-pressed={editing === c.id}
                        onClick={() =>
                          setEditing(editing === c.id ? null : c.id)
                        }
                      >
                        {CHI_SO.find((m) => m[0] === c.chiSo)?.[1]}
                        {c.loaiDat.length ? " · " + c.loaiDat.join(", ") : ""}
                      </button>
                      <button
                        type="button"
                        className="tk-value-remove"
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
            </section>
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
                  thu: [...allDays],
                  ...(chia === "tuan" && !current.lichRieng
                    ? { lichRieng: true, tu: "", den: "", khoang: undefined }
                    : {}),
                });
              }}
            >
              <option value="chung">Chung</option>
              <option value="ngay">Theo ngày</option>
              <option value="tuan">Theo tuần</option>
            </select>
            <NhieuKhoangNgay
              ranges={
                current.lichRieng
                  ? current.khoang?.length
                    ? current.khoang
                    : current.tu
                      ? [{ tu: current.tu, den: current.den }]
                      : []
                  : [{ tu, den }]
              }
              onChange={(ranges) =>
                patch(current.id, {
                  lichRieng: true,
                  khoang: ranges,
                  tu: ranges[0]?.tu || "",
                  den: ranges.at(-1)?.den || "",
                })
              }
            />
            {current.lichRieng && (
              <button
                type="button"
                onClick={() =>
                  patch(current.id, {
                    lichRieng: false,
                    khoang: undefined,
                    tu,
                    den,
                  })
                }
              >
                Dùng lịch chung
              </button>
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
                  <th className="tk-row-check" rowSpan={headerRows}>
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
                  <th rowSpan={headerRows} className="tk-name">
                    Đối tượng
                  </th>
                  {expanded.map((g) => (
                    <th
                      key={g.config.id}
                      colSpan={g.bins.length}
                      rowSpan={
                        hasSubheaders &&
                        (g.config.chia === "chung" ||
                          !g.bins.some((b) => b.ngay.length))
                          ? 2
                          : 1
                      }
                    >
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
                {hasSubheaders && (
                  <tr>
                    {expanded
                      .filter(
                        (g) =>
                          g.config.chia !== "chung" &&
                          g.bins.some((b) => b.ngay.length),
                      )
                      .flatMap((g) =>
                        g.bins.map((b) => (
                          <th key={g.config.id + ":" + b.key}>
                            {b.ngay.length ? b.ten : ""}
                          </th>
                        )),
                      )}
                  </tr>
                )}
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr
                    key={p.key}
                    data-row-key={p.key}
                    aria-selected={selectedRows.includes(p.key)}
                    onPointerDown={(e) => {
                      if (
                        e.button !== 0 ||
                        e.altKey ||
                        (e.target as HTMLElement).closest("input,button")
                      )
                        return;
                      e.preventDefault();
                      const index = rows.findIndex((r) => r.key === p.key);
                      if (e.shiftKey && rowAnchor.current) {
                        const ai = rows.findIndex(
                          (r) => r.key === rowAnchor.current,
                        );
                        const range = rows
                          .slice(
                            Math.min(ai < 0 ? index : ai, index),
                            Math.max(ai < 0 ? index : ai, index) + 1,
                          )
                          .map((r) => r.key);
                        setSelectedRows(
                          e.ctrlKey || e.metaKey
                            ? [...new Set([...selectedRows, ...range])]
                            : range,
                        );
                        selection.current = null;
                      } else {
                        rowAnchor.current = p.key;
                        const add = !selectedRows.includes(p.key);
                        selection.current = {
                          start: index,
                          base: selectedRows.filter((k) => k !== p.key),
                          add,
                        };
                        setSelectedRows((old) =>
                          add
                            ? [...old, p.key]
                            : old.filter((k) => k !== p.key),
                        );
                      }
                      mark();
                    }}

                    onPointerEnter={() => {
                      const s = selection.current;
                      if (!s) return;
                      const i = rows.findIndex((r) => r.key === p.key);
                      const interval = rows
                        .slice(Math.min(s.start, i), Math.max(s.start, i) + 1)
                        .map((r) => r.key);
                      setSelectedRows(
                        s.add
                          ? [
                              ...new Set([
                                ...s.base,
                                ...rows
                                  .slice(
                                    Math.min(s.start, i),
                                    Math.max(s.start, i) + 1,
                                  )
                                  .map((r) => r.key),
                              ]),
                            ]
                          : s.base.filter((k) => !interval.includes(k)),
                      );
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
                        onChange={() => {}}
                        onClick={(e) => {
                          if (e.shiftKey && rowAnchor.current) {
                            const ai = rows.findIndex(
                                (r) => r.key === rowAnchor.current,
                              ),
                              bi = rows.findIndex((r) => r.key === p.key);
                            setSelectedRows(
                              rows
                                .slice(
                                  Math.min(ai < 0 ? bi : ai, bi),
                                  Math.max(ai < 0 ? bi : ai, bi) + 1,
                                )
                                .map((r) => r.key),
                            );
                            mark();
                          } else toggleRow(p.key);
                        }}
                      />
                    </td>
                    <th
                      scope="row"
                      className="tk-name"
                      title="Alt + kéo để đổi thứ tự hàng"
                      draggable
                      onDragStart={(e) => {
                        dragging.current = p.key;
                        e.dataTransfer.setData("text/plain", p.key);
                      }}
                      onDragEnd={() => {
                        dragging.current = "";
                      }}
                    >
                      <div>
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
          <details className="stc-check-picker tk-scope-picker">
            <summary>Đối tượng biểu đồ ({chartRows.length})</summary>
            <div>
              {[
                {
                  ten: "Tổng",
                  items: rows.filter(
                    (p) => p.loai === "tong" || p.loai === "tong_phong",
                  ),
                },
                {
                  ten: "Chi nhánh",
                  items: rows.filter((p) => p.loai === "chi_nhanh"),
                },
              ].map((group) => (
                <details key={group.ten}>
                  <summary>{group.ten}</summary>
                  <div>
                    {group.items.map((p) => (
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
              ))}
              <details>
                <summary>Phòng</summary>
                <div>
                  {data?.chi_nhanh.map((b) => (
                    <details className="tk-room-branch" key={b.id}>
                      <summary>{b.ten_homestay}</summary>
                      <div>
                        {rows
                          .filter(
                            (p) => p.loai === "phong" && p.branch === b.id,
                          )
                          .map((p) => (
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
                  ))}
                </div>
              </details>
            </div>
          </details>
          <details className="stc-check-picker tk-scope-picker tk-values-picker">
            <summary>Giá trị biểu đồ ({chartLeaves.length})</summary>
            <div>
              {CALCS.map((group) => (
                <details className="tk-calc-options" key={group.id}>
                  <summary>{group.ten}</summary>
                  <div>
                    {expanded
                      .filter((g) => g.config.cachTinh === group.id)
                      .map((g) => (
                        <details key={g.config.id} className="tk-metric-dates">
                          <summary>
                            {CHI_SO.find((m) => m[0] === g.config.chiSo)?.[1]}
                          </summary>
                          <div className="tk-date-options">
                            {chartOptions
                              .filter(
                                (l) =>
                                  l.c.id === g.config.id && l.b.ngay.length,
                              )
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
                                  {l.b.ten}
                                </label>
                              ))}
                          </div>
                        </details>
                      ))}
                  </div>
                </details>
              ))}
            </div>
          </details>
          <RangePicker
            compact
            quickMonth
            start={chartTu}
            end={chartDen}
            onChange={(a, b) => {
              setChartTu(a);
              setChartDen(b);
              mark();
            }}
          />
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
        chartLeaves.length > 0 && (
          <BieuDoThongKe
            comparisonOnly={
              comparisonOnly ||
              chartLeaves.some((a, i) =>
                chartLeaves.some(
                  (b, j) =>
                    j > i &&
                    a.c.id === b.c.id &&
                    a.b.ngay.some((d) => b.b.ngay.includes(d)),
                ),
              )
            }
            title="Biểu đồ thống kê"
            unit={
              new Set(
                chartLeaves.map(
                  (l) => CHI_SO.find((m) => m[0] === l.c.chiSo)?.[2],
                ),
              ).size === 1
                ? CHI_SO.find((m) => m[0] === chartLeaves[0].c.chiSo)?.[2] || ""
                : "nhiều đơn vị"
            }
            points={chartLeaves.flatMap((l) =>
              chartRows.map((p) => ({
                id: l.key + ":" + p.key,
                calc: CALCS.find((g) => g.id === l.c.cachTinh)?.ten || "Tổng",
                category:
                  p.loai === "phong"
                    ? "Phòng"
                    : p.loai === "chi_nhanh"
                      ? "Chi nhánh"
                      : "Tổng",
                branch:
                  p.loai === "phong"
                    ? data.chi_nhanh.find((b) => b.id === p.branch)
                        ?.ten_homestay
                    : undefined,
                unit: CHI_SO.find((m) => m[0] === l.c.chiSo)?.[2] || "",
                ten:
                  p.ten +
                  " · " +
                  tenCot(l.c) +
                  (l.b.key !== "chung" ? " · " + l.b.ten : ""),
                value: tinhGiaTri(
                  data,
                  p,
                  l.c,
                  l.b.ngay.filter((d) => d >= chartTu && d <= chartDen),
                ),
              })),
            )}
          />
        )}
    </section>
  );
}

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
  type CotThongKe,
  type DuLieuThongKe,
  type PhamVi,
} from "./thong-ke-thu-chi";
import BieuDoThongKe from "./BieuDoThongKe";
import "./thong-ke-thu-chi.css";
const allDays = [0, 1, 2, 3, 4, 5, 6];
function newColumn(metric: string, tu: string, den: string): CotThongKe {
  return {
    id: crypto.randomUUID(),
    chiSo: metric,
    cachTinh:
      metric === "gia_don" || metric === "thoi_gian" ? "tb_don" : "tong",
    chia: "chung",
    lichRieng: false,
    tu,
    den,
    thu: [...allDays],
    loaiDat: [],
    gio: [],
  };
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
  const [mode, setMode] = useState("tong"),
    [rowOrder, setRowOrder] = useState<string[]>([]),
    [excluded, setExcluded] = useState<string[]>([]),
    [editing, setEditing] = useState<string | null>(null);
  const [chart, setChart] = useState(false),
    [chartKey, setChartKey] = useState(""),
    [saved, setSaved] = useState(false);
  const dragging = useRef("");
  const mark = () => {
    setSaved(false);
    onDirtyChange(true);
  };
  const allRanges = [
    { tu, den },
    ...columns
      .filter((c) => c.lichRieng)
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
        "Lịch chung và các lịch riêng phải hợp lệ, tổng khoảng dữ liệu tối đa 367 ngày.",
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
  const scopes: PhamVi[] = useMemo(
    () =>
      !data
        ? []
        : mode === "tong"
          ? [{ id: "tong", loai: "tong", ten: "Tổng các chi nhánh" }]
          : mode === "chi_nhanh"
            ? data.chi_nhanh.map((b) => ({
                id: b.id,
                loai: "chi_nhanh",
                ten: b.ten_homestay,
              }))
            : data.phong.map((p) => ({
                id: p.id,
                loai: "phong",
                ten:
                  (data.chi_nhanh.find((b) => b.id === p.homestay_id)
                    ?.ten_homestay || "") +
                  " · " +
                  p.ten_phong,
              })),
    [data, mode],
  );
  const rows = scopes
    .filter((p) => !excluded.includes(p.id))
    .sort((a, b) => {
      const ia = rowOrder.indexOf(a.id),
        ib = rowOrder.indexOf(b.id);
      return (
        (ia < 0 ? 1e6 : ia) - (ib < 0 ? 1e6 : ib) ||
        a.ten.localeCompare(b.ten, "vi", { numeric: true })
      );
    });
  const expanded = useMemo(
    () => columns.map((c) => ({ config: c, bins: nhomNgay(c, tu, den) })),
    [columns, tu, den],
  );
  const leaves = expanded.flatMap((g) =>
    g.bins.map((b) => ({ key: g.config.id + ":" + b.key, c: g.config, b })),
  );
  const tooLarge = leaves.length > 500 || leaves.length * rows.length > 50000;
  const values = useMemo(
    () =>
      data && !tooLarge
        ? new Map(
            rows.map((p) => [
              p.id,
              leaves.map((l) => tinhGiaTri(data, p, l.c, l.b.ngay)),
            ]),
          )
        : new Map<string, (number | null)[]>(),
    [data, rows, leaves, tooLarge],
  );
  const activeChart = leaves.find((l) => l.key === chartKey) || leaves[0];
  function patch(id: string, x: Partial<CotThongKe>) {
    setColumns((old) => old.map((c) => (c.id === id ? { ...c, ...x } : c)));
    mark();
  }
  function moveRow(id: string, toId: string) {
    const ids = rows.map((p) => p.id),
      a = ids.indexOf(id),
      b = ids.indexOf(toId);
    if (a < 0 || b < 0 || a === b) return;
    ids.splice(a, 1);
    ids.splice(b, 0, id);
    setRowOrder(ids);
    mark();
  }
  function exportFile(format: string) {
    if (!data || loading || error || tooLarge) return;
    const headers1: OXuat[] = ["Đối tượng"],
      headers2: OXuat[] = ["Phạm vi"];
    for (const l of leaves) {
      headers1.push(
        tenCot(l.c) +
          " · " +
          (l.c.lichRieng ? "Lịch riêng " : "Lịch chung ") +
          (l.c.lichRieng ? l.c.tu : tu) +
          " → " +
          (l.c.lichRieng ? l.c.den : den),
      );
      headers2.push(
        l.b.ten +
          (l.c.loaiDat.length ? " · " + l.c.loaiDat.join(", ") : "") +
          (l.c.gio.length ? " · Giờ " + l.c.gio.join(", ") : "") +
          " · " +
          (CHI_SO.find((m) => m[0] === l.c.chiSo)?.[2] || ""),
      );
    }
    const table: OXuat[][] = [
      headers1,
      headers2,
      ...rows.map((p) => [
        p.ten,
        ...(values.get(p.id) || []).map((n) => (n === null ? "" : n)),
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
              ["Chỉ tiêu", "Quy tắc"],
              [
                "Đặt/hủy",
                "Theo ngày tạo đơn (giờ Việt Nam); lượt đặt chỉ tính đơn đã xác nhận/nhận/trả; hủy tính đơn đã hủy.",
              ],
              [
                "TB/ngày",
                "Chia cho tất cả ngày được chọn, bao gồm ngày bằng 0.",
              ],
              [
                "TB/tuần",
                "Chia cho số tuần T2–CN có ngày được chọn; tuần lẻ vẫn tính một tuần.",
              ],
              [
                "TB/đơn",
                "Chia cho số lượt đặt hợp lệ; không có đơn thì để trống.",
              ],
              [
                "Số dư toàn hệ thống",
                "Tiền tồn tháng + thu − chi từ đầu tháng tới ngày cuối.",
              ],
              [
                "Số dư chi nhánh/phòng",
                "Lũy kế thu − chi được gán cho đối tượng; không phân bổ tiền tồn chung.",
              ],
              [
                "Loại đặt/khung giờ",
                "Đếm lượt đặt hợp lệ theo bộ lọc; khung giờ theo giờ nhận phòng dự kiến.",
              ],
              ["Tệp xuất", "Các ô trống là không có mẫu số, không phải số 0."],
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
            phien_ban: 1,
            tu,
            den,
            pham_vi: mode,
            cot: columns,
            thu_tu: rows.map((r) => r.id),
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
  const kindOptions = [
    ...new Set([
      "Theo giờ",
      "Theo ngày",
      "Theo đêm",
      ...(data?.don.map((d) => d.hinh_thuc_dat) || []),
    ]),
  ];
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
          <select
            aria-label="Phạm vi thống kê"
            value={mode}
            onChange={(e) => {
              setMode(e.target.value);
              setRowOrder([]);
              setExcluded([]);
              mark();
            }}
          >
            <option value="tong">Tổng các chi nhánh</option>
            <option value="chi_nhanh">Chi nhánh</option>
            <option value="phong">Phòng</option>
          </select>
          <details className="stc-check-picker">
            <summary>Hàng hiển thị</summary>
            <div>
              {scopes.map((p) => (
                <label key={p.id}>
                  <input
                    type="checkbox"
                    checked={!excluded.includes(p.id)}
                    onChange={(e) => {
                      setExcluded((old) =>
                        e.target.checked
                          ? old.filter((x) => x !== p.id)
                          : [...old, p.id],
                      );
                      mark();
                    }}
                  />
                  {p.ten}
                </label>
              ))}
            </div>
          </details>
          <select
            aria-label="Thêm cột thống kê"
            value=""
            disabled={columns.length >= 20}
            onChange={(e) => {
              const c = newColumn(e.target.value, tu, den);
              setColumns((old) => [...old, c]);
              setEditing(c.id);
              mark();
            }}
          >
            <option value="" disabled>
              ＋ Thêm cột
            </option>
            {CHI_SO.map((m) => (
              <option key={m[0]} value={m[0]}>
                {m[1]}
              </option>
            ))}
          </select>
          <label>
            <input
              type="checkbox"
              checked={chart}
              onChange={(e) => {
                setChart(e.target.checked);
                mark();
              }}
            />
            Hiển thị biểu đồ
          </label>
          <button
            type="button"
            onClick={() => {
              setRevision((x) => x + 1);
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
                  !leaves.length ||
                  !rows.length ||
                  tooLarge
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
          <fieldset className="tk-column-editor">
            <legend>{tenCot(current)}</legend>
            <label>
              Chỉ số
              <select
                aria-label="Chỉ số cột"
                value={current.chiSo}
                onChange={(e) =>
                  patch(current.id, { chiSo: e.target.value, cachTinh: "tong" })
                }
              >
                {CHI_SO.map((m) => (
                  <option key={m[0]} value={m[0]}>
                    {m[1]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Cách tính
              <select
                aria-label="Cách tính cột"
                value={current.cachTinh}
                onChange={(e) =>
                  patch(current.id, { cachTinh: e.target.value })
                }
              >
                <option value="tong">
                  {current.chiSo === "so_du" ? "Số dư cuối kỳ" : "Tổng số liệu"}
                </option>
                <option value="tb_ngay">Trung bình / ngày đã chọn</option>
                <option value="tb_tuan">Trung bình / tuần đã chọn</option>
                {["gia_don", "thoi_gian"].includes(current.chiSo) && (
                  <option value="tb_don">Trung bình / lượt đặt</option>
                )}
              </select>
            </label>
            <label>
              Chia cột con
              <select
                aria-label="Chia cột thống kê"
                value={current.chia}
                onChange={(e) => patch(current.id, { chia: e.target.value })}
              >
                <option value="chung">Chung cả kỳ</option>
                <option value="ngay">Từng ngày</option>
                <option value="thu">Từng thứ</option>
                <option value="tuan">Từng tuần (T2–CN)</option>
              </select>
            </label>
            <label className="tk-check">
              <input
                type="checkbox"
                aria-label="Dùng lịch riêng cho cột"
                checked={current.lichRieng}
                onChange={(e) =>
                  patch(current.id, { lichRieng: e.target.checked, tu, den })
                }
              />
              Lịch riêng
            </label>
            {current.lichRieng && (
              <RangePicker
                compact
                quickMonth
                start={current.tu}
                end={current.den}
                onChange={(a, b) => patch(current.id, { tu: a, den: b })}
              />
            )}
            <div className="tk-weekdays">
              <span>Các thứ lấy số liệu</span>
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
            {!["thu", "chi", "so_du"].includes(current.chiSo) && (
              <>
                <details className="stc-check-picker">
                  <summary>
                    Loại đặt ({current.loaiDat.length || "Tất cả"})
                  </summary>
                  <div>
                    {kindOptions.map((t) => (
                      <label key={t}>
                        <input
                          type="checkbox"
                          checked={current.loaiDat.includes(t)}
                          onChange={(e) =>
                            patch(current.id, {
                              loaiDat: e.target.checked
                                ? [...current.loaiDat, t]
                                : current.loaiDat.filter((x) => x !== t),
                            })
                          }
                        />
                        {t}
                      </label>
                    ))}
                  </div>
                </details>
                <details className="stc-check-picker">
                  <summary>
                    Giờ nhận phòng ({current.gio.length || "Tất cả"})
                  </summary>
                  <div>
                    {Array.from({ length: 24 }, (_, i) => (
                      <label key={i}>
                        <input
                          type="checkbox"
                          checked={current.gio.includes(i)}
                          onChange={(e) =>
                            patch(current.id, {
                              gio: e.target.checked
                                ? [...current.gio, i]
                                : current.gio.filter((x) => x !== i),
                            })
                          }
                        />
                        {i}:00–{i + 1}:00
                      </label>
                    ))}
                  </div>
                </details>
              </>
            )}
            <button type="button" onClick={() => setEditing(null)}>
              Xong
            </button>
          </fieldset>
        )}
        {tooLarge && (
          <p role="alert">
            Bảng quá lớn (tối đa 500 cột con, 50.000 ô). Hãy thu hẹp lịch, đổi
            sang từng tuần hoặc bớt cột/hàng.
          </p>
        )}
        {data && !error && !tooLarge && (
          <div className="tk-sheet-scroll">
            <table className="tk-sheet">
              <thead>
                <tr>
                  <th rowSpan={2} className="tk-name">
                    Đối tượng
                  </th>
                  {expanded.map((g) => (
                    <th key={g.config.id} colSpan={Math.max(1, g.bins.length)}>
                      <button
                        type="button"
                        onClick={() => setEditing(g.config.id)}
                      >
                        {tenCot(g.config)}
                        <small>
                          {g.config.lichRieng ? "Lịch riêng" : "Lịch chung"} ·{" "}
                          {ngayNgan(g.config.lichRieng ? g.config.tu : tu)}–
                          {ngayNgan(g.config.lichRieng ? g.config.den : den)} ·{" "}
                          {CHI_SO.find((m) => m[0] === g.config.chiSo)?.[2]}
                          {g.config.loaiDat.length
                            ? " · " + g.config.loaiDat.join(", ")
                            : ""}
                          {g.config.gio.length
                            ? " · Giờ " + g.config.gio.join(", ")
                            : ""}
                        </small>
                      </button>
                    </th>
                  ))}
                </tr>
                <tr>
                  {expanded.flatMap((g) =>
                    g.bins.length
                      ? g.bins.map((b) => (
                          <th key={g.config.id + ":" + b.key}>{b.ten}</th>
                        ))
                      : [<th key={g.config.id}>Chưa chọn thứ</th>],
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((p, index) => (
                  <tr
                    key={p.id}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      moveRow(dragging.current, p.id);
                      dragging.current = "";
                    }}
                  >
                    <th scope="row" className="tk-name">
                      <div>
                        <button
                          draggable
                          aria-label={"Kéo hàng " + p.ten}
                          onDragStart={(e) => {
                            dragging.current = p.id;
                            e.dataTransfer.setData("text/plain", p.id);
                          }}
                          onDragEnd={() => {
                            dragging.current = "";
                          }}
                        >
                          ⠿
                        </button>
                        <span>{p.ten}</span>
                        <button
                          aria-label={"Đưa lên " + p.ten}
                          disabled={!index}
                          onClick={() => moveRow(p.id, rows[index - 1].id)}
                        >
                          ↑
                        </button>
                        <button
                          aria-label={"Đưa xuống " + p.ten}
                          disabled={index === rows.length - 1}
                          onClick={() => moveRow(p.id, rows[index + 1].id)}
                        >
                          ↓
                        </button>
                      </div>
                    </th>
                    {expanded.flatMap((g) =>
                      g.bins.length
                        ? g.bins.map((b) => (
                            <td tabIndex={0} key={g.config.id + ":" + b.key}>
                              {hienSo(tinhGiaTri(data, p, g.config, b.ngay))}
                            </td>
                          ))
                        : [<td key={g.config.id}>—</td>],
                    )}
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={1 + Math.max(1, leaves.length)}>
                      Chưa có đối tượng hiển thị.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {!columns.length && <p>Chọn “Thêm cột” để tạo bảng thống kê.</p>}
        <details className="tk-rules">
          <summary>Quy tắc tính số liệu</summary>
          <p>
            Thu/chi lấy từ sổ đã lưu. Đặt/hủy theo ngày tạo đơn tại Việt Nam;
            lượt đặt, giá và thời gian chỉ tính đơn đã xác nhận, nhận hoặc trả
            phòng. Thời gian là tổng số giờ lưu trú dự kiến. Khung giờ là giờ
            nhận phòng dự kiến; loại đặt/khung giờ đếm lượt đặt theo các bộ lọc
            đã chọn.
          </p>
          <p>
            TB/ngày chia cho mọi ngày được chọn (kể cả ngày bằng 0); TB/tuần
            chia cho số tuần T2–CN có ngày được chọn, kể cả tuần chưa đủ 7 ngày;
            TB/đơn chia cho lượt đặt hợp lệ. Không có mẫu số hiển thị “—”.
          </p>
          <p>
            Số dư toàn hệ thống = tiền tồn tháng + thu − chi từ đầu tháng. Chi
            nhánh/phòng chỉ lũy kế các khoản được gán cho đối tượng, không tự
            phân bổ tiền tồn chung. TB số dư là trung bình số dư cuối ngày hoặc
            cuối tuần được chọn. Bộ lọc thứ chỉ chọn các mốc xem số dư, không bỏ
            giao dịch của các ngày trước.
          </p>
          <p>
            Cấu hình bảng chỉ giữ trong phiên đang mở. Hãy xuất Excel/CSV/JSON
            trước khi rời trang. Không lưu cấu hình hoặc kết quả thống kê vào cơ
            sở dữ liệu.
          </p>
        </details>
      </section>
      {chart && data && !tooLarge && activeChart && (
        <>
          <label className="tk-chart-select">
            Chỉ số vẽ biểu đồ
            <select
              aria-label="Cột vẽ biểu đồ thống kê"
              value={activeChart.key}
              onChange={(e) => {
                setChartKey(e.target.value);
                mark();
              }}
            >
              {leaves.map((l) => (
                <option key={l.key} value={l.key}>
                  {tenCot(l.c)} · {l.b.ten}
                </option>
              ))}
            </select>
          </label>
          <BieuDoThongKe
            title={tenCot(activeChart.c) + " · " + activeChart.b.ten}
            unit={CHI_SO.find((m) => m[0] === activeChart.c.chiSo)?.[2] || ""}
            points={rows.map((p) => ({
              id: p.id,
              ten: p.ten,
              value: tinhGiaTri(data, p, activeChart.c, activeChart.b.ngay),
            }))}
          />
        </>
      )}
    </section>
  );
}

import {
  bangXuatThuChi,
  csvThuChi,
  xlsxThuChi,
  taiTep,
} from "./xuat-so-thu-chi";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { RangePicker } from "./RangePicker";
import { quanTriApi, vnd, ngayVN } from "./bao-cao-api";
import { docTienNghin, nghinDongDeSua } from "./tien-te";
import {
  tongVung,
  doiLoaiTien,
  ngayCuoiThang,
  type DongThuChi,
  type OChon,
} from "./so-thu-chi";
import BieuDoThuChi from "./BieuDoThuChi";
import ChungTuThuChi from "./ChungTuThuChi";
import { chuTrenMau } from "./ThietLapTrangThai";
import "./so-thu-chi.css";
type Data = {
  dong: DongThuChi[];
  tien_ton: { thang: string; so_tien: string; phien_ban: number };
  tong_thang: { thu: string; chi: string };
  truoc_ky?: string;
  chi_nhanh: { id: string; ten_homestay: string }[];
  phong: { id: string; homestay_id: string; ten_phong: string }[];
};
function NhapSoTien({
  value,
  onChange,
  label,
}: {
  value: string | number;
  onChange: (v: number) => void;
  label: string;
}) {
  const [editing, setEditing] = useState(false),
    [raw, setRaw] = useState("");
  return (
    <input
      aria-label={label}
      inputMode="decimal"
      title="Nhập nghìn đồng: 250 → 250.000; dấu âm là chi"
      value={editing ? raw : Number(value).toLocaleString("vi-VN")}
      onFocus={() => {
        setEditing(true);
        setRaw(
          (Number(value) < 0 ? "-" : "") +
            nghinDongDeSua(Math.abs(Number(value))),
        );
      }}
      onChange={(e) => {
        const s = e.target.value;
        setRaw(s);
        const amount = docTienNghin(s.replace(/^[+-]/, ""));
        e.currentTarget.setCustomValidity(
          amount === null ? "Nhập số tiền hợp lệ" : "",
        );
        if (amount !== null) onChange((s.startsWith("-") ? -1 : 1) * amount);
      }}
      onBlur={() => setEditing(false)}
    />
  );
}
export default function SoThuChi({
  token,
  initial,
}: {
  token: string;
  initial?: { tu_ngay?: string; den_ngay?: string };
}) {
  const [start, setStart] = useState(
      initial?.tu_ngay || ngayVN().slice(0, 7) + "-01",
    ),
    [end, setEnd] = useState(
      initial?.den_ngay || ngayCuoiThang(ngayVN().slice(0, 7)),
    ),
    [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState(""),
    [kind, setKind] = useState(""),
    [draft, setDraft] = useState<Record<string, DongThuChi>>({}),
    [opening, setOpening] = useState(0),
    [docs, setDocs] = useState(""),
    [a, setA] = useState<OChon | null>(null),
    [b, setB] = useState<OChon | null>(null),
    [sumStart, setSumStart] = useState(""),
    [sumEnd, setSumEnd] = useState("");
  const dragging = useRef(false),
    seq = useRef(0);
  const month = start.slice(0, 7);
  const load = useCallback(async () => {
    const n = ++seq.current;
    try {
      const d = await quanTriApi<Data>(
        token,
        "thu-chi?" + new URLSearchParams({ tu_ngay: start, den_ngay: end }),
      );
      if (n !== seq.current) return;
      setData(d);
      setOpening(Number(d.tien_ton.so_tien));
      setA(null);
      setB(null);
      setError("");
    } catch (e) {
      if (n === seq.current) {
        setError((e as Error).message);
        setData(null);
      }
    }
  }, [token, start, end]);
  useEffect(() => {
    void load();
    return () => {
      seq.current++;
    };
  }, [load]);
  useEffect(() => {
    const stop = () => {
      dragging.current = false;
    };
    window.addEventListener("pointerup", stop);
    window.addEventListener("blur", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("blur", stop);
    };
  }, []);
  const rows = (data?.dong || []).map((r) => draft[r.id] || r);
  const visible = rows.filter(
    (r) =>
      (!kind || r.loai === kind) &&
      (!query ||
        [
          r.ten,
          r.ghi_chu,
          data?.chi_nhanh.find((h) => h.id === r.homestay_id)?.ten_homestay,
          data?.phong.find((p) => p.id === r.phong_id)?.ten_phong,
        ]
          .join(" ")
          .toLocaleLowerCase("vi")
          .includes(query.toLocaleLowerCase("vi"))),
  );
  const hasDraft = Object.keys(draft).length > 0;
  const selected = tongVung(
      draft.moi ? [...visible, draft.moi] : visible,
      a,
      b,
    ),
    dateSum = rows
      .filter(
        (r) =>
          (!sumStart || r.ngay >= sumStart) && (!sumEnd || r.ngay <= sumEnd),
      )
      .reduce((s, r) => s + Number(r.so_tien), 0),
    filteredSum = visible.reduce((s, r) => s + Number(r.so_tien), 0);
  let running =
    Number(data?.tien_ton.so_tien || 0) + Number(data?.truoc_ky || 0);
  const balances = new Map<string, number>();
  for (const r of rows) {
    running += Number(r.so_tien);
    balances.set(r.id, running);
  }
  const [activeId, setActiveId] = useState("");
  const active =
    rows.find((r) => r.id === activeId) ||
    (activeId === "moi" ? draft.moi : undefined);
  function patch(row: DongThuChi, x: Partial<DongThuChi>) {
    setDraft((d) => ({ ...d, [row.id]: { ...row, ...x } }));
  }
  async function save(row: DongThuChi) {
    const inputs = document.querySelectorAll<HTMLInputElement>(
      '[data-row-id="' + row.id + '"] input',
    );
    for (const input of inputs) {
      if (!input.reportValidity()) return;
    }
    setBusy(true);
    try {
      await quanTriApi(
        token,
        "thu-chi" + (row.id === "moi" ? "" : "/" + row.id),
        row.id === "moi" ? "POST" : "PUT",
        row,
      );
      setDraft((d) => {
        const next = { ...d };
        delete next[row.id];
        return next;
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function newRow() {
    if (draft.moi) return;
    setActiveId("moi");
    setDraft((d) => ({
      ...d,
      moi: {
        id: "moi",
        ngay: start,
        ten: "",
        so_tien: 0,
        loai: "Thu",
        homestay_id: null,
        phong_id: null,
        ghi_chu: "",
        mau: "#ffffff",
        phien_ban: 0,
      },
    }));
  }
  if (draft.moi) balances.set("moi", running + Number(draft.moi.so_tien));
  function undo(row: DongThuChi) {
    setDraft((d) => {
      const n = { ...d };
      delete n[row.id];
      return n;
    });
  }
  async function removeRow(row: DongThuChi) {
    if (row.id === "moi") {
      undo(row);
      setActiveId("");
      return;
    }
    if (!window.confirm("Xóa khoản " + row.ten + "?")) return;
    setBusy(true);
    try {
      await quanTriApi(
        token,
        "thu-chi/" + row.id + "?phien_ban=" + row.phien_ban,
        "DELETE",
      );
      undo(row);
      setActiveId("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function exportFile(format: string) {
    if (!data) return;
    const selectedRows = format === "csv-loc" ? visible : data.dong;
    const savedBalances = new Map<string, number>();
    let balance = Number(data.tien_ton.so_tien) + Number(data.truoc_ky || 0);
    for (const r of data.dong) {
      balance += Number(r.so_tien);
      savedBalances.set(r.id, balance);
    }
    const table = bangXuatThuChi(
      selectedRows,
      data.chi_nhanh,
      data.phong,
      format === "csv-loc" ? balances : savedBalances,
    );
    const name = "so-thu-chi-" + start + "-" + end;
    if (format.startsWith("csv"))
      taiTep(name + ".csv", csvThuChi(table), "text/csv;charset=utf-8");
    else {
      const daily = new Map<string, { thu: number; chi: number }>();
      for (const r of data.dong) {
        const d = daily.get(r.ngay) || { thu: 0, chi: 0 };
        if (Number(r.so_tien) > 0) d.thu += Number(r.so_tien);
        else d.chi += Number(r.so_tien);
        daily.set(r.ngay, d);
      }
      taiTep(
        name + ".xlsx",
        xlsxThuChi([
          { name: "So thu chi", rows: table },
          {
            name: "Tong thang",
            rows: [
              ["Tháng", "Tiền tồn", "Thu", "Chi âm", "Số dư"],
              [
                month,
                Number(data.tien_ton.so_tien),
                Number(data.tong_thang.thu),
                Number(data.tong_thang.chi),
                Number(data.tien_ton.so_tien) +
                  Number(data.tong_thang.thu) +
                  Number(data.tong_thang.chi),
              ],
            ],
          },
          {
            name: "Thu chi ngay",
            rows: [
              ["Ngày", "Thu", "Chi âm", "Chênh lệch"],
              ...[...daily].map(([day, d]) => [
                day,
                d.thu,
                d.chi,
                d.thu + d.chi,
              ]),
            ],
          },
        ]),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
    }
  }
  const rowElements = (row: DongThuChi, index: number) => {
    const text = chuTrenMau(row.mau),
      getCell = (col: number, content: ReactNode) => (
        <td
          key={col}
          tabIndex={0}
          style={{ background: row.mau, color: text }}
          className={
            a &&
            b &&
            index >= Math.min(a.row, b.row) &&
            index <= Math.max(a.row, b.row) &&
            col >= Math.min(a.col, b.col) &&
            col <= Math.max(a.col, b.col)
              ? "stc-selected"
              : ""
          }
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest("button,a,input[type=color]"))
              return;
            if (e.shiftKey && a) {
              setB({ row: index, col });
              e.preventDefault();
            } else {
              setA({ row: index, col });
              setB({ row: index, col });
            }
            dragging.current = true;
          }}
          onPointerEnter={(e) => {
            if (dragging.current && e.buttons === 1) setB({ row: index, col });
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setA(null);
              setB(null);
            }
            if (
              e.shiftKey &&
              ["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(
                e.key,
              )
            ) {
              e.preventDefault();
              if (!a) setA({ row: index, col });
              const cur = b || { row: index, col };
              setB({
                row: Math.max(
                  0,
                  Math.min(
                    visible.length - 1,
                    cur.row +
                      (e.key === "ArrowDown"
                        ? 1
                        : e.key === "ArrowUp"
                          ? -1
                          : 0),
                  ),
                ),
                col: Math.max(
                  0,
                  Math.min(
                    7,
                    cur.col +
                      (e.key === "ArrowRight"
                        ? 1
                        : e.key === "ArrowLeft"
                          ? -1
                          : 0),
                  ),
                ),
              });
            }
          }}
        >
          {content}
        </td>
      );
    return (
      <tr
        key={row.id}
        data-row-id={row.id}
        onFocusCapture={() => setActiveId(row.id)}
        onPointerDown={() => setActiveId(row.id)}
        onContextMenu={(e) => {
          e.preventDefault();
          setActiveId(row.id);
        }}
        aria-label={"Dòng " + (row.ten || "mới")}
      >
        {getCell(
          0,
          <input
            type="date"
            aria-label="Ngày thu chi"
            value={row.ngay}
            onChange={(e) => patch(row, { ngay: e.target.value })}
          />,
        )}
        {getCell(
          1,
          <input
            aria-label="Tên thu chi"
            maxLength={200}
            value={row.ten}
            onChange={(e) => patch(row, { ten: e.target.value })}
          />,
        )}
        {getCell(
          2,
          <NhapSoTien
            label="Số tiền thu chi"
            value={row.so_tien}
            onChange={(n) =>
              patch(row, {
                so_tien: n,
                loai: n < 0 ? "Chi" : n > 0 ? "Thu" : row.loai,
              })
            }
          />,
        )}
        {getCell(
          3,
          <select
            aria-label="Thu hoặc chi"
            value={row.loai}
            onChange={(e) =>
              patch(row, {
                loai: e.target.value as "Thu" | "Chi",
                so_tien: doiLoaiTien(
                  Number(row.so_tien),
                  e.target.value as "Thu" | "Chi",
                ),
              })
            }
          >
            <option>Thu</option>
            <option>Chi</option>
          </select>,
        )}
        {getCell(
          4,
          <div className="stc-scope">
            <select
              aria-label="Chi nhánh dòng"
              value={row.homestay_id || ""}
              onChange={(e) =>
                patch(row, {
                  homestay_id: e.target.value || null,
                  phong_id: null,
                })
              }
            >
              <option value="">Toàn hệ thống</option>
              {data?.chi_nhanh.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.ten_homestay}
                </option>
              ))}
            </select>
            <select
              aria-label="Phòng dòng"
              value={row.phong_id || ""}
              onChange={(e) => {
                const p = data?.phong.find((x) => x.id === e.target.value);
                patch(row, {
                  phong_id: p?.id || null,
                  homestay_id: p?.homestay_id || row.homestay_id,
                });
              }}
            >
              <option value="">Không gán phòng</option>
              {data?.phong
                .filter(
                  (p) => !row.homestay_id || p.homestay_id === row.homestay_id,
                )
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.ten_phong}
                  </option>
                ))}
            </select>
          </div>,
        )}
        {getCell(
          5,
          <input
            aria-label="Ghi chú thu chi"
            maxLength={2000}
            value={row.ghi_chu}
            onChange={(e) => patch(row, { ghi_chu: e.target.value })}
          />,
        )}
        {getCell(
          6,
          <button
            title="Ảnh và tệp chứng từ"
            disabled={row.id === "moi" || busy}
            onClick={() => setDocs(row.id)}
          >
            ⌁ {row.so_chung_tu || 0} tệp
          </button>,
        )}
        {getCell(
          7,
          <span className="stc-balance">{vnd(balances.get(row.id) || 0)}</span>,
        )}
      </tr>
    );
  };
  return (
    <section className="stc-page">
      <section className="stc-block">
        <header className="stc-compact-header">
          <div className="stc-title-row">
            <h2>Sổ thu chi</h2>
            <div>
              <button
                disabled={busy}
                title="Làm mới"
                aria-label="Làm mới sổ"
                onClick={() => {
                  if (hasDraft && !window.confirm("Bỏ thay đổi chưa lưu?"))
                    return;
                  setDraft({});
                  setActiveId("");
                  void load();
                }}
              >
                ↻
              </button>
              <select
                aria-label="Xuất sổ thu chi"
                value=""
                disabled={!data}
                onChange={(e) => exportFile(e.target.value)}
              >
                <option value="" disabled>
                  ↗ Xuất file
                </option>
                <option value="xlsx">Excel · tất cả trong kỳ</option>
                <option value="csv">CSV · tất cả trong kỳ</option>
                <option value="csv-loc">CSV · dòng đang lọc</option>
              </select>
            </div>
          </div>
          <div className="stc-compact-toolbar">
            <input
              className="stc-search"
              aria-label="Tìm thu chi"
              placeholder="Tìm tên, ghi chú, chi nhánh, phòng"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setA(null);
                setB(null);
              }}
            />
            <RangePicker
              compact
              start={start}
              end={end}
              onChange={(s, e) => {
                if (
                  hasDraft &&
                  !window.confirm("Bỏ thay đổi chưa lưu để đổi ngày?")
                )
                  return;
                setDraft({});
                setStart(s);
                setEnd(e);
              }}
            />
            <div
              className="stc-kind-tabs"
              role="group"
              aria-label="Lọc thu chi"
            >
              {[
                ["", "Tổng"],
                ["Thu", "Thu"],
                ["Chi", "Chi"],
              ].map(([k, label]) => (
                <button
                  key={k}
                  aria-pressed={kind === k}
                  onClick={() => {
                    setKind(k);
                    setA(null);
                    setB(null);
                  }}
                >
                  {label}
                  <small>
                    {vnd(
                      k === "Thu"
                        ? data?.tong_thang.thu
                        : k === "Chi"
                          ? data?.tong_thang.chi
                          : Number(data?.tien_ton.so_tien || 0) +
                            Number(data?.tong_thang.thu || 0) +
                            Number(data?.tong_thang.chi || 0),
                    )}
                  </small>
                </button>
              ))}
            </div>
            {data && (
              <label className="stc-opening">
                <span>Tiền tồn · {month.split("-").reverse().join("/")}</span>
                <NhapSoTien
                  label="Tiền tồn đầu tháng"
                  value={opening}
                  onChange={setOpening}
                />
                {opening !== Number(data.tien_ton.so_tien) && (
                  <button
                    disabled={busy || opening === Number(data.tien_ton.so_tien)}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await quanTriApi(token, "thu-chi/tien-ton", "PUT", {
                          thang: month,
                          so_tien: opening,
                          phien_ban: data.tien_ton.phien_ban,
                        });
                        await load();
                      } catch (e) {
                        setError((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Thay đổi
                  </button>
                )}
              </label>
            )}
          </div>
        </header>
        {error && <p role="alert">{error}</p>}
        <div className="stc-mini-hint">
          Nhập nghìn đồng · Chọn dòng để đổi màu, lưu hoặc xóa · Kéo qua ô để
          tính tổng{hasDraft ? " · Có thay đổi chưa lưu" : ""}
        </div>{" "}
        <div className="stc-sheet-scroll">
          <table className="stc-sheet">
            <thead>
              <tr>
                {[
                  "Ngày",
                  "Tên khoản thu / chi",
                  "Số tiền (đ)",
                  "Thu / chi",
                  "Chi nhánh / phòng",
                  "Ghi chú",
                  "Chứng từ",
                  "Số dư lũy kế (đ)",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map(rowElements)}
              {draft.moi && rowElements(draft.moi, visible.length)}
              {!visible.length && !draft.moi && (
                <tr>
                  <td colSpan={8}>
                    {!data
                      ? "Đang tải sổ thu chi…"
                      : "Chưa có dòng phù hợp. Nhấn dấu + bên dưới để bắt đầu."}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>
                  Tổng dòng đang hiển thị {hasDraft ? "(bản nháp)" : ""}
                </td>
                <td>{vnd(filteredSum)}</td>
                <td colSpan={5}>
                  {visible.length} dòng · Tiền tồn được quản lý riêng theo tháng
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="stc-table-footer">
          <button
            className="stc-add-row"
            aria-label="Thêm dòng thu chi"
            title="Thêm dòng thu chi"
            onClick={newRow}
            disabled={busy || !!draft.moi}
          >
            ＋
          </button>
        </div>
        {active && (
          <div className="stc-edit-tools">
            <span>{active.ten || "Dòng mới"}</span>
            <input
              type="color"
              aria-label="Màu hàng"
              value={active.mau}
              onChange={(e) => patch(active, { mau: e.target.value })}
            />
            {draft[active.id] && (
              <>
                <button
                  disabled={busy}
                  aria-label="Lưu dòng"
                  onClick={() => void save(active)}
                >
                  ✓ Lưu
                </button>
                <button disabled={busy} onClick={() => undo(active)}>
                  ↶ Hoàn tác
                </button>
              </>
            )}
            <button
              disabled={busy}
              aria-label="Xóa dòng"
              onClick={() => void removeRow(active)}
            >
              ⌫ Xóa
            </button>
            <button title="Ẩn công cụ dòng" onClick={() => setActiveId("")}>
              ×
            </button>
          </div>
        )}
        <div className="stc-selection">
          <strong>Tổng vùng: {vnd(selected)}</strong>
          <button
            onClick={() => {
              setA(null);
              setB(null);
            }}
          >
            Bỏ chọn
          </button>
          <span>Tổng theo ngày trong dữ liệu đã tải:</span>
          <input
            aria-label="Tính tổng từ ngày"
            type="date"
            min={start}
            max={end}
            value={sumStart}
            onChange={(e) => setSumStart(e.target.value)}
          />
          <span>→</span>
          <input
            aria-label="Tính tổng đến ngày"
            type="date"
            min={start}
            max={end}
            value={sumEnd}
            onChange={(e) => setSumEnd(e.target.value)}
          />
          <b>
            {sumStart && sumEnd && sumStart > sumEnd
              ? "Khoảng ngày không hợp lệ"
              : vnd(dateSum)}
          </b>
        </div>
      </section>
      {data && (
        <BieuDoThuChi
          rows={data.dong}
          branches={data.chi_nhanh}
          rooms={data.phong}
        />
      )}
      <details className="stc-howto">
        <summary>Quy tắc tính số dư và dữ liệu xuất</summary>
        <p>
          Sổ thu chi lưu riêng; không tự cộng doanh thu đặt phòng để tránh ghi
          nhận trùng. Số dư lũy kế tính từ tiền tồn tháng bắt đầu và các dòng đã
          lưu trước khoảng chọn. Biểu đồ theo khoảng ngày phía trên, không cộng
          tiền tồn.
        </p>
      </details>
      {docs && (
        <ChungTuThuChi
          token={token}
          id={docs}
          onClose={() => setDocs("")}
          onChanged={load}
        />
      )}
    </section>
  );
}

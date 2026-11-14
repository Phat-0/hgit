import { useDoRongCot } from "./ChinhDoRongCot";
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
  tongDong,
  doiLoaiTien,
  ngayCuoiThang,
  type DongThuChi,
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
    [chartData, setChartData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [query, setQuery] = useState(""),
    [kind, setKind] = useState(""),
    [draft, setDraft] = useState<Record<string, DongThuChi>>({}),
    [opening, setOpening] = useState(0),
    [docs, setDocs] = useState(""),
    [selectedIds, setSelectedIds] = useState<Set<string>>(new Set()),
    [sumStart, setSumStart] = useState(""),
    [sumEnd, setSumEnd] = useState("");
  const { widths, handle, frame } = useDoRongCot();
  const anchorId = useRef("");
  const dragging = useRef(false),
    seq = useRef(0);
  const [tableHeight, setTableHeight] = useState(() => {
    try {
      const n = Number(localStorage.getItem("so-thu-chi:chieu-cao"));
      return n >= 220 && n <= 1000 ? n : 360;
    } catch {
      return 360;
    }
  });
  const heightDrag = useRef<{ y: number; height: number } | null>(null);
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (heightDrag.current)
        setTableHeight(
          Math.max(
            220,
            Math.min(
              1000,
              heightDrag.current.height + e.clientY - heightDrag.current.y,
            ),
          ),
        );
    };
    const stop = () => {
      heightDrag.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("blur", stop);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("blur", stop);
    };
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("so-thu-chi:chieu-cao", String(tableHeight));
    } catch {}
  }, [tableHeight]);
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
      setChartData(d);
      setOpening(Number(d.tien_ton.so_tien));
      setSelectedIds(new Set());
      setError("");
    } catch (e) {
      if (n === seq.current) {
        setError((e as Error).message);
        setData(null);
      }
    }
  }, [token, start, end]);
  useEffect(() => {
    setData(null);
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
      !!draft[r.id] ||
      ((!kind || r.loai === kind) &&
        (!query ||
          [
            r.ten,
            r.ghi_chu,
            data?.chi_nhanh.find((h) => h.id === r.homestay_id)?.ten_homestay,
            data?.phong.find((p) => p.id === r.phong_id)?.ten_phong,
          ]
            .join(" ")
            .toLocaleLowerCase("vi")
            .includes(query.toLocaleLowerCase("vi")))),
  );
  const hasDraft = Object.keys(draft).length > 0;
  const displayRows = draft.moi ? [...visible, draft.moi] : visible;
  const selectedRows = displayRows.filter((r) => selectedIds.has(r.id));
  const dateStats = tongDong(
    rows.filter(
      (r) => (!sumStart || r.ngay >= sumStart) && (!sumEnd || r.ngay <= sumEnd),
    ),
  );

  let running =
    Number(data?.tien_ton.so_tien || 0) + Number(data?.truoc_ky || 0);
  const balances = new Map<string, number>();
  for (const r of rows) {
    running += Number(r.so_tien);
    balances.set(r.id, running);
  }

  function patch(row: DongThuChi, x: Partial<DongThuChi>) {
    setDraft((d) => ({ ...d, [row.id]: { ...row, ...x } }));
  }
  async function saveSelected() {
    const changed = selectedRows.filter((r) => draft[r.id]);
    if (!changed.length) return;
    for (const row of changed) {
      for (const input of document.querySelectorAll<HTMLInputElement>(
        '[data-row-id="' + row.id + '"] input',
      ))
        if (!input.reportValidity()) return;
    }
    setBusy(true);
    const failed: string[] = [];
    for (const row of changed) {
      try {
        await quanTriApi(
          token,
          "thu-chi" + (row.id === "moi" ? "" : "/" + row.id),
          row.id === "moi" ? "POST" : "PUT",
          row,
        );
        undo(row);
      } catch (e) {
        failed.push(row.ten + ": " + (e as Error).message);
      }
    }
    await load();
    if (failed.length) setError(failed.join(" · "));
    setBusy(false);
  }
  function newRow() {
    if (draft.moi) return;
    setSelectedIds(new Set(["moi"]));
    setDraft((d) => ({
      ...d,
      moi: {
        id: "moi",
        ngay: ngayVN(),
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
    if (row.id === "moi")
      setSelectedIds((ids) => {
        const next = new Set(ids);
        next.delete("moi");
        return next;
      });
    setDraft((d) => {
      const n = { ...d };
      delete n[row.id];
      return n;
    });
  }
  async function removeSelected() {
    if (
      !selectedRows.length ||
      !window.confirm("Xóa " + selectedRows.length + " hàng đã chọn?")
    )
      return;
    setBusy(true);
    const failed: string[] = [];
    for (const row of selectedRows) {
      try {
        if (row.id !== "moi")
          await quanTriApi(
            token,
            "thu-chi/" + row.id + "?phien_ban=" + row.phien_ban,
            "DELETE",
          );
        undo(row);
      } catch (e) {
        failed.push(row.ten + ": " + (e as Error).message);
      }
    }
    await load();
    if (failed.length) setError("Các hàng chưa xóa: " + failed.join(" · "));
    setBusy(false);
  }
  function selectRange(id: string) {
    const first = displayRows.findIndex((r) => r.id === anchorId.current),
      last = displayRows.findIndex((r) => r.id === id);
    if (first < 0 || last < 0) {
      setSelectedIds(new Set([id]));
      return;
    }
    setSelectedIds(
      new Set(
        displayRows
          .slice(Math.min(first, last), Math.max(first, last) + 1)
          .map((r) => r.id),
      ),
    );
  }
  function toggleRow(id: string) {
    setSelectedIds((ids) => {
      const next = new Set(ids);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    anchorId.current = id;
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
        <td key={col} style={{ background: row.mau, color: text }}>
          {content}
        </td>
      );
    return (
      <tr
        key={row.id}
        data-row-id={row.id}
        aria-selected={selectedIds.has(row.id)}
        className={selectedIds.has(row.id) ? "stc-selected-row" : ""}
        tabIndex={0}
        onFocusCapture={(e) => {
          if (
            e.target === e.currentTarget ||
            (e.target as HTMLElement).closest("[data-row-check]")
          )
            return;
          if (!selectedIds.has(row.id)) setSelectedIds(new Set([row.id]));
        }}
        onPointerDown={(e) => {
          if (
            busy ||
            (e.target as HTMLElement).closest("[data-row-check],button,a")
          )
            return;
          const interactive = !!(e.target as HTMLElement).closest(
            "input,select",
          );
          if (e.shiftKey && !interactive) {
            e.preventDefault();
            selectRange(row.id);
          } else if (e.ctrlKey || e.metaKey) {
            toggleRow(row.id);
          } else if (!selectedIds.has(row.id) || !interactive) {
            setSelectedIds(new Set([row.id]));
            anchorId.current = row.id;
          }
          dragging.current = !interactive;
        }}
        onPointerEnter={(e) => {
          if (dragging.current && e.buttons === 1) selectRange(row.id);
        }}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === " ") {
            e.preventDefault();
            toggleRow(row.id);
          }
          if (e.key === "Escape") setSelectedIds(new Set());
          if (e.shiftKey && ["ArrowUp", "ArrowDown"].includes(e.key)) {
            e.preventDefault();
            const next =
              displayRows[
                Math.max(
                  0,
                  Math.min(
                    displayRows.length - 1,
                    index + (e.key === "ArrowDown" ? 1 : -1),
                  ),
                )
              ];
            if (!anchorId.current) anchorId.current = row.id;
            selectRange(next.id);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          if (!selectedIds.has(row.id)) setSelectedIds(new Set([row.id]));
        }}
        aria-label={"Dòng " + (row.ten || "mới")}
      >
        <td className="stc-select-cell" data-row-check>
          <input
            type="checkbox"
            aria-label={"Chọn hàng " + (row.ten || "mới")}
            checked={selectedIds.has(row.id)}
            disabled={busy}
            onChange={() => toggleRow(row.id)}
          />
        </td>
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
          </div>
          <div className="stc-compact-toolbar">
            <input
              className="stc-search"
              aria-label="Tìm thu chi"
              placeholder="Tìm tên, ghi chú, chi nhánh, phòng"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIds(new Set());
              }}
            />
            <RangePicker
              disabled={busy}
              quickMonth
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
                setSumStart("");
                setSumEnd("");
              }}
            />
            <div className="stc-header-actions">
              <button
                disabled={busy}
                title="Làm mới"
                aria-label="Làm mới sổ"
                onClick={() => {
                  if (hasDraft && !window.confirm("Bỏ thay đổi chưa lưu?"))
                    return;
                  setDraft({});
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
        </header>
        {error && <p role="alert">{error}</p>}
        <div className="stc-ledger-actions">
          <div className="stc-row-tools">
            <input
              type="color"
              aria-label="Màu hàng đã chọn"
              title="Chọn màu cho các hàng được chọn"
              disabled={busy || !selectedRows.length}
              value={selectedRows[0]?.mau || "#ffffff"}
              onChange={(e) => {
                for (const row of selectedRows)
                  patch(row, { mau: e.target.value });
              }}
            />
            <button
              title="Xóa hàng đã chọn"
              aria-label="Xóa hàng đã chọn"
              disabled={busy || !selectedRows.length}
              onClick={() => void removeSelected()}
            >
              ⌫
            </button>
            {selectedRows.some((r) => draft[r.id]) && (
              <>
                <button
                  aria-label="Lưu hàng đã chọn"
                  disabled={busy}
                  onClick={() => void saveSelected()}
                >
                  ✓ Lưu
                </button>
                <button
                  title="Hoàn tác hàng đã chọn"
                  aria-label="Hoàn tác hàng đã chọn"
                  disabled={busy}
                  onClick={() => {
                    for (const row of selectedRows) undo(row);
                  }}
                >
                  ↶
                </button>
              </>
            )}
            <small>
              {selectedRows.length ? selectedRows.length + " hàng đã chọn" : ""}
            </small>
          </div>
          <div className="stc-ledger-summary">
            {" "}
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
                    setSelectedIds(new Set());
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
        </div>
        <div
          className="stc-sheet-scroll"
          ref={frame}
          style={{ height: tableHeight }}
        >
          <table
            className="stc-sheet"
            style={{
              width: widths.reduce((a, b) => a + b, 36),
              minWidth: widths.reduce((a, b) => a + b, 36),
            }}
          >
            <colgroup>
              <col style={{ width: 36 }} />
              {widths.map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th className="stc-select-cell">
                  <input
                    type="checkbox"
                    aria-label="Chọn tất cả hàng hiển thị"
                    disabled={!displayRows.length || busy}
                    checked={
                      !!displayRows.length &&
                      displayRows.every((r) => selectedIds.has(r.id))
                    }
                    onChange={(e) =>
                      setSelectedIds(
                        e.target.checked
                          ? new Set(displayRows.map((r) => r.id))
                          : new Set(),
                      )
                    }
                  />
                </th>
                {[
                  "Ngày",
                  "Tên khoản thu / chi",
                  "Số tiền (đ)",
                  "Thu / chi",
                  "Chi nhánh / phòng",
                  "Ghi chú",
                  "Chứng từ",
                  "Số dư lũy kế (đ)",
                ].map((h, i) => (
                  <th key={h}>
                    {h}
                    {handle(i, h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody inert={busy}>
              {visible.map(rowElements)}
              {draft.moi && rowElements(draft.moi, visible.length)}
              {!visible.length && !draft.moi && (
                <tr>
                  <td colSpan={9}>
                    {!data
                      ? "Đang tải sổ thu chi…"
                      : "Chưa có dòng phù hợp. Nhấn dấu + bên dưới để bắt đầu."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="stc-table-footer">
          <span
            className="stc-height-resize"
            role="separator"
            tabIndex={0}
            aria-orientation="horizontal"
            aria-label="Chiều cao bảng"
            aria-valuenow={tableHeight}
            aria-valuemin={220}
            aria-valuemax={1000}
            title="Kéo để chỉnh chiều cao bảng"
            onPointerDown={(e) => {
              e.preventDefault();
              heightDrag.current = { y: e.clientY, height: tableHeight };
            }}
            onKeyDown={(e) => {
              if (!["ArrowUp", "ArrowDown", "Home"].includes(e.key)) return;
              e.preventDefault();
              setTableHeight((n) =>
                e.key === "Home"
                  ? 360
                  : Math.max(
                      220,
                      Math.min(1000, n + (e.key === "ArrowDown" ? 20 : -20)),
                    ),
              );
            }}
          />
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
        <div className="stc-selection">
          <div className="stc-row-selection-total">
            <button
              title="Bỏ chọn hàng"
              aria-label="Bỏ chọn hàng"
              disabled={!selectedIds.size}
              onClick={() => {
                setSelectedIds(new Set());
              }}
            >
              ⊠
            </button>
            <strong>Đã chọn {selectedRows.length} hàng</strong>
          </div>
          <div className="stc-period-total">
            <RangePicker
              compact
              quickMonth
              start={sumStart || start}
              end={sumEnd || end}
              minDate={start}
              maxDate={end}
              onChange={(a, b) => {
                setSumStart(a);
                setSumEnd(b);
              }}
            />
            <div className="stc-period-stats">
              <span className="stc-sum-total">
                Tổng <b>{vnd(dateStats.tong)}</b>
              </span>
              <span className="stc-sum-income">
                Thu <b>{vnd(dateStats.thu)}</b>
              </span>
              <span className="stc-sum-expense">
                Chi <b>{vnd(dateStats.chi)}</b>
              </span>
            </div>
          </div>
        </div>
      </section>
      {chartData && (
        <BieuDoThuChi
          token={token}
          start={start}
          end={end}
          rows={chartData.dong}
          branches={chartData.chi_nhanh}
          rooms={chartData.phong}
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

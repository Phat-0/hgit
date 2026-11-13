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
        <td className="stc-row-actions">
          <input
            type="color"
            title="Màu hàng, nhấn Lưu để áp dụng"
            aria-label="Màu hàng"
            value={row.mau}
            onChange={(e) => patch(row, { mau: e.target.value })}
          />
          <button
            title="Lưu dòng"
            aria-label="Lưu dòng"
            disabled={busy || !draft[row.id]}
            onClick={() => void save(row)}
          >
            ✓
          </button>
          <button
            title="Bỏ thay đổi dòng"
            disabled={busy || !draft[row.id]}
            onClick={() =>
              setDraft((d) => {
                const n = { ...d };
                delete n[row.id];
                return n;
              })
            }
          >
            ↶
          </button>
          <button
            title="Xóa dòng"
            aria-label="Xóa dòng"
            disabled={busy}
            onClick={async () => {
              if (row.id === "moi") {
                setDraft((d) => {
                  const n = { ...d };
                  delete n.moi;
                  return n;
                });
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
                setDraft((d) => {
                  const n = { ...d };
                  delete n[row.id];
                  return n;
                });
                await load();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            ×
          </button>
        </td>
      </tr>
    );
  };
  return (
    <section className="stc-page">
      <section className="stc-block">
        <header>
          <h2>Sổ thu chi</h2>
          <div className="stc-tools">
            <input
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
                  !window.confirm("Bỏ thay đổi chưa lưu để đổi khoảng ngày?")
                )
                  return;
                setDraft({});
                setStart(s);
                setEnd(e);
              }}
            />
            <select
              aria-label="Lọc thu chi"
              value={kind}
              onChange={(e) => {
                setKind(e.target.value);
                setA(null);
                setB(null);
              }}
            >
              <option value="">Thu và chi</option>
              <option>Thu</option>
              <option>Chi</option>
            </select>
            <button onClick={newRow} disabled={busy || !!draft.moi}>
              ＋ Thêm dòng
            </button>
            <button
              disabled={busy}
              onClick={() => {
                if (
                  hasDraft &&
                  !window.confirm("Bỏ thay đổi chưa lưu và tải lại?")
                )
                  return;
                setDraft({});
                void load();
              }}
            >
              Làm mới
            </button>
          </div>
        </header>
        {error && <p role="alert">{error}</p>}
        {data ? (
          <>
            <div className="stc-totals">
              <label>
                Tiền tồn tháng {month.split("-").reverse().join("/")}
                <NhapSoTien
                  label="Tiền tồn đầu tháng"
                  value={opening}
                  onChange={setOpening}
                />
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
                  Lưu tiền tồn
                </button>
              </label>
              <div>
                <span>Thu cả tháng</span>
                <strong>{vnd(data.tong_thang.thu)}</strong>
              </div>
              <div>
                <span>Chi cả tháng</span>
                <strong>{vnd(data.tong_thang.chi)}</strong>
              </div>
              <div>
                <span>Tổng tiền tháng {month.slice(5)} · tồn + thu − chi</span>
                <strong>
                  {vnd(
                    Number(data.tien_ton.so_tien) +
                      Number(data.tong_thang.thu) +
                      Number(data.tong_thang.chi),
                  )}
                </strong>
              </div>
            </div>
            <p className="stc-hint">
              Nhập tiền theo nghìn đồng. Thu là số dương, chi là số âm. Chọn màu
              rồi nhấn ✓ để lưu dòng. Kéo chuột qua ô hoặc Shift + phím mũi tên
              để chọn vùng; tổng vùng chỉ cộng cột Số tiền, không cộng tiền tồn.
              {hasDraft &&
                " Có thay đổi chưa lưu; biểu đồ và tổng tháng lấy dữ liệu đã lưu."}
            </p>
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
                      "Thao tác",
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
                      <td colSpan={9}>
                        Chưa có dòng phù hợp. Nhấn Thêm dòng để bắt đầu.
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
                    <td colSpan={6}>
                      {visible.length} dòng · Tiền tồn được quản lý riêng theo
                      tháng
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
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
          </>
        ) : (
          <p>Đang tải sổ thu chi…</p>
        )}
      </section>
      {data && (
        <BieuDoThuChi
          rows={data.dong}
          branches={data.chi_nhanh}
          rooms={data.phong}
        />
      )}
      <p className="stc-hint">
        Sổ thu chi lưu riêng; không tự cộng doanh thu đặt phòng để tránh ghi
        nhận trùng. Số dư lũy kế tính từ tiền tồn tháng bắt đầu và các dòng đã
        lưu trước khoảng chọn. Biểu đồ theo khoảng ngày phía trên, không cộng
        tiền tồn.
      </p>
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

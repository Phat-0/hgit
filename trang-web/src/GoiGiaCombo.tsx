import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { FormEvent } from "react";
import { createPortal } from "react-dom";
import { RangePicker } from "./RangePicker";
import NhapTien from "./NhapTien";
import "./combo.css";
type Branch = { id: string; ten_homestay: string };
type Room = {
  id: string;
  ten_phong: string;
  ma_phong: string;
  homestay_id: string;
  loai_phong_id: string;
  ten_loai: string;
};
type Scope = "toan_he_thong" | "chi_nhanh" | "phong";
type Combo = {
  id: string;
  ten_combo: string;
  gia_combo: number | string;
  so_gio_bao_gom: number | null;
  mo_ta: string | null;
  trang_thai: string;
  anh_dai_dien: string | null;
  bat_dau: string | null;
  ket_thuc: string | null;
  pham_vi: Scope;
  chi_nhanh_ids: string[];
  phong_ids: string[];
};
type Draft = {
  ten_combo: string;
  gia_combo: string;
  so_gio_bao_gom: string;
  mo_ta: string;
  bat_dau: string;
  ket_thuc: string;
  pham_vi: Scope;
  chi_nhanh_ids: string[];
  phong_ids: string[];
  trang_thai: string;
};
const money = (n: number | string) =>
  Number(n || 0).toLocaleString("vi-VN") + " ₫";
const localTime = (iso: string | null) =>
  iso
    ? new Date(new Date(iso).getTime() + 7 * 3600000).toISOString().slice(0, 16)
    : "";
const displayTime = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "Không giới hạn";
const blank = (): Draft => ({
  ten_combo: "",
  gia_combo: "",
  so_gio_bao_gom: "",
  mo_ta: "",
  bat_dau: localTime(new Date().toISOString()),
  ket_thuc:
    localTime(new Date(Date.now() + 30 * 86400000).toISOString()).slice(0, 10) +
    "T23:59",
  pham_vi: "toan_he_thong",
  chi_nhanh_ids: [],
  phong_ids: [],
  trang_thai: "Đang bán",
});
const toggle = (values: string[], id: string) =>
  values.includes(id) ? values.filter((x) => x !== id) : [...values, id];
async function request<T>(
  token: string,
  path = "",
  method = "GET",
  body?: FormData,
): Promise<T> {
  const r = await fetch("/api/quan-tri/combo" + path, {
    method,
    headers: { Authorization: "Bearer " + token },
    body,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok)
    throw Error(
      Array.isArray(j.message)
        ? j.message.join("; ")
        : j.message || "Không thực hiện được yêu cầu",
    );
  return j;
}
function Icon({ kind }: { kind: "edit" | "delete" | "search" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      {kind === "edit" ? (
        <>
          <path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15z" />
        </>
      ) : kind === "delete" ? (
        <>
          <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
        </>
      ) : (
        <>
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16 16 5 5" />
        </>
      )}
    </svg>
  );
}
export default function GoiGiaCombo({ token }: { token: string }) {
  const [combos, setCombos] = useState<Combo[]>([]),
    [branches, setBranches] = useState<Branch[]>([]),
    [rooms, setRooms] = useState<Room[]>([]);
  const [selected, setSelected] = useState<string | null>(null),
    [query, setQuery] = useState(""),
    [branch, setBranch] = useState(""),
    [at, setAt] = useState(""),
    [category, setCategory] = useState(""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [modal, setModal] = useState<
      "create" | "edit" | "delete" | "view" | null
    >(null),
    [editing, setEditing] = useState<Combo | null>(null),
    [draft, setDraft] = useState<Draft>(blank),
    [file, setFile] = useState<File | null>(null),
    [preview, setPreview] = useState(""),
    [busy, setBusy] = useState(false),
    [formError, setFormError] = useState(""),
    [hourly, setHourly] = useState(false),
    [roomBranch, setRoomBranch] = useState(""),
    [roomType, setRoomType] = useState("");
  const [now, setNow] = useState(Date.now());
  const grid = useRef<HTMLDivElement>(null),
    positions = useRef(new Map<string, DOMRect>()),
    trigger = useRef<HTMLElement | null>(null),
    dialog = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const j = await request<{
        combos: Combo[];
        chi_nhanh: Branch[];
        phong: Room[];
      }>(token);
      setCombos(j.combos);
      setBranches(j.chi_nhanh);
      setRooms(j.phong);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được Combo");
    } finally {
      setLoading(false);
    }
  }, [token]);
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [load]);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    if (!modal) return;
    trigger.current = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLElement>("button,input")?.focus();
    const key = (e: KeyboardEvent) => {
      if (document.querySelector(".lp-range-portal")) return;
      if (e.key === "Escape" && !busy) setModal(null);
      if (e.key === "Tab" && dialog.current) {
        const els = Array.from(
          dialog.current.querySelectorAll<HTMLElement>(
            "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled)",
          ),
        );
        const first = els[0],
          last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", key);
      trigger.current?.focus();
    };
  }, [modal, busy]);
  const branchIds = (c: Combo) =>
    c.pham_vi === "phong"
      ? [
          ...new Set(
            rooms
              .filter((r) => c.phong_ids.includes(r.id))
              .map((r) => r.homestay_id),
          ),
        ]
      : c.chi_nhanh_ids;
  const filtered = useMemo(
    () =>
      combos.filter(
        (c) =>
          (!category ||
            (category === "gio" ? !!c.so_gio_bao_gom : !c.so_gio_bao_gom)) &&
          (!branch ||
            c.pham_vi === "toan_he_thong" ||
            (c.pham_vi === "phong"
              ? rooms.some(
                  (r) => r.homestay_id === branch && c.phong_ids.includes(r.id),
                )
              : c.chi_nhanh_ids.includes(branch))) &&
          (!at ||
            ((!c.bat_dau ||
              new Date(c.bat_dau) < new Date(at + "T23:59:59.999+07:00")) &&
              (!c.ket_thuc ||
                new Date(c.ket_thuc) > new Date(at + "T00:00:00+07:00")))) &&
          c.ten_combo
            .toLocaleLowerCase("vi")
            .includes(query.trim().toLocaleLowerCase("vi")),
      ),
    [combos, branch, at, query, rooms, category],
  );
  const today = localTime(new Date().toISOString()).slice(0, 10);
  const availableRooms = rooms.filter(
    (r) =>
      (!roomBranch || r.homestay_id === roomBranch) &&
      (!roomType || r.loai_phong_id === roomType),
  );
  const active = combos.find((c) => c.id === selected);
  const ongoing = (c: Combo) =>
    c.trang_thai === "Đang bán" &&
    (!c.bat_dau || new Date(c.bat_dau).getTime() <= now) &&
    (!c.ket_thuc || new Date(c.ket_thuc).getTime() > now);
  // FLIP giữ chuyển động của từng thẻ khi đổi số cột/mở bảng chi tiết.
  useLayoutEffect(() => {
    const cards = grid.current?.querySelectorAll<HTMLElement>("[data-combo]");
    const next = new Map<string, DOMRect>();
    cards?.forEach((el) => {
      const id = el.dataset.combo!,
        rect = el.getBoundingClientRect(),
        old = positions.current.get(id);
      next.set(id, rect);
      if (
        old &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        const dx = old.left - rect.left,
          dy = old.top - rect.top;
        if (dx || dy || old.width !== rect.width)
          el.animate(
            [
              {
                transform: `translate(${dx}px,${dy}px) scale(${old.width / rect.width},${old.height / rect.height})`,
              },
              { transform: "none" },
            ],
            { duration: 320, easing: "cubic-bezier(.2,.8,.2,1)" },
          );
      }
    });
    positions.current = next;
  }, [selected, filtered]);
  function open(mode: "create" | "edit", c?: Combo) {
    setEditing(c ?? null);
    setDraft(
      c
        ? {
            ten_combo: c.ten_combo,
            gia_combo: String(c.gia_combo),
            so_gio_bao_gom: String(c.so_gio_bao_gom || ""),
            mo_ta: c.mo_ta || "",
            bat_dau: localTime(c.bat_dau),
            ket_thuc: localTime(c.ket_thuc),
            pham_vi: c.pham_vi,
            chi_nhanh_ids: [...c.chi_nhanh_ids],
            phong_ids: [...c.phong_ids],
            trang_thai: c.trang_thai,
          }
        : blank(),
    );
    setHourly(!!c?.so_gio_bao_gom);
    setRoomBranch("");
    setRoomType("");
    setFile(null);
    setFormError("");
    setModal(mode);
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (modal === "create" && !file) {
      setFormError("Vui lòng chọn tệp ảnh combo.");
      return;
    }
    if (
      (draft.pham_vi === "chi_nhanh" && !draft.chi_nhanh_ids.length) ||
      (draft.pham_vi === "phong" && !draft.phong_ids.length)
    ) {
      setFormError("Chọn ít nhất một chi nhánh hoặc phòng áp dụng.");
      return;
    }
    const start = new Date(draft.bat_dau + ":00+07:00"),
      end = new Date(draft.ket_thuc + ":00+07:00");
    if (
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      start >= end
    ) {
      setFormError("Thời gian kết thúc phải sau thời gian bắt đầu.");
      return;
    }
    setBusy(true);
    setFormError("");
    try {
      const body = new FormData();
      body.append(
        "du_lieu",
        JSON.stringify({
          ...draft,
          gia_combo: Number(draft.gia_combo),
          so_gio_bao_gom: hourly ? Number(draft.so_gio_bao_gom) : null,
          bat_dau: start.toISOString(),
          ket_thuc: end.toISOString(),
        }),
      );
      if (file) body.append("file", file);
      const result = await request<{ id: string }>(
        token,
        editing ? "/" + editing.id : "",
        editing ? "PUT" : "POST",
        body,
      );
      setModal(null);
      setSelected(result.id);
      setNotice(editing ? "Đã cập nhật combo." : "Đã tạo combo.");
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Không lưu được combo");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!editing) return;
    setBusy(true);
    setFormError("");
    try {
      await request(token, "/" + editing.id, "DELETE");
      setSelected(null);
      setModal(null);
      setNotice("Đã xóa combo.");
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Không xóa được combo");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="gc-page combo-page">
      <header className="cm-header">
        <h1>
          Combo <small>{combos.length}</small>
        </h1>
        <div className="cm-tools">
          <label className="cm-search">
            <Icon kind="search" />
            <input
              aria-label="Tìm chương trình"
              placeholder="Tìm chương trình…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="Lọc chi nhánh"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
          >
            <option value="">Tất cả chi nhánh</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.ten_homestay}
              </option>
            ))}
          </select>
          <input
            aria-label="Lọc ngày áp dụng"
            type="date"
            value={at}
            onChange={(e) => setAt(e.target.value)}
          />
          {(query || branch || at) && (
            <button
              className="cm-clear"
              onClick={() => {
                setQuery("");
                setBranch("");
                setAt("");
              }}
            >
              Bỏ lọc
            </button>
          )}
        </div>
        <div className="cm-list-actions">
          <select
            aria-label="Phân loại combo"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Tất cả combo</option>
            <option value="dich_vu">Combo dịch vụ</option>
            <option value="gio">Combo giờ</option>
          </select>
          <button
            className="cm-refresh"
            disabled={loading}
            onClick={() => void load()}
          >
            ↻ Làm mới
          </button>
        </div>
        <button className="cm-primary" onClick={() => open("create")}>
          + Tạo mới
        </button>
      </header>
      {error && (
        <div className="cm-alert" role="alert">
          {error}
          <button onClick={() => void load()}>Thử lại</button>
        </div>
      )}
      {notice && (
        <p className="cm-notice" role="status">
          {notice}
        </p>
      )}
      <div className="cm-gallery">
        <div className="cm-cards" ref={grid} aria-busy={loading}>
          {filtered.map((c) => (
            <button
              data-combo={c.id}
              key={c.id}
              className={"cm-card" + (selected === c.id ? " cm-chosen" : "")}
              aria-expanded={modal === "view" && selected === c.id}
              aria-controls="combo-detail"
              onClick={() => {
                setSelected(c.id);
                setModal("view");
              }}
            >
              <div className="cm-photo">
                {c.anh_dai_dien ? (
                  <img src={c.anh_dai_dien} alt="" loading="lazy" />
                ) : (
                  <span className="cm-placeholder">COMBO</span>
                )}
                <span
                  className={"cm-live " + (ongoing(c) ? "running" : "stopped")}
                  title={ongoing(c) ? "Đang chạy" : "Không hoạt động"}
                  aria-label={ongoing(c) ? "Đang chạy" : "Không hoạt động"}
                >
                  {ongoing(c) ? "✓" : "●"}
                </span>
                <div className="cm-overlay">
                  <strong>{c.ten_combo}</strong>
                  <b>{money(c.gia_combo)}</b>
                  <small>
                    {c.so_gio_bao_gom
                      ? c.so_gio_bao_gom + " giờ"
                      : "Combo dịch vụ"}
                  </small>
                </div>
              </div>
            </button>
          ))}
          {!filtered.length && !error && (
            <div className="cm-empty">
              {loading
                ? "Đang tải combo…"
                : combos.length
                  ? "Không có combo phù hợp bộ lọc."
                  : "Chưa có combo. Nhấn Tạo mới để thêm chương trình."}
            </div>
          )}
        </div>
      </div>
      <div className="cm-bottom-count">
        Hiển thị {filtered.length} / {combos.length} combo
      </div>
      {modal &&
        createPortal(
          <div
            className="cm-shade"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !busy) setModal(null);
            }}
          >
            <div
              ref={dialog}
              className={
                "cm-dialog" +
                (modal === "delete"
                  ? " cm-confirm"
                  : modal === "view"
                    ? " cm-view-dialog"
                    : " cm-create-dialog")
              }
              role="dialog"
              aria-modal="true"
              aria-labelledby="cm-title"
            >
              <header>
                <h2 id="cm-title">
                  {modal === "view"
                    ? "Chi tiết combo"
                    : modal === "delete"
                      ? "Xóa combo"
                      : modal === "edit"
                        ? "Chỉnh sửa combo"
                        : "Tạo mới combo"}
                </h2>
                <button
                  aria-label="Đóng"
                  disabled={busy}
                  onClick={() => setModal(null)}
                >
                  ×
                </button>
              </header>
              {modal === "view" ? (
                <section
                  id="combo-detail"
                  className="cm-detail cm-detail-centered"
                >
                  <div className="cm-detail-head">
                    <span>Thông tin chương trình</span>
                    <div>
                      <button
                        aria-label="Chỉnh sửa combo"
                        onClick={() => open("edit", active!)}
                      >
                        <Icon kind="edit" />
                      </button>
                      <button
                        aria-label="Xóa combo"
                        className="cm-danger"
                        onClick={() => {
                          setEditing(active!);
                          setFormError("");
                          setModal("delete");
                        }}
                      >
                        <Icon kind="delete" />
                      </button>
                    </div>
                  </div>
                  {active!.anh_dai_dien && (
                    <img
                      className="cm-detail-image"
                      src={active!.anh_dai_dien}
                      alt=""
                    />
                  )}
                  <h2>{active!.ten_combo}</h2>
                  <strong className="cm-detail-price">
                    {money(active!.gia_combo)}
                  </strong>
                  <span
                    className={
                      "cm-status " + (ongoing(active!) ? "running" : "stopped")
                    }
                  >
                    {ongoing(active!)
                      ? "Đang chạy"
                      : active!.trang_thai === "Tạm ngưng"
                        ? "Tạm ngưng"
                        : active!.bat_dau &&
                            new Date(active!.bat_dau).getTime() > now
                          ? "Chưa đến thời gian áp dụng"
                          : "Đã hết thời gian áp dụng"}
                  </span>
                  <dl>
                    <dt>Loại combo</dt>
                    <dd>
                      {active!.so_gio_bao_gom
                        ? "Combo giờ · " +
                          active!.so_gio_bao_gom +
                          " giờ bao gồm"
                        : "Combo dịch vụ"}
                    </dd>
                    <dt>Chi nhánh</dt>
                    <dd>
                      {active!.pham_vi === "toan_he_thong"
                        ? "Toàn hệ thống"
                        : branches
                            .filter((b) => branchIds(active!).includes(b.id))
                            .map((b) => b.ten_homestay)
                            .join(", ") || "Chưa chọn"}
                    </dd>
                    <dt>Phòng áp dụng</dt>
                    <dd>
                      {active!.pham_vi === "phong"
                        ? rooms
                            .filter((r) => active!.phong_ids.includes(r.id))
                            .map(
                              (r) =>
                                (branches.find((b) => b.id === r.homestay_id)
                                  ?.ten_homestay || "") +
                                " · " +
                                r.ten_phong +
                                " (" +
                                r.ma_phong +
                                ")",
                            )
                            .join(", ")
                        : "Tất cả phòng trong phạm vi chi nhánh"}
                    </dd>
                    <dt>Bắt đầu</dt>
                    <dd>{displayTime(active!.bat_dau)}</dd>
                    <dt>Kết thúc</dt>
                    <dd>{displayTime(active!.ket_thuc)}</dd>
                    <dt>Trạng thái thiết lập</dt>
                    <dd>{active!.trang_thai}</dd>
                    <dt>Chi tiết</dt>
                    <dd className="cm-description">
                      {active!.mo_ta || "Chưa có mô tả"}
                    </dd>
                  </dl>
                </section>
              ) : modal === "delete" ? (
                <>
                  <p>
                    Xóa chương trình <strong>{editing?.ten_combo}</strong>? Thao
                    tác này không thể hoàn tác. Combo đã được dùng trong đơn sẽ
                    được giữ lại.
                  </p>
                  {formError && (
                    <p className="cm-alert" role="alert">
                      {formError}
                    </p>
                  )}
                  <footer>
                    <button disabled={busy} onClick={() => setModal(null)}>
                      Hủy
                    </button>
                    <button
                      className="cm-delete"
                      disabled={busy}
                      onClick={() => void remove()}
                    >
                      {busy ? "Đang xóa…" : "Xác nhận xóa"}
                    </button>
                  </footer>
                </>
              ) : (
                <form onSubmit={save}>
                  <fieldset disabled={busy} className="cm-fields">
                    <div className="cm-row">
                      <span>
                        Ảnh <b>*</b>
                      </span>
                      <div className="cm-upload">
                        <div className="cm-preview">
                          {preview || editing?.anh_dai_dien ? (
                            <img
                              src={preview || editing!.anh_dai_dien!}
                              alt="Ảnh xem trước"
                            />
                          ) : (
                            <span>Chưa chọn ảnh</span>
                          )}
                        </div>
                        <label className="cm-file-label">
                          Chọn tệp ảnh
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              if (
                                ![
                                  "image/jpeg",
                                  "image/png",
                                  "image/webp",
                                ].includes(f.type) ||
                                f.size > 5242880
                              ) {
                                setFormError(
                                  "Chọn ảnh JPG, PNG hoặc WebP tối đa 5 MB.",
                                );
                                e.target.value = "";
                                return;
                              }
                              setFile(f);
                              setFormError("");
                            }}
                          />
                        </label>
                        <small>
                          {file?.name || "JPG, PNG, WebP · tối đa 5 MB"}
                        </small>
                      </div>
                    </div>
                    <label className="cm-row">
                      <span>
                        Tên combo <b>*</b>
                      </span>
                      <input
                        required
                        maxLength={150}
                        value={draft.ten_combo}
                        onChange={(e) =>
                          setDraft({ ...draft, ten_combo: e.target.value })
                        }
                        placeholder="Nhập tên chương trình"
                      />
                    </label>
                    <label className="cm-row">
                      <span>Phạm vi</span>
                      <select
                        value={draft.pham_vi}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            pham_vi: e.target.value as Scope,
                          })
                        }
                      >
                        <option value="toan_he_thong">Toàn bộ chi nhánh</option>
                        <option value="chi_nhanh">Chọn chi nhánh</option>
                        <option value="phong">
                          Chọn phòng của các chi nhánh
                        </option>
                      </select>
                    </label>
                    {draft.pham_vi === "chi_nhanh" && (
                      <div className="cm-row">
                        <span>
                          Chi nhánh <b>*</b>
                        </span>
                        <div className="cm-checks">
                          {branches.map((b) => (
                            <label key={b.id}>
                              <input
                                type="checkbox"
                                checked={draft.chi_nhanh_ids.includes(b.id)}
                                onChange={() =>
                                  setDraft({
                                    ...draft,
                                    chi_nhanh_ids: toggle(
                                      draft.chi_nhanh_ids,
                                      b.id,
                                    ),
                                  })
                                }
                              />
                              {b.ten_homestay}
                            </label>
                          ))}
                          {!branches.length && (
                            <small>Chưa có chi nhánh.</small>
                          )}
                        </div>
                      </div>
                    )}
                    {draft.pham_vi === "phong" && (
                      <div className="cm-room-area">
                        <div className="cm-room-filters">
                          <select
                            aria-label="Lọc phòng theo chi nhánh"
                            value={roomBranch}
                            onChange={(e) => {
                              setRoomBranch(e.target.value);
                              setRoomType("");
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
                            aria-label="Lọc loại phòng"
                            value={roomType}
                            onChange={(e) => setRoomType(e.target.value)}
                          >
                            <option value="">Tất cả loại phòng</option>
                            {Array.from(
                              new Map(
                                rooms
                                  .filter(
                                    (r) =>
                                      !roomBranch ||
                                      r.homestay_id === roomBranch,
                                  )
                                  .map((r) => [r.loai_phong_id, r.ten_loai]),
                              ).entries(),
                            ).map(([id, name]) => (
                              <option key={id} value={id}>
                                {name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="cm-room-panes">
                          <div>
                            <div className="cm-pane-title">
                              Chọn phòng{" "}
                              <button
                                type="button"
                                onClick={() =>
                                  setDraft((v) => ({
                                    ...v,
                                    phong_ids: [
                                      ...new Set([
                                        ...v.phong_ids,
                                        ...availableRooms.map((r) => r.id),
                                      ]),
                                    ],
                                  }))
                                }
                              >
                                Chọn tất cả đang lọc
                              </button>
                            </div>
                            <div className="cm-checks">
                              {availableRooms.map((r) => (
                                <label key={r.id}>
                                  <input
                                    type="checkbox"
                                    checked={draft.phong_ids.includes(r.id)}
                                    onChange={() =>
                                      setDraft({
                                        ...draft,
                                        phong_ids: toggle(
                                          draft.phong_ids,
                                          r.id,
                                        ),
                                      })
                                    }
                                  />
                                  <span>
                                    {r.ten_phong} ({r.ma_phong})
                                    <small>
                                      {
                                        branches.find(
                                          (b) => b.id === r.homestay_id,
                                        )?.ten_homestay
                                      }{" "}
                                      · {r.ten_loai}
                                    </small>
                                  </span>
                                </label>
                              ))}
                              {!availableRooms.length && (
                                <small>Không có phòng phù hợp.</small>
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="cm-pane-title" aria-live="polite">
                              Đã chọn {draft.phong_ids.length} phòng{" "}
                              <button
                                type="button"
                                onClick={() =>
                                  setDraft({ ...draft, phong_ids: [] })
                                }
                              >
                                Bỏ chọn tất cả
                              </button>
                            </div>
                            <div className="cm-selected-rooms">
                              {rooms
                                .filter((r) => draft.phong_ids.includes(r.id))
                                .map((r) => (
                                  <div key={r.id}>
                                    <span>
                                      {r.ten_phong} ({r.ma_phong})
                                      <small>
                                        {
                                          branches.find(
                                            (b) => b.id === r.homestay_id,
                                          )?.ten_homestay
                                        }{" "}
                                        · {r.ten_loai}
                                      </small>
                                    </span>
                                    <button
                                      type="button"
                                      aria-label={"Bỏ chọn " + r.ten_phong}
                                      onClick={() =>
                                        setDraft({
                                          ...draft,
                                          phong_ids: draft.phong_ids.filter(
                                            (id) => id !== r.id,
                                          ),
                                        })
                                      }
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              {!draft.phong_ids.length && (
                                <small>Chưa chọn phòng.</small>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <label className="cm-row">
                      <span>Loại combo</span>
                      <select
                        value={hourly ? "gio" : "dich_vu"}
                        onChange={(e) => setHourly(e.target.value === "gio")}
                      >
                        <option value="dich_vu">Combo dịch vụ</option>
                        <option value="gio">Combo giờ</option>
                      </select>
                    </label>
                    {hourly && (
                      <label className="cm-row">
                        <span>
                          Số giờ <b>*</b>
                        </span>
                        <input
                          required
                          type="number"
                          min="1"
                          max="744"
                          step="1"
                          value={draft.so_gio_bao_gom}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              so_gio_bao_gom: e.target.value,
                            })
                          }
                        />
                      </label>
                    )}
                    <div className="cm-row cm-date-range">
                      <span>
                        Ngày áp dụng <b>*</b>
                      </span>
                      <RangePicker
                        start={draft.bat_dau.slice(0, 10) || today}
                        end={
                          draft.ket_thuc.slice(0, 10) ||
                          draft.bat_dau.slice(0, 10) ||
                          today
                        }
                        onChange={(a, b) =>
                          setDraft({
                            ...draft,
                            bat_dau:
                              a +
                              "T" +
                              (draft.bat_dau.slice(11, 16) || "00:00"),
                            ket_thuc:
                              b +
                              "T" +
                              (draft.ket_thuc.slice(11, 16) || "23:59"),
                          })
                        }
                        compact
                      />
                    </div>
                    <div className="cm-row cm-time-range">
                      <span>
                        Giờ áp dụng <b>*</b>
                      </span>
                      <div>
                        <label>
                          Từ
                          <input
                            aria-label="Giờ bắt đầu áp dụng"
                            type="time"
                            required
                            value={draft.bat_dau.slice(11, 16)}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                bat_dau:
                                  (draft.bat_dau.slice(0, 10) || today) +
                                  "T" +
                                  e.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          Đến
                          <input
                            aria-label="Giờ kết thúc áp dụng"
                            type="time"
                            required
                            value={draft.ket_thuc.slice(11, 16)}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                ket_thuc:
                                  (draft.ket_thuc.slice(0, 10) ||
                                    draft.bat_dau.slice(0, 10) ||
                                    today) +
                                  "T" +
                                  e.target.value,
                              })
                            }
                          />
                        </label>
                      </div>
                    </div>
                    <label className="cm-row">
                      <span>
                        Giá combo (₫) <b>*</b>
                      </span>
                      <NhapTien
                        required
                        value={draft.gia_combo}
                        onValueChange={(value) =>
                          setDraft({ ...draft, gia_combo: value })
                        }
                        placeholder="Ví dụ: 250 → 250.000"
                      />
                    </label>
                    <label className="cm-row">
                      <span>Trạng thái</span>
                      <select
                        value={draft.trang_thai}
                        onChange={(e) =>
                          setDraft({ ...draft, trang_thai: e.target.value })
                        }
                      >
                        <option>Đang bán</option>
                        <option>Tạm ngưng</option>
                      </select>
                    </label>
                    <label className="cm-row">
                      <span>Chi tiết</span>
                      <textarea
                        rows={2}
                        maxLength={5000}
                        value={draft.mo_ta}
                        onChange={(e) =>
                          setDraft({ ...draft, mo_ta: e.target.value })
                        }
                        placeholder="Nội dung và điều kiện áp dụng combo"
                      />
                    </label>
                    <small className="cm-time-hint">
                      Thời gian theo giờ Việt Nam (UTC+7). Combo chỉ áp dụng khi
                      toàn bộ thời gian đặt nằm trong khoảng trên.
                    </small>
                  </fieldset>
                  {formError && (
                    <p className="cm-alert" role="alert">
                      {formError}
                    </p>
                  )}
                  <footer>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setModal(null)}
                    >
                      Hủy
                    </button>
                    <button
                      className="cm-primary"
                      disabled={busy}
                      type="submit"
                    >
                      {busy ? "Đang lưu…" : "Lưu combo"}
                    </button>
                  </footer>
                </form>
              )}
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}

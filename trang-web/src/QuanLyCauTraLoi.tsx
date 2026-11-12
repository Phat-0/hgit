import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
type Mau = {
  id: string;
  tieu_de: string;
  nhom: string;
  noi_dung: string;
  homestay_id: string | null;
  hien: boolean;
};
const blank = {
  tieu_de: "",
  nhom: "Hỗ trợ",
  noi_dung: "",
  homestay_id: "",
  hien: true,
};
export default function QuanLyCauTraLoi({
  token,
  onClose,
}: {
  token: string;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<Mau[]>([]),
    [branches, setBranches] = useState<{ id: string; ten_homestay: string }[]>(
      [],
    ),
    [form, setForm] = useState({ ...blank }),
    [edit, setEdit] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [search, setSearch] = useState("");
  async function api(path = "", method = "GET", body?: unknown) {
    const r = await fetch("/api/quan-tri/cau-tra-loi-mau" + path, {
      method,
      headers: {
        Authorization: "Bearer " + token,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.message || "Không xử lý được câu trả lời");
    return d;
  }
  async function load() {
    const d = await api();
    setRows(d.mau);
    setBranches(d.chi_nhanh);
  }
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [token]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(edit ? "/" + edit : "", edit ? "PUT" : "POST", {
        ...form,
        homestay_id: form.homestay_id || null,
      });
      setForm({ ...blank });
      setEdit("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(m: Mau) {
    if (
      !window.confirm(
        "Xóa câu trả lời mẫu “" + m.tieu_de + "”? Tin đã gửi vẫn được giữ.",
      )
    )
      return;
    setBusy(true);
    try {
      await api("/" + m.id, "DELETE");
      if (edit === m.id) {
        setEdit("");
        setForm({ ...blank });
      }
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return createPortal(
    <div className="nv-backdrop">
      <section
        className="nv-dialog chat-template-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Quản lý câu trả lời mẫu"
      >
        <header>
          <h2>Câu trả lời soạn sẵn</h2>
          <button
            aria-label="Đóng quản lý câu trả lời"
            disabled={busy}
            onClick={onClose}
          >
            ×
          </button>
        </header>
        {error && (
          <p role="alert" className="chat-error">
            {error}
          </p>
        )}
        <div className="chat-template-grid">
          <div>
            <input
              aria-label="Tìm mẫu quản lý"
              placeholder="Tìm tiêu đề, nhóm…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="chat-template-list">
              {rows
                .filter((m) =>
                  (m.tieu_de + " " + m.nhom)
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )
                .map((m) => (
                  <article key={m.id}>
                    <strong>{m.tieu_de}</strong>
                    <small>
                      {m.nhom} · {m.hien ? "Đang dùng" : "Đã ẩn"}
                    </small>
                    <p>{m.noi_dung}</p>
                    <button
                      disabled={busy}
                      onClick={() => {
                        setEdit(m.id);
                        setForm({ ...m, homestay_id: m.homestay_id || "" });
                      }}
                    >
                      Sửa
                    </button>
                    <button disabled={busy} onClick={() => void remove(m)}>
                      Xóa
                    </button>
                  </article>
                ))}
            </div>
          </div>
          <form onSubmit={save}>
            <h3>{edit ? "Sửa mẫu" : "Tạo mẫu"}</h3>
            <label>
              Tiêu đề
              <input
                required
                maxLength={120}
                value={form.tieu_de}
                onChange={(e) => setForm({ ...form, tieu_de: e.target.value })}
              />
            </label>
            <label>
              Nhóm
              <input
                required
                maxLength={80}
                value={form.nhom}
                onChange={(e) => setForm({ ...form, nhom: e.target.value })}
              />
            </label>
            <label>
              Chi nhánh
              <select
                value={form.homestay_id}
                onChange={(e) =>
                  setForm({ ...form, homestay_id: e.target.value })
                }
              >
                <option value="">Dùng chung</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.ten_homestay}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Nội dung
              <textarea
                required
                maxLength={4000}
                rows={6}
                value={form.noi_dung}
                onChange={(e) => setForm({ ...form, noi_dung: e.target.value })}
              />
            </label>
            <small>
              Có thể dùng {"{{ten_khach}}"} và {"{{chi_nhanh}}"}. Thiếu dữ liệu
              sẽ đưa vào ô soạn để kiểm tra.
            </small>
            <label>
              <input
                type="checkbox"
                checked={form.hien}
                onChange={(e) => setForm({ ...form, hien: e.target.checked })}
              />{" "}
              Cho phép sử dụng
            </label>
            <footer>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setEdit("");
                  setForm({ ...blank });
                }}
              >
                Tạo mẫu khác
              </button>
              <button disabled={busy}>{busy ? "Đang lưu…" : "Lưu mẫu"}</button>
            </footer>
          </form>
        </div>
      </section>
    </div>,
    document.body,
  );
}

import { useEffect, useState } from "react";
import { khachApi } from "./khach-api";
import { TepDinhKem, type TepChat } from "./chat-tep";
import QuanLyCauTraLoi from "./QuanLyCauTraLoi";
type Mau = {
  thu_tu?: number;
  id: string;
  tieu_de: string;
  nhom: string;
  noi_dung_da_dien: string;
  du_gui_ngay: boolean;
};
type Hit = { id: string; noi_dung: string; ngay_gui: string };
export default function ChatCongCu({
  id,
  token,
  guest,
  mode,
  admin,
  onClose,
  onJump,
  onReply,
}: {
  id: string;
  token?: string;
  guest?: string;
  mode: "tim" | "anh" | "tep" | "mau";
  admin: boolean;
  onClose: () => void;
  onJump: (id: string) => void;
  onReply: (text: string, send: boolean) => void;
}) {
  const [query, setQuery] = useState(""),
    [files, setFiles] = useState<TepChat[]>([]),
    [hits, setHits] = useState<Hit[]>([]),
    [replies, setReplies] = useState<Mau[]>([]),
    [offset, setOffset] = useState(0),
    [more, setMore] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [manage, setManage] = useState(false),
    [reload, setReload] = useState(0);
  const [action, setAction] = useState<"send" | "edit" | "delete" | "sort">(
      "send",
    ),
    [editId, setEditId] = useState<string | undefined>(),
    [dragId, setDragId] = useState("");
  useEffect(() => {
    setQuery("");
    setOffset(0);
    setFiles([]);
    setHits([]);
    setReplies([]);
  }, [id, mode]);
  useEffect(() => {
    setOffset(0);
  }, [query]);
  useEffect(() => {
    let live = true;
    if (mode === "tim" && query.trim().length < 2) {
      setHits([]);
      setMore(false);
      return;
    }
    setBusy(true);
    setError("");
    const timer = window.setTimeout(() => {
      const p =
        mode === "mau"
          ? "/cau-tra-loi"
          : mode === "tim"
            ? "/tim?" +
              new URLSearchParams({ tim: query.trim(), bo_qua: String(offset) })
            : "/tep?" +
              new URLSearchParams({
                loai: mode,
                tim: query.trim(),
                bo_qua: String(offset),
              });
      void khachApi<any>("/chat/" + id + p, "GET", undefined, token, guest)
        .then((d) => {
          if (!live) return;
          if (mode === "mau") setReplies(d.mau);
          else if (mode === "tim")
            setHits((v) => (offset ? [...v, ...d.tin_nhan] : d.tin_nhan));
          else setFiles((v) => (offset ? [...v, ...d.tep] : d.tep));
          setMore(!!d.con_tiep);
        })
        .catch((e) => {
          if (live) setError(e.message);
        })
        .finally(() => {
          if (live) setBusy(false);
        });
    }, 250);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [id, mode, query, offset, token, guest, reload]);
  async function adminApi(path: string, method: string, body?: unknown) {
    const r = await fetch("/api/quan-tri/cau-tra-loi-mau" + path, {
      method,
      headers: {
        Authorization: "Bearer " + token,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.message || "Không cập nhật được mẫu");
    return d;
  }
  const filtered = replies.filter((m) =>
    (m.tieu_de + " " + m.nhom + " " + m.noi_dung_da_dien)
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  async function select(m: Mau) {
    if (action === "edit") {
      setEditId(m.id);
      setManage(true);
    } else if (action === "delete") {
      if (
        !window.confirm("Xóa mẫu “" + m.tieu_de + "”? Tin đã gửi vẫn được giữ.")
      )
        return;
      setBusy(true);
      try {
        await adminApi("/" + m.id, "DELETE");
        setReplies((v) => v.filter((x) => x.id !== m.id));
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    } else if (action === "send") onReply(m.noi_dung_da_dien, m.du_gui_ngay);
  }
  async function reorder(source: string, target: string) {
    if (source === target || busy) return;
    const ids = filtered.map((m) => m.id),
      a = ids.indexOf(source),
      b = ids.indexOf(target);
    if (a < 0 || b < 0) return;
    ids.splice(a, 1);
    ids.splice(b, 0, source);
    setBusy(true);
    setError("");
    try {
      await adminApi("/thu-tu", "PUT", { ids });
      setReload((v) => v + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setDragId("");
    }
  }
  const icon = (kind: "add" | "edit" | "delete" | "sort") => (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      {kind === "add" ? (
        <path d="M12 4v16M4 12h16" />
      ) : kind === "edit" ? (
        <>
          <path d="m4 15 11-11 5 5L9 20H4zM13 6l5 5" />
        </>
      ) : kind === "delete" ? (
        <>
          <path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7" />
        </>
      ) : (
        <>
          <path d="m7 4-3 3 3 3M4 7h16M17 14l3 3-3 3M4 17h16" />
        </>
      )}
    </svg>
  );
  return (
    <div className="chat-tools-panel">
      <header>
        <strong>
          {
            {
              tim: "Tìm trong cuộc trò chuyện",
              anh: "Ảnh đã gửi",
              tep: "Tệp đã gửi",
              mau: "Câu trả lời soạn sẵn",
            }[mode]
          }
        </strong>
        {admin && mode === "mau" && (
          <div className="chat-reply-actions">
            <button
              disabled={busy}
              title="Thêm câu trả lời"
              aria-label="Thêm câu trả lời"
              onClick={() => {
                setEditId(undefined);
                setManage(true);
              }}
            >
              {icon("add")}
            </button>
            <button
              disabled={busy}
              title="Chọn ô để sửa"
              aria-label="Chọn mẫu để sửa"
              aria-pressed={action === "edit"}
              onClick={() => setAction((v) => (v === "edit" ? "send" : "edit"))}
            >
              {icon("edit")}
            </button>
            <button
              disabled={busy}
              title="Chọn ô để xóa"
              aria-label="Chọn mẫu để xóa"
              aria-pressed={action === "delete"}
              onClick={() =>
                setAction((v) => (v === "delete" ? "send" : "delete"))
              }
            >
              {icon("delete")}
            </button>
            <button
              disabled={busy}
              title="Sắp xếp mẫu"
              aria-label="Sắp xếp mẫu"
              aria-pressed={action === "sort"}
              onClick={() => setAction((v) => (v === "sort" ? "send" : "sort"))}
            >
              {icon("sort")}
            </button>
          </div>
        )}
        <button aria-label="Đóng công cụ chat" onClick={onClose}>
          ×
        </button>
      </header>
      <input
        autoFocus
        aria-label="Tìm trong công cụ chat"
        maxLength={100}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={
          mode === "tim"
            ? "Nhập ít nhất 2 ký tự…"
            : mode === "mau"
              ? "Tìm nội dung, nhóm…"
              : "Tìm tên tệp…"
        }
      />
      {error && (
        <p role="alert" className="chat-error">
          {error}
        </p>
      )}
      {mode === "mau" && (
        <p className="chat-reply-mode-hint">
          {action === "edit"
            ? "Chọn ô cần sửa."
            : action === "delete"
              ? "Chọn ô cần xóa."
              : action === "sort"
                ? "Kéo thả ô hoặc dùng phím mũi tên để đổi thứ tự."
                : "Bấm ô để gửi ngay."}
        </p>
      )}
      <div
        className={
          "chat-tool-results " +
          (mode === "anh"
            ? "chat-gallery"
            : mode === "mau"
              ? "chat-reply-grid"
              : "")
        }
      >
        {mode === "mau"
          ? filtered.map((m) => (
              <button
                className={
                  "chat-reply " +
                  (action === "sort" ? "sort-mode " : "") +
                  (dragId === m.id ? "drag-source" : "")
                }
                key={m.id}
                disabled={busy}
                draggable={admin && action === "sort"}
                onDragStart={(e) => {
                  setDragId(m.id);
                  e.dataTransfer.setData("text/plain", m.id);
                }}
                onDragOver={(e) => {
                  if (action === "sort") e.preventDefault();
                }}
                onDrop={(e) => {
                  if (action !== "sort") return;
                  e.preventDefault();
                  e.stopPropagation();
                  void reorder(e.dataTransfer.getData("text/plain"), m.id);
                }}
                onDragEnd={() => setDragId("")}
                onKeyDown={(e) => {
                  if (action !== "sort" || !e.key.startsWith("Arrow")) return;
                  e.preventDefault();
                  const i = filtered.findIndex((v) => v.id === m.id),
                    n = i + (["ArrowLeft", "ArrowUp"].includes(e.key) ? -1 : 1);
                  if (filtered[n]) void reorder(m.id, filtered[n].id);
                }}
                onClick={() => void select(m)}
              >
                {action === "sort" && (
                  <b className="chat-reply-number">{filtered.indexOf(m) + 1}</b>
                )}
                <small>{m.nhom}</small>
                <strong>{m.tieu_de}</strong>
                <span>{m.noi_dung_da_dien}</span>
                <small>
                  {action === "edit"
                    ? "Bấm để sửa"
                    : action === "delete"
                      ? "Bấm để xóa"
                      : action === "sort"
                        ? "Kéo để sắp xếp"
                        : m.du_gui_ngay
                          ? "Bấm để gửi ngay"
                          : "Bấm để kiểm tra phần còn thiếu"}
                </small>
              </button>
            ))
          : mode === "tim"
            ? hits.map((h) => (
                <button
                  className="chat-search-hit"
                  key={h.id}
                  onClick={() => onJump(h.id)}
                >
                  <p>{h.noi_dung}</p>
                  <time>{new Date(h.ngay_gui).toLocaleString("vi-VN")}</time>
                </button>
              ))
            : files.map((f) => (
                <div key={f.id}>
                  <TepDinhKem tep={f} />
                  <small>{f.ten_tep}</small>
                </div>
              ))}
        {busy && <p role="status">Đang tải…</p>}
        {!busy && !files.length && !hits.length && !replies.length && (
          <p className="chat-empty">
            {mode === "tim" && query.length < 2
              ? "Nhập nội dung cần tìm."
              : "Chưa có dữ liệu phù hợp."}
          </p>
        )}
      </div>
      {more && (
        <button disabled={busy} onClick={() => setOffset((v) => v + 40)}>
          Tải thêm
        </button>
      )}
      {mode !== "tim" && (
        <button
          disabled={busy}
          onClick={() => {
            setOffset(0);
            setReload((v) => v + 1);
          }}
        >
          Làm mới
        </button>
      )}
      {manage && token && (
        <QuanLyCauTraLoi
          token={token}
          initialId={editId}
          onClose={() => {
            setManage(false);
            setReload((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}

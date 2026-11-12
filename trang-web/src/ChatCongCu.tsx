import { useEffect, useState } from "react";
import { khachApi } from "./khach-api";
import { TepDinhKem, type TepChat } from "./chat-tep";
import QuanLyCauTraLoi from "./QuanLyCauTraLoi";
type Mau = {
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
      {admin && mode === "mau" && (
        <button onClick={() => setManage(true)}>⚙ Quản lý câu trả lời</button>
      )}
      <div
        className={
          "chat-tool-results " + (mode === "anh" ? "chat-gallery" : "")
        }
      >
        {mode === "mau"
          ? replies
              .filter((m) =>
                (m.tieu_de + " " + m.nhom + " " + m.noi_dung_da_dien)
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((m) => (
                <button
                  className="chat-reply"
                  key={m.id}
                  onClick={() => onReply(m.noi_dung_da_dien, m.du_gui_ngay)}
                >
                  <small>{m.nhom}</small>
                  <strong>{m.tieu_de}</strong>
                  <span>{m.noi_dung_da_dien}</span>
                  <small>
                    {m.du_gui_ngay
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
          onClose={() => {
            setManage(false);
            setReload((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { khachApi } from "./khach-api";
import "./tro-chuyen.css";
type Thread = {
  id: string;
  loai: string;
  ten_homestay: string | null;
  ten_khach: string;
  tin_cuoi: string | null;
};
type Message = {
  id: string;
  nguoi_gui_id: string | null;
  loai_nguoi_gui: string;
  noi_dung: string;
  ngay_gui: string;
  ten_nguoi_gui: string;
};
export default function TroChuyen({
  token,
  branch,
  inline = false,
}: {
  token?: string;
  branch?: string;
  inline?: boolean;
}) {
  const [open, setOpen] = useState(inline),
    [threads, setThreads] = useState<Thread[]>([]),
    [current, setCurrent] = useState(""),
    [messages, setMessages] = useState<Message[]>([]),
    [mine, setMine] = useState<string | null>(null),
    [text, setText] = useState(""),
    [contact, setContact] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [guest, setGuest] = useState(
    () =>
      sessionStorage.getItem("homestay_chat_guest:" + (branch || "all")) || "",
  );
  const visible = inline || open;
  const bottom = useRef<HTMLDivElement>(null);
  const activeThread = useRef(current);
  activeThread.current = current;
  const pending = useRef<{ thread: string; text: string; id: string } | null>(
    null,
  );
  useEffect(() => {
    setText("");
    pending.current = null;
  }, [current]);
  useEffect(() => {
    if (!token) setCurrent("");
  }, [token]);
  useEffect(() => {
    setGuest(
      sessionStorage.getItem("homestay_chat_guest:" + (branch || "all")) || "",
    );
    setCurrent("");
    setMessages([]);
  }, [branch]);
  const list = useCallback(async () => {
    if (!token) return;
    const r = await khachApi<{ toi: string; hoi_thoai: Thread[] }>(
      "/chat",
      "GET",
      undefined,
      token,
    );
    setMine(r.toi);
    setThreads(r.hoi_thoai);
  }, [token]);
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    const poll = async () => {
      try {
        if (token) {
          const r = await khachApi<{ toi: string; hoi_thoai: Thread[] }>(
            "/chat",
            "GET",
            undefined,
            token,
          );
          if (alive) {
            setMine(r.toi);
            setThreads(r.hoi_thoai);
          }
        }
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    };
    void poll();
    const timer = window.setInterval(() => {
      if (!document.hidden) void poll();
    }, 10000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [visible, token]);
  useEffect(() => {
    if (!visible || !current) return;
    let alive = true;
    const poll = async () => {
      try {
        const r = await khachApi<{ toi: string | null; tin_nhan: Message[] }>(
          "/chat/" + current + "/tin-nhan",
          "GET",
          undefined,
          token,
          guest,
        );
        if (alive) {
          setMessages(r.tin_nhan);
          setMine(r.toi);
        }
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    };
    setMessages([]);
    void poll();
    const timer = window.setInterval(() => {
      if (!document.hidden) void poll();
    }, 5000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [current, visible, token, guest]);
  useEffect(() => {
    bottom.current?.scrollIntoView?.({ block: "nearest", behavior: "smooth" });
  }, [messages.length]);
  async function start(direct = false) {
    setBusy(true);
    setError("");
    try {
      const r = await khachApi<{ id: string; guest_token?: string }>(
        "/chat",
        "POST",
        direct
          ? { nguoi_nhan_id: contact.trim() }
          : { chi_nhanh_id: branch || null },
        token,
        guest,
      );
      if (r.guest_token) {
        setGuest(r.guest_token);
        sessionStorage.setItem(
          "homestay_chat_guest:" + (branch || "all"),
          r.guest_token,
        );
      }
      setCurrent(r.id);
      await list();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !current || busy) return;
    const thread = current;
    if (
      !pending.current ||
      pending.current.thread !== thread ||
      pending.current.text !== text.trim()
    )
      pending.current = { thread, text: text.trim(), id: crypto.randomUUID() };
    setBusy(true);
    setError("");
    try {
      await khachApi(
        "/chat/" + current + "/tin-nhan",
        "POST",
        { noi_dung: text.trim(), ma_phia_khach: pending.current.id },
        token,
        guest,
      );
      if (activeThread.current !== thread) return;
      pending.current = null;
      setText("");
      const r = await khachApi<{ tin_nhan: Message[] }>(
        "/chat/" + current + "/tin-nhan",
        "GET",
        undefined,
        token,
        guest,
      );
      if (activeThread.current === thread) setMessages(r.tin_nhan);
    } catch (e) {
      if (activeThread.current === thread) setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={"chat-shell " + (inline ? "chat-inline" : "")}>
      <button
        className="chat-launch"
        onClick={() =>
          inline
            ? document
                .querySelector<HTMLInputElement>(
                  '[aria-label="Nội dung tin nhắn"]',
                )
                ?.focus()
            : setOpen((v) => !v)
        }
        aria-expanded={visible}
      >
        ☏ {inline ? "Tin nhắn" : open ? "Đóng chat" : "Trò chuyện"}
      </button>
      {visible && (
        <section className="chat-window">
          <header>
            <div>
              <h2>Trò chuyện</h2>
              <small>Cập nhật mỗi 5 giây · Nội dung riêng tư</small>
            </div>
            {!inline && (
              <button aria-label="Đóng chat" onClick={() => setOpen(false)}>
                ×
              </button>
            )}
          </header>
          <div className="chat-body">
            <aside>
              <button disabled={busy} onClick={() => void start()}>
                + Hỗ trợ đặt phòng
              </button>
              {token && (
                <>
                  <label>
                    Mã liên hệ người nhận
                    <input
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder="Dán mã được chia sẻ"
                    />
                  </label>
                  <button
                    disabled={busy || !contact.trim()}
                    onClick={() => void start(true)}
                  >
                    Bắt đầu trò chuyện
                  </button>
                  {mine && (
                    <button
                      title={mine}
                      onClick={() => void navigator.clipboard?.writeText(mine)}
                    >
                      Sao chép mã liên hệ của tôi
                    </button>
                  )}
                  {threads.map((t) => (
                    <button
                      key={t.id}
                      className={current === t.id ? "chat-chosen" : ""}
                      onClick={() => {
                        setCurrent(t.id);
                        setError("");
                      }}
                    >
                      <strong>
                        {t.loai === "truc_tiep"
                          ? "Trò chuyện trực tiếp"
                          : t.ten_homestay || "Hỗ trợ Homestay"}
                      </strong>
                      <small>
                        {t.ten_khach} · {t.tin_cuoi || "Chưa có tin nhắn"}
                      </small>
                    </button>
                  ))}
                </>
              )}
            </aside>
            <div className="chat-main">
              {error && (
                <p role="alert" className="chat-error">
                  {error}
                </p>
              )}
              <div className="chat-messages">
                {!current && (
                  <p className="chat-empty">
                    Chọn Hỗ trợ đặt phòng hoặc một hội thoại để bắt đầu. Khách
                    chưa đăng nhập vẫn có thể nhắn với nhân viên.
                  </p>
                )}
                {current && !messages.length && (
                  <p className="chat-empty">
                    Hãy gửi lời chào. Nhân viên sẽ phản hồi tại đây.
                  </p>
                )}
                {messages.map((m) => (
                  <article
                    key={m.id}
                    className={
                      (
                        mine
                          ? m.nguoi_gui_id === mine
                          : m.loai_nguoi_gui === "Khách vãng lai"
                      )
                        ? "chat-mine"
                        : ""
                    }
                  >
                    <small>{m.ten_nguoi_gui}</small>
                    <p>{m.noi_dung}</p>
                    <time>
                      {new Date(m.ngay_gui).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </article>
                ))}
                <div ref={bottom} />
              </div>
              <form onSubmit={send}>
                <input
                  aria-label="Nội dung tin nhắn"
                  disabled={!current}
                  maxLength={4000}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Nhập tin nhắn…"
                />
                <button disabled={busy || !current || !text.trim()}>Gửi</button>
              </form>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

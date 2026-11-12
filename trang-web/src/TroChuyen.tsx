import { useCallback, useEffect, useRef, useState } from "react";
import { khachApi } from "./khach-api";
import "./tro-chuyen.css";
type Thread = {
  id: string;
  loai: string;
  ten_hien_thi: string;
  ten_homestay: string | null;
  tin_cuoi: string | null;
  tin_cuoi_luc: string | null;
  chua_doc: number;
};
type Message = {
  id: string;
  nguoi_gui_id: string | null;
  cua_toi: boolean;
  noi_dung: string;
  ngay_gui: string;
  ten_nguoi_gui: string;
};
type Person = { id: string; ten_hien_thi: string };
type Inbox = {
  toi: string | null;
  hoi_thoai: Thread[];
  tong_so: number;
  tong_chua_doc: number;
};
const clock = (value?: string | null) => {
  if (!value) return "";
  const d = new Date(value);
  if (!Number.isFinite(+d)) return "";
  return d.toLocaleDateString("vi-VN") ===
    new Date().toLocaleDateString("vi-VN")
    ? d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
};
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((s) => s[0])
    .join("")
    .toLocaleUpperCase("vi");
export default function TroChuyen({
  token,
  branch,
  inline = false,
}: {
  token?: string;
  branch?: string;
  inline?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [threads, setThreads] = useState<Thread[]>([]),
    [current, setCurrent] = useState(""),
    [currentName, setCurrentName] = useState(""),
    [messages, setMessages] = useState<Message[]>([]),
    [text, setText] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState(""),
    [peopleMode, setPeopleMode] = useState(false),
    [people, setPeople] = useState<Person[]>([]),
    [finding, setFinding] = useState(false),
    [pages, setPages] = useState(1),
    [total, setTotal] = useState(0),
    [unread, setUnread] = useState(0),
    [older, setOlder] = useState(false),
    [loadingOlder, setLoadingOlder] = useState(false);
  const [guest, setGuest] = useState(
    () =>
      sessionStorage.getItem("homestay_chat_guest:" + (branch || "all")) || "",
  );
  const visible = inline || open,
    active = useRef(current),
    viewport = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null),
    nearBottom = useRef(true),
    readIds = useRef<Record<string, string>>({}),
    listSerial = useRef(0),
    pending = useRef<{ thread: string; text: string; id: string } | null>(null),
    historyInitial = useRef(false);
  active.current = current;
  useEffect(() => {
    setGuest(
      sessionStorage.getItem("homestay_chat_guest:" + (branch || "all")) || "",
    );
    setCurrent("");
    setMessages([]);
    setThreads([]);
    setUnread(0);
  }, [branch]);
  useEffect(() => {
    if (!token) {
      setCurrent("");
      setThreads([]);
      setPeople([]);
      setPeopleMode(false);
    }
    readIds.current = {};
  }, [token]);
  useEffect(() => {
    setMessages([]);
    setText("");
    setOlder(false);
    historyInitial.current = false;
    pending.current = null;
    nearBottom.current = true;
  }, [current]);
  useEffect(() => {
    setPages(1);
  }, [search, peopleMode]);
  const list = useCallback(async () => {
    if (!token && !guest) return;
    const seq = ++listSerial.current;
    const all: Thread[] = [];
    let response: Inbox | undefined;
    for (let i = 0; i < pages; i++) {
      response = await khachApi<Inbox>(
        "/chat?" +
          new URLSearchParams({
            tim: peopleMode ? "" : search,
            bo_qua: String(i * 40),
          }),
        "GET",
        undefined,
        token,
        guest,
      );
      all.push(...response.hoi_thoai);
      if (all.length >= response.tong_so || !response.hoi_thoai.length) break;
    }
    if (seq !== listSerial.current || !response) return;
    setThreads([...new Map(all.map((t) => [t.id, t])).values()]);
    setTotal(response.tong_so);
    setUnread(response.tong_chua_doc || 0);
  }, [token, guest, search, pages, peopleMode]);
  useEffect(() => {
    let alive = true;
    const poll = () => {
      if (!document.hidden)
        void list().catch((e) => {
          if (alive) setError(e.message);
        });
    };
    poll();
    const timer = window.setInterval(poll, 10000);
    document.addEventListener("visibilitychange", poll);
    return () => {
      alive = false;
      listSerial.current++;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [list]);
  useEffect(() => {
    if (!peopleMode || !token || search.trim().length < 2) {
      setPeople([]);
      return;
    }
    let alive = true;
    setFinding(true);
    const timer = window.setTimeout(() => {
      void khachApi<{ nguoi_dung: Person[] }>(
        "/chat/nguoi-dung?" + new URLSearchParams({ tim: search.trim() }),
        "GET",
        undefined,
        token,
      )
        .then((r) => {
          if (alive) setPeople(r.nguoi_dung);
        })
        .catch((e) => {
          if (alive) setError(e.message);
        })
        .finally(() => {
          if (alive) setFinding(false);
        });
    }, 350);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [peopleMode, search, token]);
  useEffect(() => {
    if (!visible || !current) return;
    let alive = true;
    const poll = async () => {
      if (document.hidden) return;
      try {
        const r = await khachApi<{ tin_nhan: Message[]; co_tin_cu: boolean }>(
          "/chat/" + current + "/tin-nhan",
          "GET",
          undefined,
          token,
          guest,
        );
        if (alive) {
          setMessages((prev) => {
            const ids = new Set(r.tin_nhan.map((m) => m.id));
            return [...prev.filter((m) => !ids.has(m.id)), ...r.tin_nhan].sort(
              (a, b) =>
                a.ngay_gui.localeCompare(b.ngay_gui) ||
                a.id.localeCompare(b.id),
            );
          });
          if (!historyInitial.current) {
            setOlder(r.co_tin_cu);
            historyInitial.current = true;
          }
        }
      } catch (e) {
        if (alive) setError((e as Error).message);
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 5000);
    document.addEventListener("visibilitychange", poll);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [visible, current, token, guest]);
  const markRead = useCallback(async () => {
    const last = messages.at(-1);
    if (
      !visible ||
      document.hidden ||
      !nearBottom.current ||
      !last ||
      !current ||
      readIds.current[current] === last.id
    )
      return;
    readIds.current[current] = last.id;
    try {
      await khachApi(
        "/chat/" + current + "/da-doc",
        "POST",
        { tin_nhan_id: last.id },
        token,
        guest,
      );
      await list();
    } catch (e) {
      delete readIds.current[current];
      if (active.current === current) setError((e as Error).message);
    }
  }, [messages, visible, current, token, guest, list]);
  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => {
      if (nearBottom.current && viewport.current)
        viewport.current.scrollTop = viewport.current.scrollHeight;
      void markRead();
    }, 0);
    return () => clearTimeout(timer);
  }, [messages, visible, markRead]);
  function choose(t: Thread) {
    setCurrent(t.id);
    setCurrentName(t.ten_hien_thi);
    setError("");
  }
  async function start(person?: Person) {
    setBusy(true);
    setError("");
    try {
      const r = await khachApi<{ id: string; guest_token?: string }>(
        "/chat",
        "POST",
        person
          ? { nguoi_nhan_id: person.id }
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
      setCurrentName(person?.ten_hien_thi || "Hỗ trợ HomeStay");
      setPeopleMode(false);
      setSearch("");
      await list();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!current || !text.trim() || busy) return;
    const id = current,
      content = text.trim();
    if (
      !pending.current ||
      pending.current.thread !== id ||
      pending.current.text !== content
    )
      pending.current = { thread: id, text: content, id: crypto.randomUUID() };
    setBusy(true);
    setError("");
    try {
      await khachApi(
        "/chat/" + id + "/tin-nhan",
        "POST",
        { noi_dung: content, ma_phia_khach: pending.current.id },
        token,
        guest,
      );
      if (active.current !== id) return;
      pending.current = null;
      setText("");
      nearBottom.current = true;
      const r = await khachApi<{ tin_nhan: Message[] }>(
        "/chat/" + id + "/tin-nhan",
        "GET",
        undefined,
        token,
        guest,
      );
      if (active.current === id)
        setMessages((prev) => {
          const keys = new Set(r.tin_nhan.map((m) => m.id));
          return [...prev.filter((m) => !keys.has(m.id)), ...r.tin_nhan];
        });
      await list();
    } catch (e) {
      if (active.current === id) setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function loadOlder() {
    if (!messages.length || loadingOlder) return;
    const id = current;
    setLoadingOlder(true);
    try {
      const r = await khachApi<{ tin_nhan: Message[]; co_tin_cu: boolean }>(
        "/chat/" + id + "/tin-nhan?truoc=" + messages[0].id,
        "GET",
        undefined,
        token,
        guest,
      );
      if (active.current === id) {
        nearBottom.current = false;
        setMessages((prev) => {
          const keys = new Set(prev.map((m) => m.id));
          return [...r.tin_nhan.filter((m) => !keys.has(m.id)), ...prev];
        });
        setOlder(r.co_tin_cu);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingOlder(false);
    }
  }
  const title =
    threads.find((t) => t.id === current)?.ten_hien_thi ||
    currentName ||
    "Tin nhắn";
  return (
    <div className={"chat-shell " + (inline ? "chat-inline" : "")}>
      <button
        className="chat-launch"
        aria-label={
          "Tin nhắn" + (unread ? ", " + unread + " tin chưa đọc" : "")
        }
        aria-expanded={visible}
        onClick={() => (inline ? input.current?.focus() : setOpen((v) => !v))}
      >
        ☏ {inline ? "Tin nhắn" : open ? "Đóng chat" : "Trò chuyện"}
        {unread > 0 && (
          <span className="chat-total-badge">
            {unread.toLocaleString("vi-VN")}
          </span>
        )}
      </button>
      {visible && (
        <section className="chat-window" aria-label="Hộp thư">
          <header>
            <div>
              <h2>Tin nhắn</h2>
              <small>Kết nối cùng HomeStay</small>
            </div>
            {!inline && (
              <button aria-label="Đóng chat" onClick={() => setOpen(false)}>
                ×
              </button>
            )}
          </header>
          <div className="chat-body">
            <aside>
              <div className="chat-sidebar-head">
                <div className="chat-sidebar-title">
                  <strong>Hội thoại</strong>
                  <span>{total}</span>
                </div>
                <div className="chat-find-tabs">
                  <button
                    className={!peopleMode ? "active" : ""}
                    onClick={() => {
                      setPeopleMode(false);
                      setSearch("");
                    }}
                  >
                    Tất cả
                  </button>
                  {token && (
                    <button
                      className={peopleMode ? "active" : ""}
                      onClick={() => {
                        setPeopleMode(true);
                        setSearch("");
                      }}
                    >
                      Nhắn mới
                    </button>
                  )}
                </div>
                <input
                  className="chat-search"
                  aria-label={
                    peopleMode ? "Tìm người để nhắn" : "Tìm cuộc trò chuyện"
                  }
                  maxLength={100}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    peopleMode ? "Tên hoặc SĐT đầy đủ…" : "Tìm cuộc trò chuyện…"
                  }
                />
                <button
                  className="chat-support"
                  disabled={busy}
                  onClick={() => void start()}
                >
                  + Hỗ trợ đặt phòng
                </button>
              </div>
              <div className="chat-thread-list">
                {peopleMode ? (
                  <>
                    {search.trim().length < 2 ? (
                      <p className="chat-empty">
                        Nhập tên người từng liên hệ, nhóm hỗ trợ hoặc SĐT đầy
                        đủ.
                      </p>
                    ) : finding ? (
                      <p className="chat-empty">Đang tìm…</p>
                    ) : !people.length ? (
                      <p className="chat-empty">
                        Không tìm thấy người phù hợp. Thử SĐT đầy đủ.
                      </p>
                    ) : (
                      people.map((p) => (
                        <button
                          key={p.id}
                          className="chat-person"
                          disabled={busy}
                          onClick={() => void start(p)}
                        >
                          <span className="chat-avatar">
                            {initials(p.ten_hien_thi)}
                          </span>
                          <strong>{p.ten_hien_thi}</strong>
                        </button>
                      ))
                    )}
                  </>
                ) : (
                  <>
                    {threads.map((t) => (
                      <button
                        key={t.id}
                        className={
                          "chat-thread " +
                          (current === t.id ? "chat-chosen " : "") +
                          (t.chua_doc ? "chat-unread" : "")
                        }
                        onClick={() => choose(t)}
                      >
                        <span className="chat-avatar">
                          {initials(t.ten_hien_thi)}
                        </span>
                        <span className="chat-thread-text">
                          <span className="chat-thread-top">
                            <strong>{t.ten_hien_thi}</strong>
                            <time
                              title={
                                t.tin_cuoi_luc
                                  ? new Date(t.tin_cuoi_luc).toLocaleString(
                                      "vi-VN",
                                    )
                                  : ""
                              }
                            >
                              {clock(t.tin_cuoi_luc)}
                            </time>
                          </span>
                          <span className="chat-thread-bottom">
                            <small>{t.tin_cuoi || "Bắt đầu trò chuyện"}</small>
                            {t.chua_doc > 0 && (
                              <b
                                className="chat-unread-badge"
                                aria-label={t.chua_doc + " tin chưa đọc"}
                              >
                                {t.chua_doc.toLocaleString("vi-VN")}
                              </b>
                            )}
                          </span>
                          {t.ten_homestay && (
                            <span className="chat-branch">
                              {t.ten_homestay}
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                    {!threads.length && (
                      <p className="chat-empty">
                        {search
                          ? "Không có cuộc trò chuyện phù hợp."
                          : "Chưa có cuộc trò chuyện. Hãy gửi lời chào!"}
                      </p>
                    )}
                    {threads.length < total && (
                      <button
                        className="chat-more"
                        onClick={() => setPages((v) => v + 1)}
                      >
                        Tải thêm hội thoại ({threads.length}/{total})
                      </button>
                    )}
                  </>
                )}
              </div>
            </aside>
            <div className="chat-main">
              <div className="chat-conversation-head">
                <span className="chat-avatar">{initials(title)}</span>
                <div>
                  <strong>{title}</strong>
                  <small>
                    {current
                      ? "Cuộc trò chuyện của bạn"
                      : "Chọn một cuộc trò chuyện để bắt đầu"}
                  </small>
                </div>
              </div>
              {error && (
                <p role="alert" className="chat-error">
                  {error}
                </p>
              )}
              <div
                className="chat-messages"
                ref={viewport}
                onScroll={() => {
                  const v = viewport.current;
                  if (v) {
                    nearBottom.current =
                      v.scrollHeight - v.scrollTop - v.clientHeight < 36;
                    if (nearBottom.current) void markRead();
                  }
                }}
              >
                {older && (
                  <button
                    className="chat-more"
                    disabled={loadingOlder}
                    onClick={() => void loadOlder()}
                  >
                    {loadingOlder ? "Đang tải…" : "Tải tin trước"}
                  </button>
                )}
                {!current && (
                  <p className="chat-empty">
                    Chọn một cuộc trò chuyện hoặc bấm Hỗ trợ đặt phòng.
                  </p>
                )}
                {current && !messages.length && (
                  <p className="chat-empty">
                    Gửi lời chào để bắt đầu cuộc trò chuyện.
                  </p>
                )}
                {messages.map((m) => (
                  <article key={m.id} className={m.cua_toi ? "chat-mine" : ""}>
                    <small>{m.ten_nguoi_gui}</small>
                    <p>{m.noi_dung}</p>
                    <time title={new Date(m.ngay_gui).toLocaleString("vi-VN")}>
                      {clock(m.ngay_gui)}
                    </time>
                  </article>
                ))}
              </div>
              <form onSubmit={send}>
                <input
                  ref={input}
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

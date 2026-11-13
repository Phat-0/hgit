import { useChatPosition } from "./useChatPosition";
import QuanLyCauTraLoi from "./QuanLyCauTraLoi";
import ChatCongCu from "./ChatCongCu";
import { TepDinhKem, chatUpload, sizeTep, type TepChat } from "./chat-tep";
import "./chat-tien-ich.css";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { khachApi } from "./khach-api";
import "./tro-chuyen.css";
import "./chat-bo-cuc.css";
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
  tep?: TepChat | null;
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
  admin = false,
}: {
  token?: string;
  branch?: string;
  inline?: boolean;
  admin?: boolean;
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
  const floating = useChatPosition(admin);
  const imageInput = useRef<HTMLInputElement>(null);
  const [manageTemplates, setManageTemplates] = useState(false);
  const [hidden, setHidden] = useState(
      () =>
        sessionStorage.getItem(
          "homestay_chat_hidden:" + (admin ? "admin" : "guest"),
        ) === "1",
    ),
    [tool, setTool] = useState<"tim" | "anh" | "tep" | "mau" | null>(null),
    [canReply, setCanReply] = useState(false),
    [selectedFile, setSelectedFile] = useState<File | null>(null),
    [preview, setPreview] = useState(""),
    [contextMode, setContextMode] = useState(false),
    [newIncoming, setNewIncoming] = useState(false),
    [hint, setHint] = useState("");
  const sendLock = useRef(false),
    olderLock = useRef(false),
    restore = useRef<{ id: string; height: number; top: number } | null>(null),
    fileInput = useRef<HTMLInputElement>(null),
    autoStarting = useRef(false),
    autoAttempted = useRef(""),
    latestPoll = useRef("");
  useEffect(() => {
    const fn = () => {
      setHidden(false);
      sessionStorage.removeItem(
        "homestay_chat_hidden:" + (admin ? "admin" : "guest"),
      );
      setOpen(true);
    };
    window.addEventListener("homestay:mo-chat", fn);
    return () => window.removeEventListener("homestay:mo-chat", fn);
  }, [admin]);
  useEffect(() => {
    if (inline) {
      setHidden(false);
      sessionStorage.removeItem("homestay_chat_hidden:admin");
    }
  }, [inline]);
  useEffect(() => {
    if (!selectedFile?.type.startsWith("image/")) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);
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
    pending = useRef<{
      thread: string;
      text: string;
      id: string;
      file?: File | null;
    } | null>(null),
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
    setTool(null);
    setContextMode(false);
    setNewIncoming(false);
    setSelectedFile(null);
    setHint("");
    latestPoll.current = "";
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
            don_gian: admin ? "0" : "1",
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
  }, [token, guest, search, pages, peopleMode, admin]);
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
    if (!visible || !current || contextMode) return;
    let alive = true;
    const poll = async () => {
      if (document.hidden) return;
      try {
        const r = await khachApi<{
          tin_nhan: Message[];
          co_tin_cu: boolean;
          duoc_dung_mau?: boolean;
        }>("/chat/" + current + "/tin-nhan", "GET", undefined, token, guest);
        if (alive) {
          setCanReply(!!r.duoc_dung_mau);
          const last = r.tin_nhan.at(-1)?.id || "";
          if (
            latestPoll.current &&
            latestPoll.current !== last &&
            !nearBottom.current
          )
            setNewIncoming(true);
          latestPoll.current = last;
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
  }, [visible, current, token, guest, contextMode]);
  const markRead = useCallback(async () => {
    const last = messages.at(-1);
    if (
      !visible ||
      contextMode ||
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
  }, [messages, visible, current, token, guest, list, contextMode]);
  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => {
      if (nearBottom.current && viewport.current)
        viewport.current.scrollTop = viewport.current.scrollHeight;
      void markRead();
    }, 0);
    return () => clearTimeout(timer);
  }, [messages, visible, markRead]);
  useLayoutEffect(() => {
    const v = viewport.current,
      r = restore.current;
    if (v && r && r.id === current) {
      v.scrollTop = r.top + v.scrollHeight - r.height;
      restore.current = null;
    }
  }, [messages, current]);
  useEffect(() => {
    const key =
      (branch || "all") + "|" + (token ? "user" : "guest") + "|" + guest;
    if (
      !admin &&
      visible &&
      !current &&
      !busy &&
      !autoStarting.current &&
      autoAttempted.current !== key
    ) {
      autoStarting.current = true;
      autoAttempted.current = key;
      void start().finally(() => {
        autoStarting.current = false;
      });
    }
  }, [admin, visible, current, branch, token, guest, busy]);
  async function jump(message: string) {
    setError("");
    try {
      const r = await khachApi<{
        tin_nhan: Message[];
        co_tin_cu: boolean;
        duoc_dung_mau?: boolean;
      }>(
        "/chat/" + current + "/tin-nhan?den=" + message,
        "GET",
        undefined,
        token,
        guest,
      );
      setContextMode(true);
      nearBottom.current = false;
      setMessages(r.tin_nhan);
      setOlder(r.co_tin_cu);
      setTool(null);
      window.setTimeout(
        () =>
          document
            .getElementById("chat-msg-" + message)
            ?.scrollIntoView({ block: "center", behavior: "smooth" }),
        0,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function newest() {
    nearBottom.current = true;
    setNewIncoming(false);
    if (contextMode) {
      historyInitial.current = false;
      setMessages([]);
      setContextMode(false);
    } else if (viewport.current) {
      viewport.current.scrollTop = viewport.current.scrollHeight;
      void markRead();
    }
  }
  function hideBubble() {
    setOpen(false);
    setHidden(true);
    sessionStorage.setItem(
      "homestay_chat_hidden:" + (admin ? "admin" : "guest"),
      "1",
    );
  }
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
    await sendContent(text.trim());
  }
  async function sendContent(content: string, quick = false) {
    const file = quick ? null : selectedFile;
    if (!current || (!content && !file) || busy || sendLock.current) return;
    sendLock.current = true;
    const id = current;
    if (
      !pending.current ||
      pending.current.thread !== id ||
      pending.current.text !== content ||
      pending.current.file !== file
    )
      pending.current = {
        thread: id,
        text: content,
        id: crypto.randomUUID(),
        file,
      };
    setBusy(true);
    setError("");
    setHint("");
    try {
      if (file)
        await chatUpload(id, file, content, pending.current.id, token, guest);
      else
        await khachApi(
          "/chat/" + id + "/tin-nhan",
          "POST",
          { noi_dung: content, ma_phia_khach: pending.current.id },
          token,
          guest,
        );
      if (active.current !== id) return;
      pending.current = null;
      if (!quick) {
        setText("");
        setSelectedFile(null);
      }
      nearBottom.current = true;
      setContextMode(false);
      setNewIncoming(false);
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
      sendLock.current = false;
    }
  }
  function chooseFile(file?: File) {
    if (!file) return;
    if (
      file.size > 20971520 ||
      (file.type.startsWith("image/") && file.size > 10485760)
    ) {
      setError("Ảnh tối đa 10 MB; tệp tối đa 20 MB");
      return;
    }
    setSelectedFile(file);
    setError("");
  }
  async function loadOlder() {
    if (!messages.length || olderLock.current) return;
    olderLock.current = true;
    const id = current;
    setLoadingOlder(true);
    try {
      const r = await khachApi<{
        tin_nhan: Message[];
        co_tin_cu: boolean;
        duoc_dung_mau?: boolean;
      }>(
        "/chat/" + id + "/tin-nhan?truoc=" + messages[0].id,
        "GET",
        undefined,
        token,
        guest,
      );
      if (active.current === id) {
        nearBottom.current = false;
        if (viewport.current)
          restore.current = {
            id,
            height: viewport.current.scrollHeight,
            top: viewport.current.scrollTop,
          };
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
      olderLock.current = false;
    }
  }
  const title =
    threads.find((t) => t.id === current)?.ten_hien_thi ||
    currentName ||
    "Tin nhắn";
  return (
    <div
      className={
        "chat-shell " +
        (inline ? "chat-inline " : "") +
        (!admin ? "chat-simple" : "")
      }
    >
      {!inline && !hidden && (
        <>
          <button
            className="chat-launch"
            style={floating.launcherStyle}
            {...floating.handlers}
            aria-label={
              "Tin nhắn" + (unread ? ", " + unread + " tin chưa đọc" : "")
            }
            title="Mở tin nhắn · Kéo để đổi vị trí · Phím mũi tên để di chuyển"
            aria-expanded={visible}
            onClick={() => {
              if (floating.consumeDrag()) return;
              inline ? input.current?.focus() : setOpen((v) => !v);
            }}
          >
            <svg
              aria-hidden="true"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M21 11.5a9 9 0 0 1-9 9H4l-3 2v-10a10 10 0 0 1 20-1z" />
              <path d="M6 10h10M6 14h6" />
            </svg>
            {unread > 0 && (
              <span className="chat-total-badge">
                {unread.toLocaleString("vi-VN")}
              </span>
            )}
          </button>
          {
            <button
              className="chat-hide-launch"
              style={floating.hideStyle}
              aria-label="Thu gọn bong bóng chat"
              title="Thu gọn vào mép màn hình"
              onClick={hideBubble}
            >
              {floating.dockRight ? "›" : "‹"}
            </button>
          }
        </>
      )}
      {!inline && hidden && (
        <button
          className="chat-dock-handle"
          style={floating.dockStyle}
          aria-label="Mở lại bong bóng chat"
          title="Mở lại bong bóng chat"
          onClick={() => {
            setHidden(false);
            sessionStorage.removeItem(
              "homestay_chat_hidden:" + (admin ? "admin" : "guest"),
            );
          }}
        >
          {floating.dockRight ? "‹" : "›"}
          {unread > 0 && <span>{unread.toLocaleString("vi-VN")}</span>}
        </button>
      )}
      {visible && (
        <section
          className="chat-window"
          style={inline ? undefined : floating.windowStyle}
          aria-label="Hộp thư"
          onDragOver={(e) => {
            if (current) {
              e.preventDefault();
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (current && !busy) chooseFile(e.dataTransfer.files[0]);
          }}
        >
          <header>
            <div>
              <h2>{admin ? "Tin nhắn" : "Hỗ trợ HomeStay"}</h2>
              <small>Kết nối cùng HomeStay</small>
            </div>
            {!inline && (
              <button aria-label="Đóng chat" onClick={() => setOpen(false)}>
                ×
              </button>
            )}
          </header>
          <div className="chat-body">
            {admin && (
              <aside>
                <div className="chat-sidebar-head">
                  <div className="chat-sidebar-title">
                    <strong>Hội thoại</strong>
                    <span>{total}</span>
                    <button
                      className="chat-template-settings"
                      aria-label="Quản lý câu trả lời soạn sẵn"
                      title="Quản lý câu trả lời soạn sẵn"
                      onClick={() => setManageTemplates(true)}
                    >
                      ⚙
                    </button>
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
                      peopleMode
                        ? "Tên hoặc SĐT đầy đủ…"
                        : "Tìm cuộc trò chuyện…"
                    }
                  />
                  <button
                    className="chat-support"
                    title="Mở cuộc trò chuyện hỗ trợ cho tài khoản hiện tại; không tạo đơn đặt phòng"
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
                              <small>
                                {t.tin_cuoi || "Bắt đầu trò chuyện"}
                              </small>
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
            )}
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
                <div className="chat-tool-buttons">
                  <button
                    disabled={!current}
                    aria-label="Tìm tin nhắn"
                    title="Tìm tin nhắn"
                    onClick={() => setTool(tool === "tim" ? null : "tim")}
                  >
                    ⌕
                  </button>
                  <button
                    disabled={!current}
                    aria-label="Xem ảnh đã gửi"
                    title="Ảnh đã gửi"
                    onClick={() => setTool(tool === "anh" ? null : "anh")}
                  >
                    ▧
                  </button>
                  <button
                    disabled={!current}
                    aria-label="Xem tệp đã gửi"
                    title="Tệp đã gửi"
                    onClick={() => setTool(tool === "tep" ? null : "tep")}
                  >
                    ▤
                  </button>
                </div>
              </div>
              {error && (
                <p role="alert" className="chat-error">
                  {error}
                </p>
              )}
              {hint && (
                <p role="status" className="chat-hint">
                  {hint}
                </p>
              )}
              {contextMode && (
                <button className="chat-context-back" onClick={newest}>
                  Đang xem kết quả tìm kiếm · Về tin mới ↓
                </button>
              )}
              <div
                className="chat-messages"
                ref={viewport}
                onScroll={() => {
                  const v = viewport.current;
                  if (v) {
                    nearBottom.current =
                      v.scrollHeight - v.scrollTop - v.clientHeight < 36;
                    if (nearBottom.current) {
                      setNewIncoming(false);
                      void markRead();
                    }
                    if (v.scrollTop < 60 && older && !loadingOlder)
                      void loadOlder();
                  }
                }}
              >
                {loadingOlder && (
                  <p className="chat-history-loading" role="status">
                    Đang tải tin trước…
                  </p>
                )}
                {!loadingOlder && older && (
                  <p className="chat-history-loading">
                    Kéo lên để xem tin trước
                  </p>
                )}
                {!current && (
                  <p className="chat-empty">
                    {admin
                      ? "Chọn một cuộc trò chuyện hoặc bấm Hỗ trợ đặt phòng."
                      : busy
                        ? "Đang kết nối…"
                        : "Chào bạn! HomeStay sẵn sàng hỗ trợ."}
                  </p>
                )}
                {!admin && !current && !busy && (
                  <button className="chat-more" onClick={() => void start()}>
                    Bắt đầu trò chuyện
                  </button>
                )}
                {current && !messages.length && (
                  <p className="chat-empty">
                    Gửi lời chào để bắt đầu cuộc trò chuyện.
                  </p>
                )}
                {messages.map((m) => (
                  <article
                    id={"chat-msg-" + m.id}
                    key={m.id}
                    className={m.cua_toi ? "chat-mine" : ""}
                  >
                    <small>{m.ten_nguoi_gui}</small>
                    {m.tep && <TepDinhKem tep={m.tep} />}
                    <p>{m.noi_dung}</p>
                    <time title={new Date(m.ngay_gui).toLocaleString("vi-VN")}>
                      {clock(m.ngay_gui)}
                    </time>
                  </article>
                ))}
              </div>
              {newIncoming && !contextMode && (
                <button className="chat-new-message" onClick={newest}>
                  Tin mới ↓
                </button>
              )}
              {selectedFile && (
                <div className="chat-file-preview">
                  {preview && <img src={preview} alt="Xem trước tệp" />}
                  <span>
                    {selectedFile.name}
                    <small>{sizeTep(selectedFile.size)}</small>
                  </span>
                  <button
                    disabled={busy}
                    aria-label="Bỏ tệp đang chọn"
                    onClick={() => setSelectedFile(null)}
                  >
                    ×
                  </button>
                </div>
              )}
              <form onSubmit={send}>
                <div className="chat-compose-tools">
                  <input
                    type="file"
                    ref={imageInput}
                    hidden
                    accept="image/jpeg,image/png,image/webp"
                    disabled={!current || busy}
                    onChange={(e) => {
                      chooseFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    disabled={!current || busy}
                    aria-label="Chọn ảnh"
                    title="Chọn ảnh"
                    onClick={() => imageInput.current?.click()}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="19"
                      height="19"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      aria-hidden="true"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="3" />
                      <circle cx="8" cy="8" r="2" />
                      <path d="m3 17 5-5 4 4 4-6 5 7" />
                    </svg>
                  </button>
                  <input
                    ref={fileInput}
                    type="file"
                    hidden
                    accept="application/pdf,text/plain,text/csv,.docx,.xlsx"
                    disabled={!current || busy}
                    onChange={(e) => {
                      chooseFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    disabled={!current || busy}
                    aria-label="Chọn tệp"
                    title="Chọn tệp"
                    onClick={() => fileInput.current?.click()}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="19"
                      height="19"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      aria-hidden="true"
                    >
                      <path d="m8 12 6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l9-9" />
                    </svg>
                  </button>
                  {(admin || canReply) && (
                    <button
                      type="button"
                      disabled={!current || busy}
                      aria-label="Câu trả lời soạn sẵn"
                      title="Câu trả lời soạn sẵn"
                      onClick={() => setTool(tool === "mau" ? null : "mau")}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="19"
                        height="19"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        aria-hidden="true"
                      >
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                      </svg>
                    </button>
                  )}
                </div>
                <input
                  ref={input}
                  aria-label="Nội dung tin nhắn"
                  disabled={!current}
                  maxLength={4000}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Nhập tin nhắn…"
                />
                <button
                  type="submit"
                  disabled={busy || !current || (!text.trim() && !selectedFile)}
                >
                  {busy
                    ? selectedFile
                      ? "Đang gửi tệp…"
                      : "Đang gửi…"
                    : "Gửi"}
                </button>
              </form>
              {tool && current && (
                <ChatCongCu
                  key={current + tool}
                  id={current}
                  token={token}
                  guest={guest}
                  mode={tool}
                  admin={admin}
                  onClose={() => setTool(null)}
                  onJump={(id) => void jump(id)}
                  onReply={(content, now) => {
                    if (now) {
                      void sendContent(content, true);
                      setTool(null);
                    } else {
                      setText(content);
                      setHint("Kiểm tra thông tin còn thiếu trước khi gửi.");
                      setTool(null);
                      input.current?.focus();
                    }
                  }}
                />
              )}
            </div>
          </div>
        </section>
      )}
      {manageTemplates && admin && token && (
        <QuanLyCauTraLoi
          token={token}
          onClose={() => {
            setManageTemplates(false);
            setTool(null);
          }}
        />
      )}
    </div>
  );
}

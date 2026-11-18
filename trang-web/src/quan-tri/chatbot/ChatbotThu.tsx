import { useEffect, useRef, useState } from "react";
type Message = { role: "user" | "model"; text: string };
type Result = { text: string; handoff: boolean };
export default function ChatbotThu({
  api,
  available,
  name,
}: {
  api: (path: string, method: string, body: unknown) => Promise<Result>;
  available: boolean;
  name: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false),
    bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [messages, busy]);
  async function send() {
    const text = question.trim();
    if (!text || lock.current || !available) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setQuestion("");
    let history = messages.slice(-10);
    while (history.reduce((n, m) => n + m.text.length, 0) > 20000)
      history = history.slice(2);
    setMessages([...messages, { role: "user", text }]);
    try {
      const result = await api("/thu", "POST", {
        cau_hoi: text,
        lich_su: history,
      });
      setMessages([
        ...messages,
        { role: "user", text },
        { role: "model", text: result.text },
      ]);
    } catch (e) {
      setMessages(messages);
      setQuestion(text);
      setError(e instanceof Error ? e.message : "Chưa gửi được, hãy thử lại");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <aside className="cb-card cb-test" aria-label="Chat thử">
      <div className="cb-card-title">
        <h2>Chat thử</h2>
        <button
          type="button"
          disabled={busy || !messages.length}
          onClick={() => {
            setMessages([]);
            setError("");
            setQuestion("");
          }}
        >
          Làm mới
        </button>
      </div>
      <div
        className="cb-chat-log"
        role="log"
        aria-live="polite"
        aria-label="Tin nhắn thử"
      >
        {!messages.length && (
          <p className="cb-chat-empty">Hỏi thử như một khách hàng</p>
        )}
        {messages.map((m, i) => (
          <div className={"cb-chat-message " + m.role} key={i}>
            <small>{m.role === "user" ? "Bạn" : name}</small>
            <p>{m.text}</p>
          </div>
        ))}
        {busy && (
          <div className="cb-chat-message model">
            <p>Đang trả lời…</p>
          </div>
        )}
        <div ref={bottom} />
      </div>
      {error && (
        <p className="cb-error" role="alert">
          {error}
        </p>
      )}
      {!available && <p className="cb-error">Chưa có khóa API trên máy chủ</p>}
      <form
        className="cb-chat-compose"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          aria-label="Tin nhắn thử"
          placeholder="Nhập tin nhắn…"
          rows={2}
          maxLength={2000}
          value={question}
          disabled={busy || !available}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button
          className="cb-primary"
          disabled={busy || !available || !question.trim()}
          aria-label="Gửi tin nhắn thử"
        >
          Gửi
        </button>
      </form>
    </aside>
  );
}

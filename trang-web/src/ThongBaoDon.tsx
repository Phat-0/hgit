import { useCallback, useEffect, useRef, useState } from "react";
import ChiTietDonLich from "./ChiTietDonLich";
type Notice = {
  id: string;
  tieu_de: string;
  noi_dung: string;
  loai: string;
  da_doc_luc: string | null;
  ngay_tao: string;
  du_lieu: { dat_phong_id: string };
};
export default function ThongBaoDon({ token }: { token: string }) {
  const [open, setOpen] = useState(false),
    [rows, setRows] = useState<Notice[]>([]),
    [unread, setUnread] = useState(0),
    [total, setTotal] = useState(0),
    [filter, setFilter] = useState(""),
    [pages, setPages] = useState(1),
    [detail, setDetail] = useState(""),
    [error, setError] = useState("");
  const wrap = useRef<HTMLDivElement>(null),
    serial = useRef(0);
  async function api(path = "", method = "GET") {
    const r = await fetch("/api/quan-tri/thong-bao-don" + path, {
      method,
      headers: { Authorization: "Bearer " + token },
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.message || "Không tải được thông báo");
    return d;
  }
  const load = useCallback(async () => {
    const n = ++serial.current,
      all: Notice[] = [];
    let data;
    for (let i = 0; i < pages; i++) {
      data = await api(
        "?" + new URLSearchParams({ loai: filter, bo_qua: String(i * 40) }),
      );
      all.push(...data.thong_bao);
      if (all.length >= data.tong_so) break;
    }
    if (n !== serial.current || !data) return;
    setRows(all);
    setUnread(data.chua_doc);
    setTotal(data.tong_so);
  }, [token, filter, pages]);
  useEffect(() => {
    let alive = true;
    const poll = () => {
      if (!document.hidden)
        void load().catch((e) => {
          if (alive) setError(e.message);
        });
    };
    poll();
    const t = window.setInterval(poll, 10000);
    document.addEventListener("visibilitychange", poll);
    return () => {
      alive = false;
      serial.current++;
      clearInterval(t);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [load]);
  useEffect(() => {
    setPages(1);
  }, [filter]);
  useEffect(() => {
    if (!open) return;
    const click = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", click);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", click);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  async function read(n?: Notice) {
    try {
      await api(n ? "/" + n.id + "/da-doc" : "/da-doc", "POST");
      await load();
      if (n) {
        setOpen(false);
        setDetail(n.du_lieu.dat_phong_id);
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <div className="qt-booking-bell" ref={wrap}>
        <button
          className="qt-icon-button"
          title="Đơn mới và đơn hủy"
          aria-label={
            "Thông báo đơn" + (unread ? ", " + unread + " chưa đọc" : "")
          }
          aria-expanded={open}
          onClick={() => {
            setOpen((v) => !v);
            if (!open) void load().catch((e) => setError(e.message));
          }}
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
          </svg>
          {unread > 0 && (
            <span className="qt-notice-count">
              {unread.toLocaleString("vi-VN")}
            </span>
          )}
        </button>
        {open && (
          <section
            className="qt-notice-panel"
            aria-label="Thông báo đơn đặt phòng"
          >
            <header>
              <strong>Đơn đặt phòng</strong>
              <button onClick={() => void read()}>Đọc tất cả</button>
              <button
                aria-label="Đóng thông báo"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </header>
            <nav>
              {[
                ["", "Tất cả"],
                ["Đơn mới", "Đơn mới"],
                ["Đơn hủy", "Đơn hủy"],
              ].map(([v, n]) => (
                <button
                  key={v}
                  className={filter === v ? "active" : ""}
                  onClick={() => setFilter(v)}
                >
                  {n}
                </button>
              ))}
            </nav>
            {error && (
              <p role="alert" className="chat-error">
                {error}
              </p>
            )}
            <div className="qt-notice-list">
              {rows.map((n) => (
                <button
                  key={n.id}
                  className={n.da_doc_luc ? "" : "unread"}
                  onClick={() => void read(n)}
                >
                  <span
                    className={
                      n.loai === "Đơn hủy" ? "notice-cancel" : "notice-new"
                    }
                  >
                    {n.loai === "Đơn hủy" ? "×" : "+"}
                  </span>
                  <div>
                    <strong>{n.tieu_de}</strong>
                    <p>{n.noi_dung}</p>
                    <time>{new Date(n.ngay_tao).toLocaleString("vi-VN")}</time>
                  </div>
                  {!n.da_doc_luc && <b aria-label="Chưa đọc">•</b>}
                </button>
              ))}
              {!rows.length && <p>Chưa có thông báo phù hợp.</p>}
              {rows.length < total && (
                <button onClick={() => setPages((v) => v + 1)}>
                  Tải thêm ({rows.length}/{total})
                </button>
              )}
            </div>
          </section>
        )}
      </div>
      {detail && (
        <ChiTietDonLich
          id={detail}
          token={token}
          onClose={() => setDetail("")}
          onChanged={load}
        />
      )}
    </>
  );
}

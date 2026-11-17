import { useCallback, useEffect, useState } from "react";
import "./chatbot.css";
type Config = {
  bat: boolean;
  ten_bot: string;
  huong_dan: string;
  loi_chuyen: string;
  gioi_han_ngay: number;
  phien_ban: number;
};
type Knowledge = {
  id?: string;
  tieu_de: string;
  nhom: string;
  noi_dung: string;
  xuat_ban: boolean;
  phien_ban?: number;
};
type State = {
  cau_hinh: Config;
  co_khoa: boolean;
  model: string;
  kien_thuc: Knowledge[];
  nhat_ky: {
    id: string;
    trang_thai: string;
    ma_loi: string | null;
    cong_cu: string[];
    thoi_gian_ms: number | null;
    nhu_cau?: {
      tom_tat: string;
      so_khach?: number;
      ngan_sach?: number;
      loai_dat?: string;
      mong_muon?: string[];
    };
    ngay_tao: string;
  }[];
  hoi_thoai: {
    id: string;
    ma_khach_chat: number;
    che_do_xu_ly: string;
    ngay_cap_nhat: string;
  }[];
};
const groups = [
  "Câu hỏi thường gặp",
  "Quy định lưu trú",
  "Dịch vụ",
  "Hướng dẫn đặt phòng",
];
const blank = (): Knowledge => ({
  tieu_de: "",
  nhom: groups[0],
  noi_dung: "",
  xuat_ban: false,
});
const status: Record<string, string> = {
  cho: "Chờ xử lý",
  dang_chay: "Đang trả lời",
  xong: "Đã trả lời",
  bo_qua: "Đã bỏ qua",
  loi: "Đã chuyển nhân viên",
};
export default function Chatbot({ token }: { token: string }) {
  const [data, setData] = useState<State | null>(null),
    [cfg, setCfg] = useState<Config | null>(null),
    [tab, setTab] = useState("cau-hinh"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [entry, setEntry] = useState<Knowledge | null>(null),
    [query, setQuery] = useState(""),
    [question, setQuestion] = useState(""),
    [reply, setReply] = useState<{
      text: string;
      tools: string[];
      handoff: boolean;
    } | null>(null);
  const api = useCallback(
    async (path = "", method = "GET", body?: unknown) => {
      const r = await fetch("/api/quan-tri/chatbot" + path, {
        method,
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const d = await r.json();
      if (!r.ok)
        throw new Error(
          Array.isArray(d.message)
            ? d.message.join(", ")
            : d.message || "Không kết nối được máy chủ",
        );
      return d;
    },
    [token],
  );
  const load = useCallback(async () => {
    const d: State = await api();
    setData(d);
    setCfg(d.cau_hinh);
  }, [api]);
  useEffect(() => {
    void load().catch((e) => setError(e.message));
  }, [load]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const dirty =
      (cfg && data && JSON.stringify(cfg) !== JSON.stringify(data.cau_hinh)) ||
      entry;
    if (dirty) window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [cfg, data, entry]);
  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thực hiện được");
    } finally {
      setBusy(false);
    }
  }
  const field = (key: keyof Config, value: unknown) =>
    setCfg((c) => (c ? { ...c, [key]: value } : c));
  return (
    <section className="cb-page" aria-label="Thiết lập chatbot">
      <header className="cb-heading">
        <div>
          <span className="cb-eyebrow">CHĂM SÓC KHÁCH HÀNG</span>
          <h2>Trợ lý tư vấn</h2>
          <p>Tư vấn từ dữ liệu thật, nhân viên luôn có thể tiếp quản.</p>
        </div>
        <span className={"cb-status " + (data?.co_khoa ? "ready" : "")}>
          {data?.co_khoa
            ? "Đã cấu hình khóa Gemini"
            : "Chưa cấu hình khóa Gemini"}
        </span>
      </header>
      <nav className="cb-tabs" aria-label="Mục chatbot">
        {[
          ["cau-hinh", "Thiết lập"],
          ["kien-thuc", "Kho kiến thức"],
          ["thu", "Thử trả lời"],
          ["hoi-thoai", "Hội thoại"],
          ["nhat-ky", "Nhật ký"],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      {error && (
        <div className="cb-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="cb-notice" role="status">
          {notice}
        </div>
      )}
      {!data || !cfg ? (
        <div className="cb-card">
          <p>
            {error ? "Chưa tải được dữ liệu chatbot." : "Đang tải thiết lập…"}
          </p>
          <button onClick={() => void act(load)}>Tải lại</button>
        </div>
      ) : (
        <>
          {tab === "cau-hinh" && (
            <form
              className="cb-card cb-config"
              onSubmit={(e) => {
                e.preventDefault();
                void act(async () => {
                  await api("", "PUT", cfg);
                  await load();
                  setNotice("Đã lưu thiết lập.");
                });
              }}
            >
              <div className="cb-card-title">
                <h2>Trợ lý tư vấn tự động</h2>
                <label className="cb-toggle">
                  <input
                    type="checkbox"
                    checked={cfg.bat}
                    disabled={!data.co_khoa || busy}
                    onChange={(e) => field("bat", e.target.checked)}
                  />{" "}
                  Bật trả lời tự động
                </label>
              </div>
              {!data.co_khoa && (
                <p className="cb-note">
                  Thiết lập GEMINI_API_KEY trong môi trường máy chủ rồi khởi
                  động lại. Khóa không được lưu trong trình duyệt hoặc kho kiến
                  thức.
                </p>
              )}
              <div className="cb-two">
                <label>
                  Tên trợ lý
                  <input
                    maxLength={80}
                    required
                    value={cfg.ten_bot}
                    onChange={(e) => field("ten_bot", e.target.value)}
                  />
                </label>
                <label>
                  Giới hạn lượt tự động / ngày
                  <input
                    type="number"
                    min={1}
                    max={5000}
                    required
                    value={cfg.gioi_han_ngay}
                    onChange={(e) =>
                      field("gioi_han_ngay", Number(e.target.value))
                    }
                  />
                </label>
              </div>
              <label>
                Phong cách và hướng dẫn tư vấn
                <textarea
                  rows={5}
                  maxLength={6000}
                  value={cfg.huong_dan}
                  onChange={(e) => field("huong_dan", e.target.value)}
                  placeholder="Ví dụ: xưng mình – bạn; hỏi thời gian, số khách và nhu cầu trước khi gợi ý phòng."
                />
              </label>
              <label>
                Tin nhắn khi chuyển nhân viên
                <textarea
                  rows={2}
                  required
                  maxLength={500}
                  value={cfg.loi_chuyen}
                  onChange={(e) => field("loi_chuyen", e.target.value)}
                />
              </label>
              <div className="cb-boundaries">
                <strong>Phạm vi của bot</strong>
                <p>
                  Tra chi nhánh, tiện nghi, phòng trống, giá và combo; trả lời
                  kiến thức đã xuất bản. Bot không tạo hay thay đổi đơn, không
                  giữ phòng, không xác nhận thanh toán. Tin nhắn riêng giữa các
                  tài khoản không được gửi đến AI.
                </p>
              </div>
              <footer>
                <small>
                  {data.model} · Múi giờ Việt Nam · Hội thoại mới áp dụng chế độ
                  đã lưu
                </small>
                <button className="cb-primary" disabled={busy}>
                  {busy ? "Đang lưu…" : "Lưu thiết lập"}
                </button>
              </footer>
            </form>
          )}
          {tab === "kien-thuc" && (
            <div className="cb-knowledge">
              <div className="cb-card">
                <div className="cb-card-title">
                  <h2>
                    Kiến thức tư vấn <small>{data.kien_thuc.length}/300</small>
                  </h2>
                  <button
                    onClick={() => setEntry(blank())}
                    disabled={busy || data.kien_thuc.length >= 300}
                  >
                    + Thêm bài
                  </button>
                </div>
                <input
                  aria-label="Tìm bài kiến thức"
                  placeholder="Tìm tiêu đề, nội dung…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <p className="cb-note">
                  Phòng, giá, lịch và combo tự lấy từ hệ thống. Chỉ thêm thông
                  tin đã xác nhận; tránh nhập thông tin riêng của khách.
                </p>
                <div className="cb-entries">
                  {data.kien_thuc
                    .filter((k) =>
                      (k.tieu_de + " " + k.noi_dung)
                        .toLocaleLowerCase("vi")
                        .includes(query.toLocaleLowerCase("vi")),
                    )
                    .map((k) => (
                      <button
                        className="cb-entry"
                        key={k.id}
                        onClick={() => setEntry({ ...k })}
                      >
                        <span>
                          <strong>{k.tieu_de}</strong>
                          <small>{k.nhom}</small>
                        </span>
                        <span className={k.xuat_ban ? "cb-published" : ""}>
                          {k.xuat_ban ? "Đã xuất bản" : "Bản nháp"}
                        </span>
                      </button>
                    ))}
                  {!data.kien_thuc.length && (
                    <p>
                      Chưa có bài kiến thức. Hãy bắt đầu từ quy định nhận phòng,
                      hủy đơn và các dịch vụ.
                    </p>
                  )}
                </div>
              </div>
              {entry && (
                <form
                  className="cb-card"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void act(async () => {
                      await api("/kien-thuc", "POST", entry);
                      setEntry(null);
                      await load();
                      setNotice("Đã lưu bài kiến thức.");
                    });
                  }}
                >
                  <div className="cb-card-title">
                    <h2>{entry.id ? "Chỉnh sửa bài" : "Bài kiến thức mới"}</h2>
                    <button
                      type="button"
                      aria-label="Đóng chỉnh sửa"
                      onClick={() => setEntry(null)}
                    >
                      ×
                    </button>
                  </div>
                  <label>
                    Tiêu đề
                    <input
                      required
                      maxLength={150}
                      value={entry.tieu_de}
                      onChange={(e) =>
                        setEntry({ ...entry, tieu_de: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Nhóm
                    <select
                      value={entry.nhom}
                      onChange={(e) =>
                        setEntry({ ...entry, nhom: e.target.value })
                      }
                    >
                      {groups.map((g) => (
                        <option key={g}>{g}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Nội dung
                    <textarea
                      required
                      rows={10}
                      maxLength={6000}
                      value={entry.noi_dung}
                      onChange={(e) =>
                        setEntry({ ...entry, noi_dung: e.target.value })
                      }
                    />
                  </label>
                  <label className="cb-toggle">
                    <input
                      type="checkbox"
                      checked={entry.xuat_ban}
                      onChange={(e) =>
                        setEntry({ ...entry, xuat_ban: e.target.checked })
                      }
                    />{" "}
                    Xuất bản cho bot sử dụng
                  </label>
                  <p className="cb-note">
                    Bỏ chọn xuất bản để ngừng sử dụng bài; nội dung vẫn được giữ
                    để chỉnh sửa.
                  </p>
                  <button className="cb-primary" disabled={busy}>
                    Lưu bài
                  </button>
                </form>
              )}
            </div>
          )}
          {tab === "thu" && (
            <div className="cb-card cb-preview">
              <h2>Thử trước khi bật</h2>
              <p>
                Thử với thiết lập đã lưu và kiến thức đã xuất bản, không gửi tin
                vào hội thoại khách. Mỗi lần thử là một câu hỏi độc lập, có dùng
                hạn mức Gemini.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void act(async () => {
                    setReply(null);
                    setReply(await api("/thu", "POST", { cau_hoi: question }));
                  });
                }}
              >
                <label>
                  Câu hỏi của khách
                  <textarea
                    rows={3}
                    required
                    maxLength={2000}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Mình cần phòng cho 2 người, có bồn tắm không?"
                  />
                </label>
                <button className="cb-primary" disabled={busy || !data.co_khoa}>
                  {busy ? "Đang tra cứu…" : "Thử trả lời"}
                </button>
              </form>
              {!data.co_khoa && (
                <p className="cb-note">
                  Cần khóa Gemini trên máy chủ để chạy thử thực tế.
                </p>
              )}
              {reply && (
                <div className="cb-answer">
                  <strong>{cfg.ten_bot} · AI</strong>
                  <p>{reply.text}</p>
                  <small>
                    Công cụ: {reply.tools.join(", ") || "Không gọi công cụ"}
                    {reply.handoff ? " · Sẽ chuyển nhân viên" : ""}
                  </small>
                </div>
              )}
            </div>
          )}
          {tab === "hoi-thoai" && (
            <div className="cb-card">
              <div className="cb-card-title">
                <h2>Hội thoại đang mở</h2>
                <button disabled={busy} onClick={() => void act(load)}>
                  Làm mới
                </button>
              </div>
              <p className="cb-note">
                Nhân viên gửi tin sẽ tự chuyển sang tiếp quản. Bật lại AI áp
                dụng cho tin khách tiếp theo.
              </p>
              {data.hoi_thoai.map((t) => (
                <div key={t.id} className="cb-thread">
                  <span>
                    <strong>
                      Khách #{String(t.ma_khach_chat).padStart(6, "0")}
                    </strong>
                    <small>
                      {new Date(t.ngay_cap_nhat).toLocaleString("vi-VN")}
                    </small>
                  </span>
                  <label>
                    <span className="cb-sr">
                      Chế độ Khách {t.ma_khach_chat}
                    </span>
                    <select
                      value={t.che_do_xu_ly}
                      disabled={busy}
                      onChange={(e) => {
                        const mode = e.target.value;
                        void act(async () => {
                          await api("/hoi-thoai/" + t.id, "PUT", {
                            che_do: mode,
                          });
                          await load();
                        });
                      }}
                    >
                      <option>Nhân viên tiếp quản</option>
                      <option disabled={!cfg.bat || !data.co_khoa}>
                        AI hỗ trợ
                      </option>
                    </select>
                  </label>
                </div>
              ))}
              {!data.hoi_thoai.length && (
                <p>Chưa có hội thoại hỗ trợ đang mở.</p>
              )}
            </div>
          )}
          {tab === "nhat-ky" && (
            <div className="cb-card">
              <div className="cb-card-title">
                <h2>50 lượt gần nhất</h2>
                <button disabled={busy} onClick={() => void act(load)}>
                  Làm mới
                </button>
              </div>
              <p className="cb-note">
                Lượt cũ được bỏ qua nếu khách đã gửi tin mới, nhân viên tiếp
                quản hoặc thiết lập thay đổi.
              </p>
              <div className="cb-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Kết quả</th>
                      <th>Đã tra cứu</th>
                      <th>Thời lượng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.nhat_ky.map((j) => (
                      <tr key={j.id}>
                        <td>{new Date(j.ngay_tao).toLocaleString("vi-VN")}</td>
                        <td>
                          {status[j.trang_thai] || j.trang_thai}
                          {j.ma_loi && <small>{j.ma_loi}</small>}
                        </td>
                        <td>
                          {j.cong_cu.join(", ") || "—"}
                          {j.nhu_cau && (
                            <details>
                              <summary>Bản nháp nhu cầu</summary>
                              <p>{j.nhu_cau.tom_tat}</p>
                              <small>
                                {[
                                  j.nhu_cau.so_khach
                                    ? j.nhu_cau.so_khach + " khách"
                                    : "",
                                  j.nhu_cau.ngan_sach !== undefined
                                    ? j.nhu_cau.ngan_sach.toLocaleString(
                                        "vi-VN",
                                      ) + " ₫"
                                    : "",
                                  j.nhu_cau.loai_dat,
                                  (j.nhu_cau.mong_muon || []).join(", "),
                                ]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </small>
                              <small>
                                Cần nhân viên đối chiếu; chưa cập nhật hồ sơ
                                khách.
                              </small>
                            </details>
                          )}
                        </td>
                        <td>
                          {j.thoi_gian_ms === null
                            ? "—"
                            : (j.thoi_gian_ms / 1000).toFixed(1) + "s"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!data.nhat_ky.length && <p>Chưa có lượt trả lời tự động.</p>}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

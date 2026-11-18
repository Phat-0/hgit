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
type CachTraLoi = { cau_hoi_mau: string[]; tu_khoa: string[]; tra_loi: string };
type DieuKien = {
  cau_hoi_mau: string[];
  tu_khoa: string[];
  kieu_khop: "bat_ky" | "tat_ca";
  uu_tien: number;
  cac_tra_loi?: CachTraLoi[];
};
type Knowledge = {
  id?: string;
  tieu_de: string;
  nhom: string;
  noi_dung: string;
  xuat_ban: boolean;
  phien_ban?: number;
  dieu_kien?: DieuKien;
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
const scenarios = [
  {
    name: "Chào hỏi",
    text: "Chào khách thân thiện, ngắn gọn. Hỏi khách cần tìm phòng ở chi nhánh nào và thời gian nào; không hỏi lại thông tin khách đã cung cấp.",
  },
  {
    name: "Thiếu thông tin",
    text: "Chỉ hỏi thông tin còn thiếu để tra cứu: chi nhánh, ngày/giờ nhận và trả, loại đặt, số khách. Hỏi ngắn gọn; không tự đoán thời gian hoặc chọn loại đặt thay khách.",
  },
  {
    name: "Tư vấn phòng",
    text: "Tra dữ liệu phòng, loại phòng, tiện nghi và chi nhánh. Gợi ý tối đa 3 phòng phù hợp nhu cầu, nêu lý do ngắn gọn. Chỉ khẳng định còn trống sau khi kiểm tra đúng khoảng thời gian.",
  },
  {
    name: "Báo giá",
    text: "Dùng công cụ tính giá của hệ thống. Trình bày thời gian, loại đặt, tiền phòng, phụ thu và tổng tiền. Không tự tính hoặc lấy giá ghi trong hướng dẫn này làm giá hiện tại.",
  },
  {
    name: "Không có kết quả",
    text: "Thông báo chưa tìm được lựa chọn phù hợp, hỏi khách muốn đổi thời gian hoặc chi nhánh không. Không bịa phòng trống, ưu đãi hoặc chính sách.",
  },
  {
    name: "Chuyển nhân viên",
    text: "Khi khách yêu cầu nhân viên, khiếu nại, thanh toán, đổi/hủy đơn hoặc thông tin chưa được xác nhận: chuyển nhân viên. Không khẳng định đã xử lý đơn hoặc thanh toán.",
  },
];
const starter: Record<string, { q: string[]; k: string[] }> = {
  "Chào hỏi": { q: ["Xin chào", "Chào homestay"], k: ["xin chào", "hello"] },
  "Thiếu thông tin": {
    q: ["Mình muốn đặt phòng"],
    k: ["muốn đặt phòng", "tìm phòng"],
  },
  "Tư vấn phòng": {
    q: ["Có phòng nào có bồn tắm không?"],
    k: ["tư vấn", "tiện nghi", "bồn tắm", "máy chiếu"],
  },
  "Báo giá": {
    q: ["Phòng này bao nhiêu tiền?", "Cho mình hỏi giá phòng"],
    k: ["giá phòng", "bao nhiêu tiền", "phụ thu"],
  },
  "Không có kết quả": { q: [], k: [] },
  "Chuyển nhân viên": {
    q: ["Mình muốn gặp nhân viên"],
    k: ["gặp nhân viên", "khiếu nại", "hủy đơn", "đổi đơn", "thanh toán"],
  },
};
const condition = (name = ""): DieuKien => ({
  cau_hoi_mau: starter[name]?.q || [],
  tu_khoa: starter[name]?.k || [],
  kieu_khop: "bat_ky",
  uu_tien: 0,
});
const nameOf = (title: string) => title.replace(/^Tình huống: /, "");
const blank = (): Knowledge => ({
  tieu_de: "Tình huống: " + scenarios[0].name,
  nhom: groups[3],
  noi_dung: scenarios[0].text,
  xuat_ban: false,
  dieu_kien: condition(scenarios[0].name),
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
      tinh_huong_khop?: { ten: string; ly_do: string }[];
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
  function updateAnswer(index: number, patch: Partial<CachTraLoi>) {
    setEntry((e) =>
      e
        ? {
            ...e,
            dieu_kien: {
              ...(e.dieu_kien || condition()),
              cac_tra_loi: (e.dieu_kien?.cac_tra_loi || []).map((x, i) =>
                i === index ? { ...x, ...patch } : x,
              ),
            },
          }
        : e,
    );
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
          ["kien-thuc", "Tình huống trả lời"],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
        <details className="cb-advanced">
          <summary>Nâng cao</summary>
          <div>
            <button onClick={() => setTab("hoi-thoai")}>Hội thoại</button>
            <button onClick={() => setTab("nhat-ky")}>Nhật ký</button>
          </div>
        </details>
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
                <strong>Quyền và riêng tư</strong>
                <p>
                  Tra chi nhánh, tiện nghi, phòng trống, giá và combo; trả lời
                  kiến thức đã xuất bản. Bot không tạo hay thay đổi đơn, không
                  giữ phòng, không xác nhận thanh toán. Tin nhắn riêng giữa các
                  tài khoản không được gửi đến AI.
                </p>
              </div>
              <details className="cb-privacy">
                <summary>Quy tắc bắt buộc của hệ thống</summary>
                <ul>
                  <li>
                    Chỉ tra dữ liệu công khai về chi nhánh, phòng, loại phòng,
                    combo, giá và lịch trống.
                  </li>
                  <li>
                    Không trả tên khách, số điện thoại, hồ sơ, nội dung đơn hoặc
                    tệp của người khác. Lịch chỉ trả khả năng đặt phòng.
                  </li>
                  <li>
                    Không tạo/sửa/hủy đơn, giữ chỗ, xác nhận thanh toán hoặc đổi
                    trạng thái phòng.
                  </li>
                  <li>
                    Không nhận yêu cầu bỏ qua quy tắc, chạy SQL hoặc tiết lộ
                    khóa và chỉ dẫn nội bộ.
                  </li>
                  <li>
                    Không bịa giá, lịch và chính sách; thiếu thông tin thì hỏi
                    lại hoặc chuyển nhân viên.
                  </li>
                </ul>
                <p>
                  Quyền bắt buộc được khóa ở máy chủ. Bạn chỉnh cách tư vấn và
                  hướng dẫn bổ sung trong ô phía trên; hướng dẫn đó không thể
                  cấp thêm quyền cho bot.
                </p>
              </details>
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
                    Tình huống trả lời{" "}
                    <small>
                      {
                        data.kien_thuc.filter((x) =>
                          x.tieu_de.startsWith("Tình huống: "),
                        ).length
                      }
                      /20
                    </small>
                  </h2>
                  <button
                    onClick={() => setEntry(blank())}
                    disabled={
                      busy ||
                      data.kien_thuc.length >= 300 ||
                      data.kien_thuc.filter((x) =>
                        x.tieu_de.startsWith("Tình huống: "),
                      ).length >= 20
                    }
                  >
                    + Thêm tình huống
                  </button>
                </div>
                <input
                  aria-label="Tìm tình huống"
                  placeholder="Tìm tình huống…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <p className="cb-note">
                  Chọn tình huống, viết cách bot nên trả lời rồi bật để áp dụng.
                  Phòng, lịch, giá và combo vẫn lấy từ hệ thống.
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
                          <strong>{nameOf(k.tieu_de)}</strong>
                          <small>
                            {k.tieu_de.startsWith("Tình huống: ")
                              ? "Hướng dẫn theo tình huống"
                              : k.nhom}
                          </small>
                        </span>
                        <span className={k.xuat_ban ? "cb-published" : ""}>
                          {k.xuat_ban ? "Đang bật" : "Đang tắt"}
                        </span>
                      </button>
                    ))}
                  {!data.kien_thuc.length && (
                    <p>
                      Chưa có tình huống. Nhấn Thêm tình huống để chọn mẫu có
                      sẵn.
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
                      await api("/kien-thuc", "POST", {
                        ...entry,
                        dieu_kien: {
                          ...(entry.dieu_kien || condition()),
                          cac_tra_loi: (entry.dieu_kien?.cac_tra_loi || []).map(
                            (x) => ({
                              ...x,
                              cau_hoi_mau: x.cau_hoi_mau
                                .map((q) => q.trim())
                                .filter(Boolean),
                              tu_khoa: x.tu_khoa
                                .map((k) => k.trim())
                                .filter(Boolean),
                            }),
                          ),
                          cau_hoi_mau: (entry.dieu_kien?.cau_hoi_mau || [])
                            .map((x) => x.trim())
                            .filter(Boolean),
                          tu_khoa: (entry.dieu_kien?.tu_khoa || [])
                            .map((x) => x.trim())
                            .filter(Boolean),
                        },
                      });
                      setEntry(null);
                      await load();
                      setNotice("Đã lưu tình huống.");
                    });
                  }}
                >
                  <div className="cb-card-title">
                    <h2>{entry.id ? "Sửa tình huống" : "Tình huống mới"}</h2>
                    <button
                      type="button"
                      aria-label="Đóng chỉnh sửa"
                      onClick={() => setEntry(null)}
                    >
                      ×
                    </button>
                  </div>
                  <label>
                    Mẫu tình huống
                    <select
                      aria-label="Mẫu tình huống"
                      value={
                        scenarios.some((x) => x.name === nameOf(entry.tieu_de))
                          ? nameOf(entry.tieu_de)
                          : ""
                      }
                      onChange={(e) => {
                        const item = scenarios.find(
                          (x) => x.name === e.target.value,
                        );
                        if (item)
                          setEntry({
                            ...entry,
                            tieu_de: "Tình huống: " + item.name,
                            nhom: groups[3],
                            noi_dung: item.text,
                            dieu_kien: condition(item.name),
                          });
                        else
                          setEntry({
                            ...entry,
                            tieu_de: "Tình huống: ",
                            noi_dung: "",
                          });
                      }}
                    >
                      <option value="">Tự thiết lập</option>
                      {scenarios.map((x) => (
                        <option key={x.name}>{x.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Tên nhóm tình huống
                    <input
                      required
                      maxLength={130}
                      value={nameOf(entry.tieu_de)}
                      onChange={(e) =>
                        setEntry({
                          ...entry,
                          tieu_de:
                            (entry.tieu_de.startsWith("Tình huống: ")
                              ? "Tình huống: "
                              : "") + e.target.value,
                        })
                      }
                    />
                  </label>
                  <label>
                    Khách thường hỏi như thế nào?
                    <textarea
                      aria-label="Khách thường hỏi như thế nào?"
                      rows={3}
                      maxLength={4200}
                      value={(entry.dieu_kien?.cau_hoi_mau || []).join("\n")}
                      placeholder="Mỗi dòng một cách hỏi. Ví dụ: Phòng này bao nhiêu tiền?"
                      onChange={(e) =>
                        setEntry({
                          ...entry,
                          dieu_kien: {
                            ...(entry.dieu_kien || condition()),
                            cau_hoi_mau: e.target.value.split("\n"),
                          },
                        })
                      }
                    />
                  </label>
                  <label>
                    Từ khóa liên quan
                    <textarea
                      aria-label="Từ khóa liên quan"
                      rows={2}
                      maxLength={1700}
                      value={(entry.dieu_kien?.tu_khoa || []).join("\n")}
                      placeholder="Mỗi dòng một từ hoặc cụm từ: giá phòng, phụ thu…"
                      onChange={(e) =>
                        setEntry({
                          ...entry,
                          dieu_kien: {
                            ...(entry.dieu_kien || condition()),
                            tu_khoa: e.target.value.split(/\n|,/g),
                          },
                        })
                      }
                    />
                  </label>
                  <div className="cb-two">
                    <label>
                      Cách khớp từ khóa
                      <select
                        aria-label="Cách khớp từ khóa"
                        value={entry.dieu_kien?.kieu_khop || "bat_ky"}
                        onChange={(e) =>
                          setEntry({
                            ...entry,
                            dieu_kien: {
                              ...(entry.dieu_kien || condition()),
                              kieu_khop: e.target
                                .value as DieuKien["kieu_khop"],
                            },
                          })
                        }
                      >
                        <option value="bat_ky">Có một từ khóa</option>
                        <option value="tat_ca">Có đủ các từ khóa</option>
                      </select>
                    </label>
                    <label>
                      Ưu tiên
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={entry.dieu_kien?.uu_tien || 0}
                        onChange={(e) =>
                          setEntry({
                            ...entry,
                            dieu_kien: {
                              ...(entry.dieu_kien || condition()),
                              uu_tien: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </label>
                  </div>
                  <p className="cb-note">
                    Khớp cách hỏi mẫu hoặc từ khóa; không phân biệt hoa/thường,
                    có dấu/không dấu. Tối đa 20 dòng mỗi ô. Ưu tiên lớn được
                    chọn trước. Để trống cả hai ô để làm hướng dẫn chung khi
                    chưa khớp tình huống cụ thể.
                  </p>
                  <label>
                    Hướng dẫn trả lời chung cho nhóm
                    <textarea
                      aria-label="Cách bot nên trả lời"
                      required
                      rows={5}
                      maxLength={
                        entry.tieu_de.startsWith("Tình huống: ") ? 1000 : 6000
                      }
                      value={entry.noi_dung}
                      onChange={(e) =>
                        setEntry({ ...entry, noi_dung: e.target.value })
                      }
                    />
                  </label>
                  <div className="cb-answer-group">
                    <div className="cb-card-title">
                      <h3>Các cách hỏi và trả lời trong nhóm</h3>
                      <button
                        type="button"
                        disabled={
                          (entry.dieu_kien?.cac_tra_loi?.length || 0) >= 10
                        }
                        onClick={() =>
                          setEntry({
                            ...entry,
                            dieu_kien: {
                              ...(entry.dieu_kien || condition()),
                              cac_tra_loi: [
                                ...(entry.dieu_kien?.cac_tra_loi || []),
                                { cau_hoi_mau: [], tu_khoa: [], tra_loi: "" },
                              ],
                            },
                          })
                        }
                      >
                        + Thêm cách trả lời
                      </button>
                    </div>
                    <p className="cb-note">
                      Hướng dẫn phía trên dùng chung. Mỗi mục dưới gắn những
                      cách hỏi với một câu trả lời riêng; tối đa 10 mục. Không
                      tự học hay ghi chính sách từ tin khách.
                    </p>
                    {(entry.dieu_kien?.cac_tra_loi || []).map(
                      (answer, index) => (
                        <details
                          className="cb-answer-item"
                          key={index}
                          open={
                            index ===
                            (entry.dieu_kien?.cac_tra_loi?.length || 0) - 1
                          }
                        >
                          <summary>
                            Cách trả lời {index + 1}
                            {answer.cau_hoi_mau[0]
                              ? " · " + answer.cau_hoi_mau[0].slice(0, 45)
                              : ""}
                          </summary>
                          <button
                            className="cb-remove-answer"
                            type="button"
                            aria-label={"Bỏ cách trả lời " + (index + 1)}
                            onClick={() =>
                              setEntry({
                                ...entry,
                                dieu_kien: {
                                  ...(entry.dieu_kien || condition()),
                                  cac_tra_loi: (
                                    entry.dieu_kien?.cac_tra_loi || []
                                  ).filter((_, i) => i !== index),
                                },
                              })
                            }
                          >
                            ×
                          </button>
                          <label>
                            Khách có thể hỏi
                            <textarea
                              aria-label={"Câu hỏi mục " + (index + 1)}
                              rows={2}
                              value={answer.cau_hoi_mau.join("\n")}
                              onChange={(e) =>
                                updateAnswer(index, {
                                  cau_hoi_mau: e.target.value.split("\n"),
                                })
                              }
                              placeholder="Mỗi dòng một cách hỏi tương đương"
                            />
                          </label>
                          <label>
                            Từ khóa / cách gọi liên quan
                            <textarea
                              aria-label={"Từ khóa mục " + (index + 1)}
                              rows={2}
                              value={answer.tu_khoa.join("\n")}
                              onChange={(e) =>
                                updateAnswer(index, {
                                  tu_khoa: e.target.value.split(/\n|,/g),
                                })
                              }
                            />
                          </label>
                          <label>
                            Trả lời hoặc hướng dẫn bot
                            <textarea
                              required
                              aria-label={"Trả lời mục " + (index + 1)}
                              rows={3}
                              maxLength={1000}
                              value={answer.tra_loi}
                              onChange={(e) =>
                                updateAnswer(index, { tra_loi: e.target.value })
                              }
                            />
                          </label>
                        </details>
                      ),
                    )}
                  </div>
                  <label className="cb-toggle">
                    <input
                      type="checkbox"
                      checked={entry.xuat_ban}
                      onChange={(e) =>
                        setEntry({ ...entry, xuat_ban: e.target.checked })
                      }
                    />{" "}
                    Bật tình huống này
                  </label>
                  <p className="cb-note">
                    Bot chỉ dùng hướng dẫn đã lưu và bật. Quy tắc bảo mật, quyền
                    truy cập và tính giá luôn do hệ thống kiểm soát.
                  </p>
                  <button className="cb-primary" disabled={busy}>
                    Lưu tình huống
                  </button>
                </form>
              )}
            </div>
          )}
          {tab === "kien-thuc" && (
            <details className="cb-card cb-preview cb-inline-test">
              <summary>Thử tình huống đã lưu</summary>

              <p>
                Nhập câu hỏi mẫu để thử các tình huống đã lưu và bật. Không gửi
                tin vào hội thoại khách; mỗi lần thử độc lập và dùng hạn mức
                Gemini.
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
                    Đã khớp:{" "}
                    {reply.tinh_huong_khop?.length
                      ? reply.tinh_huong_khop
                          .map((x) => x.ten + " (" + x.ly_do + ")")
                          .join("; ")
                      : "Chưa có tình huống phù hợp — dùng quy tắc chung"}
                  </small>
                  <small>
                    Công cụ: {reply.tools.join(", ") || "Không gọi công cụ"}
                    {reply.handoff ? " · Sẽ chuyển nhân viên" : ""}
                  </small>
                </div>
              )}
            </details>
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

import ChatbotThu from "./ChatbotThu";
import ThongTinChung from "./ThongTinChung";
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
  suy_nghi_sau?: boolean;
  hoi_dap_doc_lap?: boolean;
  nguon_ids?: string[];
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
const condition = (): DieuKien => ({
  cau_hoi_mau: [],
  tu_khoa: [],
  kieu_khop: "bat_ky",
  uu_tien: 0,
});
const nameOf = (title: string) => title.replace(/^Tình huống: /, "");
const blank = (): Knowledge => ({
  tieu_de: "Tình huống: ",
  nhom: groups[3],
  noi_dung: "",
  xuat_ban: false,
  dieu_kien: condition(),
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
    [busy, setBusy] = useState(false),
    [entry, setEntry] = useState<Knowledge | null>(null),
    [query, setQuery] = useState("");
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
  const load = useCallback(
    async (keepConfig = false) => {
      const d: State = await api();
      setData(d);
      setCfg((prev) => (keepConfig ? prev || d.cau_hinh : d.cau_hinh));
      return d;
    },
    [api],
  );
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
  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
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
  const editor = () =>
    entry &&
    data && (
      <form
        className="cb-card cb-situation-editor"
        onSubmit={(e) => {
          e.preventDefault();
          void act(async () => {
            const saved = await api("/kien-thuc", "POST", {
              ...entry,
              dieu_kien: {
                ...(entry.dieu_kien || condition()),
                hoi_dap_doc_lap: true,
                kieu_khop: "bat_ky",
                uu_tien: 0,
                suy_nghi_sau: false,
                cac_tra_loi: (entry.dieu_kien?.cac_tra_loi || []).map((x) => ({
                  ...x,
                  cau_hoi_mau: x.cau_hoi_mau
                    .map((q) => q.trim())
                    .filter(Boolean),
                  tu_khoa: x.tu_khoa.map((k) => k.trim()).filter(Boolean),
                })),
                cau_hoi_mau: (entry.dieu_kien?.cau_hoi_mau || [])
                  .map((x) => x.trim())
                  .filter(Boolean),
                tu_khoa: (entry.dieu_kien?.tu_khoa || [])
                  .map((x) => x.trim())
                  .filter(Boolean),
              },
            });
            const fresh = await load(true);
            setEntry(
              fresh.kien_thuc.find((k) => k.id === (saved.id || entry.id)) ||
                fresh.kien_thuc.find((k) => k.tieu_de === entry.tieu_de) ||
                null,
            );
          });
        }}
      >
        <div className="cb-card-title">
          <button
            type="button"
            aria-label="Đóng chỉnh sửa"
            onClick={() => setEntry(null)}
          >
            ×
          </button>
        </div>
        <label>
          Tên tình huống
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
        <div className="cb-qa-pair">
          {" "}
          <label>
            Khách hỏi
            <textarea
              aria-label="Khách hỏi chính"
              rows={2}
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
            Bot trả lời
            <textarea
              aria-label="Bot trả lời chính"
              required
              rows={3}
              maxLength={entry.tieu_de.startsWith("Tình huống: ") ? 1000 : 6000}
              value={entry.noi_dung}
              onChange={(e) => setEntry({ ...entry, noi_dung: e.target.value })}
            />
          </label>
        </div>
        <label className="cb-keywords">
          Từ khóa
          <input
            aria-label="Từ khóa liên quan"
            maxLength={1700}
            value={(entry.dieu_kien?.tu_khoa || []).join(", ")}
            onChange={(e) =>
              setEntry({
                ...entry,
                dieu_kien: {
                  ...(entry.dieu_kien || condition()),
                  tu_khoa: e.target.value.split(/\n|,/g),
                },
              })
            }
            placeholder="giá phòng, phụ thu…"
          />
        </label>
        <div className="cb-answer-group">
          <div className="cb-card-title">
            <button
              type="button"
              disabled={(entry.dieu_kien?.cac_tra_loi?.length || 0) >= 10}
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
              + Thêm đối đáp
            </button>
          </div>

          {(entry.dieu_kien?.cac_tra_loi || []).map((answer, index) => (
            <div className="cb-answer-item" key={index}>
              <button
                className="cb-remove-answer"
                type="button"
                aria-label={"Bỏ đối đáp " + (index + 1)}
                onClick={() =>
                  setEntry({
                    ...entry,
                    dieu_kien: {
                      ...(entry.dieu_kien || condition()),
                      cac_tra_loi: (entry.dieu_kien?.cac_tra_loi || []).filter(
                        (_, i) => i !== index,
                      ),
                    },
                  })
                }
              >
                ×
              </button>
              <div className="cb-qa-pair">
                <label>
                  Khách hỏi
                  <textarea
                    aria-label={"Câu hỏi mục " + (index + 1)}
                    rows={2}
                    maxLength={4200}
                    value={answer.cau_hoi_mau.join("\n")}
                    onChange={(e) =>
                      updateAnswer(index, {
                        cau_hoi_mau: e.target.value.split("\n"),
                      })
                    }
                  />
                </label>
                <label>
                  Bot trả lời
                  <textarea
                    required
                    aria-label={"Trả lời mục " + (index + 1)}
                    rows={2}
                    maxLength={1000}
                    value={answer.tra_loi}
                    onChange={(e) =>
                      updateAnswer(index, { tra_loi: e.target.value })
                    }
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
        <label className="cb-toggle">
          <input
            type="checkbox"
            checked={entry.xuat_ban}
            onChange={(e) => setEntry({ ...entry, xuat_ban: e.target.checked })}
          />{" "}
          Bật tình huống
        </label>

        <button className="cb-primary" disabled={busy}>
          Lưu
        </button>
      </form>
    );
  const field = (key: keyof Config, value: unknown) =>
    setCfg((c) => (c ? { ...c, [key]: value } : c));
  return (
    <section className="cb-page" aria-label="Thiết lập chatbot">
      <nav className="cb-tabs" aria-label="Mục chatbot">
        {[
          ["cau-hinh", "Thiết lập"],
          ["kien-thuc", "Tình huống"],
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
        <span className={"cb-status " + (data?.co_khoa ? "ready" : "")}>
          {data?.co_khoa ? "Đã kết nối" : "Chưa có khóa API"}
        </span>
      </nav>
      {error && (
        <div className="cb-error" role="alert">
          {error}
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
                  await api("", "PUT", {
                    ...cfg,
                    ten_bot: cfg.ten_bot.trim() || "Trợ lý Homestay",
                  });
                  await load();
                });
              }}
            >
              <div className="cb-card-title">
                <h2>Thiết lập</h2>
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

              <div className="cb-two">
                <label>
                  Tên hiển thị (tùy chọn)
                  <input
                    maxLength={80}
                    placeholder="Trợ lý Homestay"
                    value={cfg.ten_bot}
                    onChange={(e) => field("ten_bot", e.target.value)}
                  />
                </label>
                <label>
                  Lượt / ngày
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
                Quy tắc chung
                <textarea
                  aria-label="Quy tắc chung"
                  rows={10}
                  maxLength={6000}
                  value={cfg.huong_dan}
                  onChange={(e) => field("huong_dan", e.target.value)}
                  placeholder="Ví dụ: xưng mình – bạn; hỏi thời gian, số khách và nhu cầu trước khi gợi ý phòng."
                />
              </label>
              <label>
                Khi chuyển nhân viên
                <textarea
                  rows={2}
                  required
                  maxLength={500}
                  value={cfg.loi_chuyen}
                  onChange={(e) => field("loi_chuyen", e.target.value)}
                />
              </label>
              <footer>
                <button className="cb-primary" disabled={busy}>
                  {busy ? "Đang lưu…" : "Lưu thiết lập"}
                </button>
              </footer>
            </form>
          )}
          {tab === "cau-hinh" && (
            <ThongTinChung
              rows={data.kien_thuc.filter(
                (k) => !k.tieu_de.startsWith("Tình huống: "),
              )}
              busy={busy}
              onSave={async (x) => {
                setBusy(true);
                setError("");
                try {
                  await api("/kien-thuc", "POST", x);
                  await load(true);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Không lưu được");
                  throw e;
                } finally {
                  setBusy(false);
                }
              }}
            />
          )}
          <div
            className={
              tab === "kien-thuc" ? "cb-workspace" : "cb-workspace-hidden"
            }
          >
            {tab === "kien-thuc" && (
              <div className="cb-knowledge cb-situation-list">
                <div className="cb-card">
                  <div className="cb-card-title">
                    <h2>Tình huống</h2>
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
                      + Thêm
                    </button>
                  </div>
                  <input
                    aria-label="Tìm tình huống"
                    placeholder="Tìm tình huống…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />

                  {entry && !entry.id && editor()}
                  <div className="cb-entries">
                    {data.kien_thuc
                      .filter((k) => k.tieu_de.startsWith("Tình huống: "))
                      .filter((k) =>
                        (k.tieu_de + " " + k.noi_dung)
                          .toLocaleLowerCase("vi")
                          .includes(query.toLocaleLowerCase("vi")),
                      )
                      .map((k) => (
                        <div
                          className={
                            "cb-case " + (entry?.id === k.id ? "is-open" : "")
                          }
                          key={k.id}
                        >
                          <button
                            className={
                              "cb-entry " + (k.xuat_ban ? "is-enabled" : "")
                            }
                            aria-expanded={entry?.id === k.id}
                            aria-label={
                              nameOf(k.tieu_de) +
                              (k.xuat_ban ? ", đang bật" : ", đang tắt")
                            }
                            onClick={() =>
                              setEntry(entry?.id === k.id ? null : { ...k })
                            }
                          >
                            <strong>{nameOf(k.tieu_de)}</strong>
                            <span aria-hidden="true">
                              {entry?.id === k.id ? "−" : "+"}
                            </span>
                          </button>
                          {entry?.id === k.id && editor()}
                        </div>
                      ))}
                    {!data.kien_thuc.some((k) =>
                      k.tieu_de.startsWith("Tình huống: "),
                    ) && <p>Chưa có tình huống</p>}
                  </div>
                </div>
              </div>
            )}
            {tab === "kien-thuc" && (
              <ChatbotThu
                api={api}
                available={data.co_khoa}
                name={cfg.ten_bot || "Trợ lý Homestay"}
              />
            )}
          </div>
          {tab === "hoi-thoai" && (
            <div className="cb-card">
              <div className="cb-card-title">
                <h2>Hội thoại</h2>
                <button disabled={busy} onClick={() => void act(load)}>
                  Làm mới
                </button>
              </div>

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
                <h2>Nhật ký</h2>
                <button disabled={busy} onClick={() => void act(load)}>
                  Làm mới
                </button>
              </div>

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

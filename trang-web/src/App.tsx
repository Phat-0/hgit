import { type NoiDungTrangChu } from "./trang-chu-noi-dung";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RangePicker } from "./RangePicker";
import ChonGio from "./ChonGio";
import { ngayVietNam, goiYThoiGian } from "./mac-dinh-thoi-gian";
import { khoangThoiGianLich } from "./khung-gio-dat-phong";
import { khachApi } from "./khach-api";
import TroChuyen from "./TroChuyen";
import AnhPhongNoi from "./AnhPhongNoi";
import "./trang-khach.css";
type Room = {
  id: string;
  ten_phong: string;
  ma_phong: string;
  ten_homestay: string;
  dia_chi: string;
  tinh_thanh: string;
  ten_loai: string;
  mo_ta: string | null;
  suc_chua: number;
  dien_tich_m2: string | null;
  tien_phong: number;
  anh: (string | null)[];
};
type Combo = {
  id: string;
  ten_combo: string;
  mo_ta: string | null;
  gia_combo: string;
  so_gio_bao_gom: number | null;
  bat_dau: string | null;
  ket_thuc: string | null;
  tong_gia: number;
  anh: (string | null)[];
};
type Receipt = {
  ma_dat_phong: string;
  tong_tien: number | string;
  trang_thai: string;
  het_han_giu_cho: string;
};
type BookingHistory = {
  ma_dat_phong: string;
  tong_tien: number | string;
  trang_thai: string;
  ten_phong: string;
  ten_homestay: string;
  nhan_phong_luc: string;
  tra_phong_luc: string;
  trang_thai_thanh_toan: string;
};
type Branch = { id: string; ten_homestay: string };
const money = (n: number | string) => Number(n).toLocaleString("vi-VN") + " ₫";
const defaults = {
  ngay_tu: "14:00",
  ngay_den: "12:00",
  gio_tu: "08:00",
  gio_den: "22:00",
  dem_tu: "20:00",
  dem_den: "08:00",
};
export default function App() {
  const [config, setConfig] = useState<Record<string, string>>(defaults),
    [branches, setBranches] = useState<Branch[]>([]),
    [branch, setBranch] = useState(""),
    [kind, setKind] = useState<"gio" | "ngay" | "dem">("ngay"),
    [start, setStart] = useState(ngayVietNam()),
    [end, setEnd] = useState(ngayVietNam()),
    [st, setSt] = useState("14:00"),
    [et, setEt] = useState("12:00"),
    [rooms, setRooms] = useState<Room[]>([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [searched, setSearched] = useState(false),
    [selected, setSelected] = useState<Room | null>(null),
    [tab, setTab] = useState<"don" | "combo">("don"),
    [combos, setCombos] = useState<Combo[]>([]),
    [combo, setCombo] = useState<Combo | null>(null),
    [price, setPrice] = useState<number | null>(null),
    [busy, setBusy] = useState(false),
    [formError, setFormError] = useState(""),
    [receipt, setReceipt] = useState<Receipt | null>(null),
    [form, setForm] = useState({
      ten_khach: "",
      so_dien_thoai: "",
      so_khach: 1,
      ghi_chu: "",
    });
  const [token, setToken] = useState(""),
    [login, setLogin] = useState(false),
    [phone, setPhone] = useState(""),
    [otp, setOtp] = useState(""),
    [otpSent, setOtpSent] = useState(false),
    [authError, setAuthError] = useState(""),
    [authBusy, setAuthBusy] = useState(false),
    [history, setHistory] = useState<BookingHistory[] | null>(null),
    [lightbox, setLightbox] = useState<string | null>(null);
  const [home, setHome] = useState<NoiDungTrangChu | null>(null);
  const [homeError, setHomeError] = useState("");
  useEffect(() => {
    let active = true;
    khachApi<NoiDungTrangChu>("/trang-chu")
      .then((r) => {
        if (active) setHome(r);
      })
      .catch(() => {
        if (active)
          setHomeError(
            "Chưa tải được nội dung Trang chủ. Vui lòng tải lại trang.",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  const [authMode, setAuthMode] = useState<"phone" | "email">("phone");
  const [authEmail, setAuthEmail] = useState(""),
    [authPassword, setAuthPassword] = useState("");
  useEffect(()=>{if(!login)setAuthPassword('');},[login]);
  const [ready, setReady] = useState(false);
  const serial = useRef(0),
    filterTimer = useRef<number | null>(null);
  const requestKey = useRef(""),
    lastSearch = useRef<Record<string, string> | null>(null),
    modalRef = useRef<HTMLDivElement>(null);
  const interval = () => {
    const t = khoangThoiGianLich(
      kind === "dem" ? "qua-dem" : kind,
      start,
      end,
      kind === "gio" ? st : config[kind + "_tu"],
      kind === "gio" ? et : config[kind + "_den"],
    );
    if (
      !Number.isFinite(+t.start) ||
      !Number.isFinite(+t.end) ||
      t.start >= t.end ||
      +t.start < Date.now() - 60000
    )
      throw Error("Chọn ngày/giờ sắp tới và giờ trả sau giờ nhận.");
    return {
      bat_dau: t.start.toISOString(),
      ket_thuc: t.end.toISOString(),
      hinh_thuc_dat:
        kind === "gio"
          ? "Theo giờ"
          : kind === "ngay"
            ? "Theo ngày"
            : "Theo đêm",
    };
  };
  const applyKind = (next: "gio" | "ngay" | "dem", hours = config) => {
    setKind(next);
    const t = goiYThoiGian(next, hours);
    setStart(t.day);
    setEnd(t.endDay);
    setSt(t.start);
    setEt(t.end);
    setSearched(false);
    setRooms([]);
  };
  useEffect(() => {
    let alive = true;
    khachApi<{ chi_nhanh: Branch[]; khung_gio: Record<string, string> }>(
      "/cau-hinh",
    )
      .then((r) => {
        if (alive) {
          setBranches(r.chi_nhanh);
          setConfig(r.khung_gio);
          applyKind("ngay", r.khung_gio);
          setReady(true);
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const saved = sessionStorage.getItem("homestay_guest_refresh");
      if (!saved) return;
      try {
        const r = await fetch("/api/xac-thuc/lam-moi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: saved }),
        });
        const j = await r.json();
        if (!r.ok) throw Error();
        if (
          alive &&
          sessionStorage.getItem("homestay_guest_refresh") === saved
        ) {
          setToken(j.access_token);
          sessionStorage.setItem("homestay_guest_refresh", j.refresh_token);
        }
      } catch {
        if (alive) {
          sessionStorage.removeItem("homestay_guest_refresh");
          setToken("");
        }
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 20 * 60000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (!selected && !login && history === null) return;
    const before = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => {
      if (document.querySelector(".lp-range-portal,.cg-portal,.anh-phong-noi"))
        return;
      if (e.key === "Escape" && !busy) {
        setSelected(null);
        setLogin(false);
        setHistory(null);
      }
      if (e.key === "Tab" && modalRef.current) {
        const nodes = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(
            "button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled)",
          ),
        );
        if (e.shiftKey && document.activeElement === nodes[0]) {
          e.preventDefault();
          nodes.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === nodes.at(-1)) {
          e.preventDefault();
          nodes[0]?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    modalRef.current?.querySelector<HTMLElement>("button")?.focus();
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", key);
      before?.focus();
    };
  }, [selected, login, history, busy]);
  useEffect(() => {
    if (!ready || !home?.hien_phong) return;
    const current = ++serial.current;
    filterTimer.current = window.setTimeout(() => void loadRooms(current), 350);
    return () => {
      if (filterTimer.current !== null)
        window.clearTimeout(filterTimer.current);
      serial.current++;
    };
  }, [ready, home?.hien_phong, branch, kind, start, end, st, et, config]);
  async function loadRooms(current: number) {
    setLoading(true);
    setError("");
    setRooms([]);
    try {
      const q = { ...interval(), chi_nhanh_id: branch };
      const data = await khachApi<Room[]>("/phong?" + new URLSearchParams(q));
      if (serial.current !== current) return;
      lastSearch.current = q;
      setRooms(data);
      setSearched(true);
    } catch (e) {
      if (serial.current === current) setError((e as Error).message);
    } finally {
      if (serial.current === current) setLoading(false);
    }
  }
  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (filterTimer.current !== null) window.clearTimeout(filterTimer.current);
    await loadRooms(++serial.current);
  }
  async function choose(room: Room) {
    setSelected(room);
    setReceipt(null);
    setTab("don");
    setCombo(null);
    setPrice(room.tien_phong);
    setCombos([]);
    setFormError("");
    requestKey.current = crypto.randomUUID();
    const body = { ...lastSearch.current, phong_id: room.id };
    try {
      const list = await khachApi<Combo[]>("/combo", "POST", body);
      setCombos(list);
    } catch (e) {
      setFormError((e as Error).message);
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setFormError("");
    try {
      const r = await khachApi<Receipt>(
        "/dat-phong",
        "POST",
        {
          ...lastSearch.current,
          ...form,
          phong_id: selected.id,
          combo_id: combo?.id || null,
          khoa_yeu_cau: requestKey.current,
        },
        token,
      );
      setReceipt(r);
      setRooms((v) => v.filter((p) => p.id !== selected.id));
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function auth(e: React.FormEvent) {
    e.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    try {
      if (authMode === "email") {
        const response = await fetch("/api/xac-thuc/dang-nhap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: authEmail, matKhau: authPassword }),
        });
        const r = await response.json();
        if (!response.ok) throw Error(r.message || "Không đăng nhập được");
        // Kiểm tra hồ sơ/trạng thái tài khoản trước khi giữ phiên ở trình duyệt.
        const own = await khachApi<BookingHistory[]>(
          "/don-cua-toi",
          "GET",
          undefined,
          r.access_token,
        );
        setToken(r.access_token);
        sessionStorage.setItem("homestay_guest_refresh", r.refresh_token);
        setAuthPassword("");
        setLogin(false);
        if (!selected || receipt) setHistory(own);
      } else if (!otpSent) {
        await khachApi("/gui-otp", "POST", { so_dien_thoai: phone });
        setOtpSent(true);
      } else {
        const r = await khachApi<{
          access_token: string;
          refresh_token: string;
        }>("/xac-minh-otp", "POST", { so_dien_thoai: phone, otp });
        setToken(r.access_token);
        sessionStorage.setItem("homestay_guest_refresh", r.refresh_token);
        setLogin(false);
        if (!selected || receipt)
          setHistory(
            await khachApi<BookingHistory[]>(
              "/don-cua-toi",
              "GET",
              undefined,
              r.access_token,
            ),
          );
      }
    } catch (e) {
      setAuthError((e as Error).message);
    } finally {
      setAuthBusy(false);
    }
  }
  async function myBookings() {
    if (!token) {
      setLogin(true);
      return;
    }
    setError("");
    try {
      setHistory(
        await khachApi<BookingHistory[]>(
          "/don-cua-toi",
          "GET",
          undefined,
          token,
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const modal = selected || login || history !== null;
  return (
    <main className="kh-site">
      <header className="kh-nav">
        <a className="kh-brand" href="/">
          H<span>◆</span>meStay
        </a>
        <nav>
          <button onClick={()=>window.dispatchEvent(new Event('homestay:mo-chat'))}>Hỗ trợ</button>
          {home?.hien_phong && <a href="#phong-khach">Khám phá phòng</a>}
          <button onClick={() => void myBookings()}>Đơn của tôi</button>
          {token ? (
            <button
              onClick={() => {
                setToken("");
                sessionStorage.removeItem("homestay_guest_refresh");
                setHistory(null);
              }}
            >
              Đăng xuất
            </button>
          ) : (
            <button
              onClick={() => {
                setLogin(true);
                setAuthError("");
              }}
            >
              Đăng nhập / Tham gia
            </button>
          )}
        </nav>
      </header>
      {homeError && (
        <p role="alert" className="kh-error">
          {homeError}
        </p>
      )}
      {!home && !homeError && <p role="status">Đang tải Trang chủ…</p>}
      {home?.hero && (
        <section className="kh-hero kh-cms-hero">
          <div>
            <span className="kh-pill">MỘT KHOẢNG RIÊNG DÀNH CHO BẠN</span>
            <h1>{home.hero.tieu_de}</h1>
            <p>{home.hero.noi_dung}</p>
          </div>
          {home.hero.anh ? (
            <button
              className="kh-cms-photo"
              onClick={() => setLightbox(home.hero!.anh)}
            >
              <img src={home.hero.anh} alt={home.hero.tieu_de} />
            </button>
          ) : (
            <div className="kh-hero-orb" aria-hidden="true">
              <span>
                STAY
                <br />
                <i>your way.</i>
              </span>
            </div>
          )}
        </section>
      )}
      {home?.gioi_thieu && (
        <section className="kh-cms-intro">
          {home.gioi_thieu.anh && (
            <button
              className="kh-cms-photo"
              onClick={() => setLightbox(home.gioi_thieu!.anh)}
            >
              <img src={home.gioi_thieu.anh} alt={home.gioi_thieu.tieu_de} />
            </button>
          )}
          <div>
            <h2>{home.gioi_thieu.tieu_de}</h2>
            <p>{home.gioi_thieu.noi_dung}</p>
          </div>
        </section>
      )}
      {!!home?.the.length && (
        <section className="kh-cms-cards" aria-label="Khám phá Homestay">
          {home.the.map((x, i) => (
            <article key={i}>
              {x.anh && (
                <button
                  className="kh-cms-photo"
                  onClick={() => setLightbox(x.anh)}
                >
                  <img loading="lazy" src={x.anh} alt={x.tieu_de} />
                </button>
              )}
              <h2>{x.tieu_de}</h2>
              <p>{x.noi_dung}</p>
            </article>
          ))}
        </section>
      )}
      {home?.hien_phong && (
        <>
          <section className="kh-search" aria-label="Tìm phòng trống">
            <div className="kh-kinds">
              {(["gio", "ngay", "dem"] as const).map((v, i) => (
                <button
                  key={v}
                  type="button"
                  className={kind === v ? "active" : ""}
                  onClick={() => applyKind(v)}
                >
                  {["Theo giờ", "Theo ngày", "Qua đêm"][i]}
                </button>
              ))}
            </div>
            <form onSubmit={search}>
              <label>
                Chi nhánh
                <select
                  value={branch}
                  onChange={(e) => {
                    setBranch(e.target.value);
                    setSearched(false);
                    setRooms([]);
                  }}
                >
                  <option value="">Tất cả chi nhánh</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.ten_homestay}
                    </option>
                  ))}
                </select>
              </label>
              <div className="kh-search-field">
                <span>Khoảng ngày</span>
                <RangePicker
                  start={start}
                  end={end}
                  minDate={ngayVietNam()}
                  onChange={(a, b) => {
                    setStart(a);
                    setEnd(b);
                    setRooms([]);
                    setSearched(false);
                  }}
                  compact
                />
              </div>
              <div className="kh-search-field">
                <span>
                  {kind === "gio" ? "Giờ nhận / trả" : "Khung giờ áp dụng"}
                </span>
                {kind === "gio" ? (
                  <div className="kh-time-pair">
                    <ChonGio
                      step={30}
                      value={st}
                      label="Giờ nhận phòng"
                      onChange={(v) => {
                        setSt(v);
                        setSearched(false);
                        setRooms([]);
                      }}
                    />
                    <ChonGio
                      step={30}
                      value={et}
                      label="Giờ trả phòng"
                      onChange={(v) => {
                        setEt(v);
                        setSearched(false);
                        setRooms([]);
                      }}
                    />
                  </div>
                ) : (
                  <strong className="kh-clock">
                    {config[kind + "_tu"]} → {config[kind + "_den"]}
                    {config[kind + "_den"] <= config[kind + "_tu"]
                      ? " · hôm sau"
                      : ""}
                  </strong>
                )}
              </div>
              <button className="kh-primary" disabled={loading}>
                {loading ? "Đang tìm…" : "Tìm phòng phù hợp ↗"}
              </button>
            </form>
            <small>
              Giờ Việt Nam · Giá hiển thị cho toàn bộ khoảng đặt. Ngày cuối là
              ngày bắt đầu khung cuối.
            </small>
          </section>
          {error && (
            <p className="kh-error" role="alert">
              {error}
            </p>
          )}
          <section id="phong-khach" className="kh-room-section">
            <div className="kh-section-title">
              <div>
                <span>KHÁM PHÁ KHÔNG GIAN</span>
                <h2>
                  {searched
                    ? "Phòng dành cho thời gian của bạn"
                    : "Bạn muốn nghỉ lúc nào?"}
                </h2>
              </div>
              <small>
                {searched
                  ? rooms.length + " phòng phù hợp"
                  : "Chọn kiểu đặt và thời gian ở phía trên"}
              </small>
            </div>
            {!loading && searched && !rooms.length && (
              <div className="kh-empty">
                Chưa có phòng trống phù hợp. Thử chi nhánh hoặc thời gian khác
                nhé.
              </div>
            )}
            <div className="kh-room-grid">
              {rooms.map((r, i) => (
                <article
                  className="kh-room-card"
                  key={r.id}
                  style={{ animationDelay: Math.min(i, 8) * 55 + "ms" }}
                >
                  <button
                    className="kh-room-photo"
                    aria-label={"Xem phòng " + r.ten_phong}
                    onClick={() => void choose(r)}
                  >
                    {r.anh[0] ? (
                      <img src={r.anh[0]} alt={r.ten_phong} loading="lazy" />
                    ) : (
                      <span className="kh-no-photo">
                        {r.ten_loai}
                        <small>Không gian chờ bạn khám phá</small>
                      </span>
                    )}
                    <span className="kh-room-chip">{r.ten_loai}</span>
                    <span className="kh-room-arrow">↗</span>
                  </button>
                  <div className="kh-room-info">
                    <small>
                      {r.ten_homestay} · {r.tinh_thanh}
                    </small>
                    <h3>{r.ten_phong}</h3>
                    <p>
                      {r.suc_chua} khách{" "}
                      {r.dien_tich_m2 ? " · " + r.dien_tich_m2 + " m²" : ""}
                    </p>
                    <div>
                      <strong>
                        {money(r.tien_phong)}
                        <small> / khoảng đặt</small>
                      </strong>
                      <button onClick={() => void choose(r)}>Chọn phòng</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {!searched && (
              <div className="kh-intro-grid">
                <article>
                  <b>01</b>
                  <h3>Thời gian linh hoạt</h3>
                  <p>
                    Theo giờ, theo ngày hoặc qua đêm theo thiết lập từng khung.
                  </p>
                </article>
                <article>
                  <b>02</b>
                  <h3>Combo đúng nhu cầu</h3>
                  <p>
                    Xem gói dịch vụ và combo giờ áp dụng cho phòng trước khi
                    đặt.
                  </p>
                </article>
                <article>
                  <b>03</b>
                  <h3>Đặt trước, tham gia sau</h3>
                  <p>
                    Xác minh số điện thoại để tìm lại những đơn đã đặt trước khi
                    có tài khoản.
                  </p>
                </article>
              </div>
            )}
          </section>
        </>
      )}
      {home?.chan_trang && (
        <footer className="kh-footer">
          {home.chan_trang.anh && (
            <img
              src={home.chan_trang.anh}
              alt={home.chan_trang.tieu_de}
              width="70"
            />
          )}
          <strong>{home.chan_trang.tieu_de}</strong>
          <span>{home.chan_trang.noi_dung}</span>
          <a href="/quan-tri">Dành cho nhân viên</a>
        </footer>
      )}
      <TroChuyen token={token || undefined} branch={branch} />
      {modal &&
        createPortal(
          <div
            className="kh-shade"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !busy && !authBusy) {
                setSelected(null);
                setLogin(false);
                setHistory(null);
              }
            }}
          >
            <section
              ref={modalRef}
              className={"kh-dialog " + (selected ? "kh-booking-dialog" : "")}
              role="dialog"
              aria-modal="true"
              aria-labelledby="kh-dialog-title"
            >
              <header>
                <h2 id="kh-dialog-title">
                  {login
                    ? "Đăng nhập bằng số điện thoại"
                    : history !== null
                      ? "Những chuyến nghỉ của bạn"
                      : selected?.ten_phong}
                </h2>
                <button
                  aria-label="Đóng"
                  disabled={busy || authBusy}
                  onClick={() => {
                    setSelected(null);
                    setLogin(false);
                    setHistory(null);
                  }}
                >
                  ×
                </button>
              </header>
              {login ? (
                <form className="kh-auth" onSubmit={auth}>
                  <div className="kh-book-tabs">
                    <button
                      type="button"
                      className={authMode === "phone" ? "active" : ""}
                      onClick={() => {
                        setAuthMode("phone");
                        setAuthError("");
                      }}
                    >
                      Số điện thoại
                    </button>
                    <button
                      type="button"
                      className={authMode === "email" ? "active" : ""}
                      onClick={() => {
                        setAuthMode("email");
                        setAuthError("");
                      }}
                    >
                      Email / Mật khẩu
                    </button>
                  </div>
                  {authMode === "email" ? (
                    <>
                      <p>
                        Dùng tài khoản đã có hoặc được quản trị cấp. Không cần
                        mã email khi đăng nhập bằng mật khẩu.
                      </p>
                      <label>
                        Email
                        <input
                          type="email"
                          autoComplete="username"
                          required
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                        />
                      </label>
                      <label>
                        Mật khẩu
                        <input
                          type="password"
                          autoComplete="current-password"
                          minLength={8}
                          maxLength={128}
                          required
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <p>
                        Nhận mã OTP để tham gia và xem lại các đơn đã đặt bằng
                        số này.
                      </p>
                      <label>
                        Số điện thoại
                        <input
                          required
                          disabled={otpSent}
                          autoComplete="tel"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="0901234567"
                        />
                      </label>
                      {otpSent && (
                        <label>
                          Mã OTP
                          <input
                            required
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            maxLength={8}
                          />
                        </label>
                      )}
                    </>
                  )}
                  {authError && (
                    <p className="kh-error" role="alert">
                      {authError}
                    </p>
                  )}
                  <button className="kh-primary" disabled={authBusy}>
                    {authBusy
                      ? "Đang xử lý…"
                      : authMode === "email"
                        ? "Đăng nhập"
                        : otpSent
                          ? "Xác minh và đăng nhập"
                          : "Gửi mã OTP"}
                  </button>
                  {authMode === "phone" && otpSent && (
                    <button
                      type="button"
                      className="kh-link"
                      onClick={() => {
                        setOtpSent(false);
                        setOtp("");
                      }}
                    >
                      Đổi số điện thoại
                    </button>
                  )}
                </form>
              ) : history !== null ? (
                <div className="kh-history">
                  {!history.length && <p>Chưa có đơn nào cho tài khoản này.</p>}
                  {history.map((d) => (
                    <article key={d.ma_dat_phong}>
                      <strong>
                        {d.ten_phong} · {d.ten_homestay}
                      </strong>
                      <span>{d.ma_dat_phong}</span>
                      <p>
                        {new Date(d.nhan_phong_luc).toLocaleString("vi-VN", {
                          timeZone: "Asia/Ho_Chi_Minh",
                        })}{" "}
                        →{" "}
                        {new Date(d.tra_phong_luc).toLocaleString("vi-VN", {
                          timeZone: "Asia/Ho_Chi_Minh",
                        })}
                      </p>
                      <b>{money(d.tong_tien)}</b>
                      <small>
                        {d.trang_thai} · {d.trang_thai_thanh_toan}
                      </small>
                    </article>
                  ))}
                </div>
              ) : receipt ? (
                <div className="kh-receipt">
                  <span>✓</span>
                  <h3>Đã gửi yêu cầu đặt phòng</h3>
                  <p>
                    Mã đặt: <strong>{receipt.ma_dat_phong}</strong>
                  </p>
                  <p>
                    {money(receipt.tong_tien)} · {receipt.trang_thai}
                  </p>
                  <p>
                    Phòng được giữ đến{" "}
                    {new Date(receipt.het_han_giu_cho).toLocaleTimeString(
                      "vi-VN",
                      { timeZone: "Asia/Ho_Chi_Minh" },
                    )}
                    . Vui lòng nhắn nhân viên để được xác nhận trước thời điểm
                    này.
                  </p>
                  <small>Chưa có giao dịch thanh toán nào được xác nhận.</small>
                  {!token && (
                    <button
                      className="kh-primary"
                      onClick={() => {
                        setPhone(form.so_dien_thoai);
                        setLogin(true);
                      }}
                    >
                      Tham gia để lưu đơn của bạn
                    </button>
                  )}
                </div>
              ) : (
                selected && (
                  <>
                    <div className="kh-book-summary">
                      <div>
                        {selected.anh
                          .filter((url): url is string => !!url)
                          .map((url) => (
                            <button key={url} onClick={() => setLightbox(url)}>
                              <img src={url} alt={selected.ten_phong} />
                            </button>
                          ))}
                      </div>
                      <p>
                        {selected.ten_homestay} · {selected.ten_loai} ·{" "}
                        {selected.suc_chua} khách
                      </p>
                      <small>{selected.mo_ta || selected.dia_chi}</small>
                    </div>
                    <div className="kh-book-tabs">
                      <button
                        className={tab === "don" ? "active" : ""}
                        onClick={() => setTab("don")}
                      >
                        Thông tin đặt phòng
                      </button>
                      <button
                        className={tab === "combo" ? "active" : ""}
                        onClick={() => setTab("combo")}
                      >
                        Combo phù hợp <b>{combos.length}</b>
                      </button>
                    </div>
                    {tab === "combo" ? (
                      <div className="kh-combo-list">
                        <button
                          className="kh-link"
                          onClick={() => {
                            setCombo(null);
                            setPrice(selected.tien_phong);
                            setTab("don");
                          }}
                        >
                          Đặt phòng thông thường · {money(selected.tien_phong)}
                        </button>
                        {!combos.length && (
                          <p>
                            Không có combo áp dụng cho phòng và thời gian này.
                          </p>
                        )}
                        {combos.map((c) => (
                          <article key={c.id}>
                            <div className="kh-combo-images">
                              {c.anh
                                .filter((u): u is string => !!u)
                                .map((u) => (
                                  <button
                                    key={u}
                                    onClick={() => setLightbox(u)}
                                  >
                                    <img src={u} alt={c.ten_combo} />
                                  </button>
                                ))}
                            </div>
                            <h3>{c.ten_combo}</h3>
                            <p>{c.mo_ta || "Chưa có mô tả"}</p>
                            <small>
                              {c.so_gio_bao_gom
                                ? c.so_gio_bao_gom + " giờ bao gồm"
                                : "Combo dịch vụ cộng thêm"}{" "}
                              · Giá combo {money(c.gia_combo)}
                            </small>
                            <p>
                              Từ{" "}
                              {c.bat_dau
                                ? new Date(c.bat_dau).toLocaleDateString(
                                    "vi-VN",
                                  )
                                : "Không giới hạn"}{" "}
                              đến{" "}
                              {c.ket_thuc
                                ? new Date(c.ket_thuc).toLocaleDateString(
                                    "vi-VN",
                                  )
                                : "Không giới hạn"}
                            </p>
                            <button
                              className="kh-primary"
                              onClick={() => {
                                setCombo(c);
                                setPrice(c.tong_gia);
                                setTab("don");
                              }}
                            >
                              Chọn combo · Tổng {money(c.tong_gia)}
                            </button>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <form className="kh-book-form" onSubmit={submit}>
                        <p className="kh-book-dates">
                          {new Date(
                            lastSearch.current?.bat_dau || "",
                          ).toLocaleString("vi-VN", {
                            timeZone: "Asia/Ho_Chi_Minh",
                          })}{" "}
                          →{" "}
                          {new Date(
                            lastSearch.current?.ket_thuc || "",
                          ).toLocaleString("vi-VN", {
                            timeZone: "Asia/Ho_Chi_Minh",
                          })}
                        </p>
                        <label>
                          Tên khách hàng
                          <input
                            required
                            minLength={2}
                            maxLength={150}
                            value={form.ten_khach}
                            onChange={(e) =>
                              setForm({ ...form, ten_khach: e.target.value })
                            }
                          />
                        </label>
                        <label>
                          Số điện thoại
                          <input
                            required
                            type="tel"
                            autoComplete="tel"
                            value={form.so_dien_thoai}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                so_dien_thoai: e.target.value,
                              })
                            }
                          />
                        </label>
                        {form.so_dien_thoai && !token && (
                          <div className="kh-join-hint">
                            Bạn chưa đăng nhập. Tham gia để nhận ưu đãi khi có
                            chương trình và dễ dàng quản lý đơn!{" "}
                            <button
                              type="button"
                              onClick={() => {
                                setPhone(form.so_dien_thoai);
                                setLogin(true);
                              }}
                            >
                              Tham gia ngay
                            </button>
                            <small>Bạn vẫn có thể đặt phòng trước.</small>
                          </div>
                        )}
                        <label>
                          Số khách
                          <input
                            required
                            type="number"
                            min={1}
                            max={selected.suc_chua}
                            value={form.so_khach}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                so_khach: Number(e.target.value),
                              })
                            }
                          />
                        </label>
                        <label>
                          Ghi chú
                          <textarea
                            rows={2}
                            maxLength={2000}
                            value={form.ghi_chu}
                            onChange={(e) =>
                              setForm({ ...form, ghi_chu: e.target.value })
                            }
                          />
                        </label>
                        <div className="kh-total">
                          <span>
                            {combo?.ten_combo || "Đặt phòng thông thường"}
                          </span>
                          <strong>
                            {price !== null ? money(price) : "Đang tính…"}
                          </strong>
                        </div>
                        <small>
                          Giá được kiểm tra lại khi gửi. Yêu cầu chờ nhân viên
                          xác nhận, giữ phòng 15 phút.
                        </small>
                        {formError && (
                          <p className="kh-error" role="alert">
                            {formError}
                          </p>
                        )}
                        <button className="kh-primary" disabled={busy}>
                          {busy ? "Đang gửi…" : "Gửi yêu cầu đặt phòng"}
                        </button>
                      </form>
                    )}
                  </>
                )
              )}
            </section>
          </div>,
          document.body,
        )}
      {lightbox && (
        <AnhPhongNoi
          url={lightbox}
          title="Ảnh không gian lưu trú"
          label="Xem ảnh phòng hoặc combo"
          onClose={() => setLightbox(null)}
        />
      )}
    </main>
  );
}

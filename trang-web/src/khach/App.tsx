import {layGiaoDien, type NoiDungTrangChu } from "../dung-chung/du-lieu/trang-chu-noi-dung";
import { useEffect, useRef, useState,type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { RangePicker } from "../dung-chung/lich/RangePicker";
import ChonGio from "../dung-chung/lich/ChonGio";
import { ngayVietNam, goiYThoiGian } from "../dung-chung/lich/mac-dinh-thoi-gian";
import { khoangThoiGianLich } from "../dung-chung/lich/khung-gio-dat-phong";
import { khachApi } from "../dung-chung/api/khach-api";
import TroChuyen from "../dung-chung/tro-chuyen/TroChuyen";
import { lichTuTinNhan } from "./thanh-phan/dat-phong-tu-tin-nhan";
import AnhPhongNoi from "../dung-chung/giao-dien/AnhPhongNoi";
import "./giao-dien/trang-khach.css";
import "./giao-dien/khach-am.css";
import BieuTuong from "../dung-chung/giao-dien/BieuTuong";
import ThuVienAnhKhach from "./thanh-phan/ThuVienAnhKhach";
import {docDonCucBo,donChuaHoanThanh,nhoDonCucBo} from "./thanh-phan/gio-hang";
import ChiTietPhongKhach from "./thanh-phan/ChiTietPhongKhach";
import DanhSachComboKhach from "./thanh-phan/DanhSachComboKhach";
import "./giao-dien/trang-chu-bo-cuc.css";
import "./giao-dien/phong-va-combo.css";
import GioiThieuLuuTru,{DanhGiaTrangChu,ChonSapXep,xepDanhSach,type PhongKhach as Room,type DuLieuGioiThieu,type SapXep} from './thanh-phan/GioiThieuLuuTru';
import BanDoChanTrang from './thanh-phan/BanDoChanTrang';
import './giao-dien/trang-chu-trai-nghiem.css';
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
  het_han_giu_cho?:string|null;
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
  const page=location.pathname.startsWith('/phong-gia')?'phong':location.pathname.startsWith('/uu-dai-combo')?'combo':'home';
  const [catalog,setCatalog]=useState<DuLieuGioiThieu>({phong:[],combo:[],danh_gia:[],chi_nhanh:[]}),[catalogError,setCatalogError]=useState(''),[resultSort,setResultSort]=useState<SapXep>('noi-bat'),[comboChon,setComboChon]=useState('');
  useEffect(()=>{let active=true;void khachApi<DuLieuGioiThieu>('/gioi-thieu').then(d=>{if(active)setCatalog(d);}).catch(e=>{if(active)setCatalogError(e.message);});return()=>{active=false;};},[]);
  const [detailRoom,setDetailRoom]=useState<Room|null>(null),[cartCount,setCartCount]=useState<number|null>(null),[cartOnly,setCartOnly]=useState(false),[roomSearch,setRoomSearch]=useState(''),[capacity,setCapacity]=useState('');
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
    if (ready && next === kind && hours === config) return;
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
  useEffect(()=>{serial.current++;setRooms([]);setSearched(false);setLoading(false);},[branch,kind,start,end,st,et,config]);
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
      return data;
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
    requestAnimationFrame(()=>document.getElementById("ket-qua-phong")?.scrollIntoView({block:"start",behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"}));
  }
  async function choose(room: Room, comboId?: string) {
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
      if(comboId){const selectedCombo=list.find(c=>c.id===comboId);if(!selectedCombo){setSelected(null);setError('Combo vừa thay đổi hoặc không còn áp dụng. Vui lòng chọn lại.');return;}setCombo(selectedCombo);setPrice(Number(selectedCombo.tong_gia));}

    } catch (e) {
      if(comboId){setSelected(null);setError((e as Error).message);}else setFormError((e as Error).message);
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
      nhoDonCucBo(r);
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
  useEffect(()=>{
    if(!token){const update=()=>setCartCount(docDonCucBo().filter(d=>donChuaHoanThanh(d)).length);update();const timer=setInterval(update,30000);return()=>clearInterval(timer);}
    let active=true;
    const refresh=()=>void khachApi<{so_don:number}>('/gio-hang/so-don','GET',undefined,token).then(r=>{if(active)setCartCount(r.so_don);}).catch(()=>{if(active)setCartCount(null);});
    refresh();const timer=setInterval(refresh,30000);window.addEventListener('focus',refresh);
    return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',refresh);};
  },[token,receipt,history]);
  const pending=donChuaHoanThanh;
  const [navOpen, setNavOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!navOpen) return;
    const outside = (e: MouseEvent) => { if (!navRef.current?.contains(e.target as Node)) setNavOpen(false); };
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setNavOpen(false); };
    document.addEventListener('mousedown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', escape); };
  }, [navOpen]);
  useEffect(() => {
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.setAttribute('data-reveal', 'shown'); observer.unobserve(entry.target); }
    }), { threshold: .08 });
    document.querySelectorAll('.kh-site .kh-room-card, .kh-site .kh-cms-cards article').forEach(e => {
      e.setAttribute('data-reveal', 'pending'); observer.observe(e);
    });
    return () => observer.disconnect();
  }, [home, rooms]);
  const modal = selected || login || history !== null;
  const ui=layGiaoDien(home?.giao_dien);
  const rgb=[1,3,5].map(i=>parseInt(ui.mau_nhan.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  const buttonText=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>.179?'#20142b':'#fff';
  return (
    <main className={"kh-site kh-cms-custom kh-page-"+page+" "+(ui.anh_ben_trai?"kh-hero-left":"")} style={{'--kh-font':({georgia:'Georgia, serif',palatino:'Palatino Linotype, Palatino, serif',tahoma:'Tahoma, sans-serif',system:'system-ui, sans-serif'}[ui.font_chu||'georgia']||'Georgia, serif'),'--kh-bg':ui.mau_nen,'--kh-site-image':ui.anh_nen_chung?`url(${JSON.stringify(ui.anh_nen_chung)})`:'none','--kh-accent':ui.mau_nhan,'--kh-button-text':buttonText,'--kh-columns':ui.so_cot,'--kh-hero-image':home?.hero?.anh_nen?`url(${JSON.stringify(home.hero.anh_nen)})`:'none'} as CSSProperties}>

      <header className="kh-nav" ref={navRef}>
        <a className="kh-brand" href="/">
          <BieuTuong ten="home" size={28}/><span>{ui.ten_web}</span>
        </a>
        <button className="kh-nav-toggle" aria-label="Menu điều hướng" aria-expanded={navOpen} aria-controls="kh-navigation" onClick={()=>setNavOpen(!navOpen)}><BieuTuong ten={navOpen ? "close" : "menu"}/></button>
        <nav id="kh-navigation" aria-label="Điều hướng chính" className={navOpen ? "kh-nav-open" : ""} onClick={()=>setNavOpen(false)}>
          <a href="/" aria-current={page==='home'?'page':undefined}>Trang chủ</a>
          {home?.hien_phong&&<a href="/phong-gia" aria-current={page==='phong'?'page':undefined}>Phòng & Giá</a>}
          {home?.hien_phong&&home.hien_combo!==false&&<a href="/uu-dai-combo" aria-current={page==='combo'?'page':undefined}>Ưu đãi Combo</a>}
          <button className="kh-cart-link" onClick={()=>{setCartOnly(true);void myBookings();}}>Giỏ hàng {cartCount!==null&&<span className="kh-cart-count" aria-label={cartCount+' đơn chưa hoàn thành'}>{cartCount>99?'99+':cartCount}</span>}</button>
          {home?.hien_phong&&<a className="kh-nav-book" href="#dat-phong"><BieuTuong ten="calendar"/>Đặt phòng ngay <span aria-hidden="true">→</span></a>}
        </nav>
      </header>
      {homeError && (
        <p role="alert" className="kh-error">
          {homeError}
        </p>
      )}
      {!home && !homeError && <p role="status">Đang tải…</p>}
      {page!=='home'&&<section className="kh-catalog-heading"><span>Một khoảng riêng dành cho bạn</span><h1>{page==='phong'?'Phòng & Giá':'Ưu đãi Combo'}</h1><p>Chọn không gian và thời gian lưu trú phù hợp với bạn.</p><nav aria-label="Danh mục lưu trú"><a href="/phong-gia" aria-current={page==='phong'?'page':undefined}>Phòng</a><a href="/uu-dai-combo" aria-current={page==='combo'?'page':undefined}>Combo</a></nav></section>}
      {page==='home'&&home?.hero && (
        <section id="trang-dau" className="kh-hero kh-cms-hero">
          <div>
            <span className="kh-pill">{ui.khau_hieu}</span>
            <h1>{home.hero.tieu_de}</h1>
            <p>{home.hero.noi_dung}</p>
            <a className="kh-hero-action" href="#dat-phong">Khám phá kỳ nghỉ <span aria-hidden="true">↗</span></a>
          </div>
          {home.hero.anh || home.hero.album?.length || catalog.phong.some(r=>r.anh.some(Boolean)) ?
            <ThuVienAnhKhach anh={[
              ...(home.hero.anh ? [{url:home.hero.anh,ten:home.hero.tieu_de}] : []),
              ...(home.hero.album||[]).map((url,i)=>({url,ten:`${ui.ten_web} · Không gian ${i+1}`})),
              ...(!(home.hero.anh||home.hero.album?.length)?catalog.phong.flatMap(r=>r.anh.filter((url):url is string=>!!url).map(url=>({url,ten:r.ten_phong}))).slice(0,8):[]),
            ]} onMo={setLightbox}/> :
            <a className="kh-stay-note" href="#dat-phong"><span>Một khoảng riêng</span><strong>Chọn lịch nghỉ.<br />Tìm nơi bạn muốn ở.</strong><span>Xem phòng và giá theo thời gian của bạn ↗</span></a>}

        </section>
      )}
      {page==='home'&&home?.gioi_thieu && (
        <section id="gioi-thieu" className="kh-cms-intro">
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
      {page==='home'&&!!home?.the.length && (
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
          <section id="dat-phong" className="kh-search" aria-label="Tìm phòng trống">
            {comboChon&&<p className="kh-combo-intent">Đang chọn {catalog.combo.find(c=>c.id===comboChon)?.ten_combo||'combo'} · Kiểm tra lịch để xem phòng áp dụng. <button type="button" onClick={()=>setComboChon('')}>Bỏ chọn</button></p>}
            <form onSubmit={search}>
              <div className="kh-search-field"><span>Hình thức đặt phòng</span><div className="kh-kinds">
              {(["gio", "ngay", "dem"] as const).map((v, i) => (
                <button
                  key={v}
                  type="button"
                  aria-label={["Theo giờ", "Theo ngày", "Qua đêm"][i]}
                  className={kind === v ? "active" : ""}
                  onClick={() => applyKind(v)}
                >
                  {["Giờ", "Ngày", "Đêm"][i]}
                </button>
              ))}
            </div></div>
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
                      value={st}
                      label="Giờ nhận phòng"
                      onChange={(v) => {
                        if (v === st) return;
                        setSt(v);
                        setSearched(false);
                        setRooms([]);
                      }}
                    />
                    <ChonGio
                      value={et}
                      label="Giờ trả phòng"
                      onChange={(v) => {
                        if (v === et) return;
                        setEt(v);
                        setSearched(false);
                        setRooms([]);
                      }}
                    />
                  </div>
                ) : (
                  <div className="kh-clock-pair"><span>Nhận phòng<strong>{config[kind+'_tu']}</strong></span><span>Trả phòng<strong>{config[kind+'_den']}{config[kind+'_den']<=config[kind+'_tu']?' · hôm sau':''}</strong></span></div>
                )}
              </div>
              <button className="kh-primary" disabled={loading||!ready}>
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
          <section id="ket-qua-phong" className="kh-room-section kh-search-results" hidden={!searched&&!loading} aria-label="Kết quả phòng trống">
            <div className="kh-section-title">
              <div>
                <span>Kết quả kiểm tra phòng</span>
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
            {page==='phong'&&<div className="kh-room-filters"><label>Tìm phòng<input type="search" placeholder="Tên phòng, chi nhánh…" value={roomSearch} onChange={e=>setRoomSearch(e.target.value)}/></label><label>Số khách<select value={capacity} onChange={e=>setCapacity(e.target.value)}><option value="">Tất cả</option>{[1,2,3,4,5,6].map(n=><option key={n} value={n}>{n} khách trở lên</option>)}</select></label></div>}
            <ChonSapXep value={resultSort} onChange={setResultSort} label="Sắp xếp phòng trống"/>
            <div className="kh-room-grid">
              {xepDanhSach(rooms,resultSort,ui.phong_noi_bat||[],r=>r.ten_phong,r=>r.tien_phong).filter(r=>(r.ten_phong+' '+r.ten_homestay).toLocaleLowerCase('vi').includes(roomSearch.toLocaleLowerCase('vi'))&&(!capacity||r.suc_chua>=Number(capacity))).map((r, i) => (
                <article
                  className="kh-room-card"
                  key={r.id}
                  style={{ animationDelay: Math.min(i, 8) * 55 + "ms" }}
                >
                  <button
                    className="kh-room-photo"
                    aria-label={"Xem phòng " + r.ten_phong}
                    onClick={() => setDetailRoom(r)}
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
                      <button onClick={() => setDetailRoom(r)}>Xem chi tiết →</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
          {searched&&home.hien_combo!==false&&<DanhSachComboKhach comboChon={comboChon} query={searched&&lastSearch.current?new URLSearchParams(lastSearch.current).toString():''} phong={rooms} tieuDe={ui.tieu_de_combo||'Combo & trải nghiệm'} onChon={(roomId,comboId)=>{const room=rooms.find(p=>p.id===roomId);if(room)void choose(room,comboId);}}/>}
        </>
      )}
      {home?.hien_phong&&<><div className="kh-catalog-error">{catalogError&&<p role="alert">{catalogError}</p>}</div><GioiThieuLuuTru hienCombo={home.hien_combo!==false} data={{...catalog,combo:home.hien_combo===false?[]:catalog.combo}} page={page} phongNoiBat={ui.phong_noi_bat} comboNoiBat={ui.combo_noi_bat} tieuDePhong={ui.tieu_de_phong} tieuDeCombo={ui.tieu_de_combo||'Combo ưu đãi'} onXem={setDetailRoom} onCombo={id=>{setComboChon(id);if(catalog.combo.find(c=>c.id===id)?.so_gio_bao_gom)applyKind('gio');document.getElementById('dat-phong')?.scrollIntoView({block:'start',behavior:'smooth'});}}/></>}
      {page==='home'&&ui.hien_danh_gia!==false&&<DanhGiaTrangChu items={catalog.danh_gia}/>}
      {home?.chan_trang && (
        <footer className="kh-footer">
          <div className="kh-footer-about">{home.chan_trang.anh?<img className="kh-footer-logo" src={home.chan_trang.anh} alt={home.chan_trang.tieu_de}/>:<BieuTuong ten="home" size={28}/>}<strong>{home.chan_trang.tieu_de}</strong><p>{home.chan_trang.noi_dung}</p></div>
          <nav aria-label="Liên kết cuối trang"><strong>Khám phá HomeStay</strong>{home.hien_phong&&<a href="/phong-gia">Phòng và giá</a>}{home.hien_phong&&home.hien_combo!==false&&<a href="/uu-dai-combo">Ưu đãi Combo</a>}<button onClick={()=>window.dispatchEvent(new Event('homestay:mo-chat'))}>Liên hệ HomeStay</button><a href="/quan-tri">Dành cho nhân viên</a></nav>
          <address className="kh-footer-contact"><strong>Kết nối với chúng tôi</strong>{home.chan_trang.dia_chi&&<span>{home.chan_trang.dia_chi}</span>}{home.chan_trang.dien_thoai&&<a href={'tel:'+home.chan_trang.dien_thoai.replace(/[^+\d]/g,'')}>{home.chan_trang.dien_thoai}</a>}{home.chan_trang.email&&<a href={'mailto:'+home.chan_trang.email}>{home.chan_trang.email}</a>}<button onClick={()=>window.dispatchEvent(new Event('homestay:mo-chat'))}>Nhắn tin cho HomeStay →</button></address>
          {ui.hien_ban_do!==false&&<BanDoChanTrang chiNhanh={catalog.chi_nhanh}/>}
          <small className="kh-footer-bottom">© {new Date().getFullYear()} {ui.ten_web}</small>
        </footer>
      )}
      <TroChuyen token={token || undefined} branch={branch} onNhapDatPhong={text => {
        const lich = lichTuTinNhan(text);
        if (!lich) return;
        // Calendar ranges store the last occupied day, chat text names checkout day.
        const lastDay = config[lich.kind + '_den'] <= config[lich.kind + '_tu']
          ? new Date(new Date(lich.end + 'T12:00:00+07:00').getTime() - 86400000).toISOString().slice(0, 10) : lich.end;
        setStart(lich.start); setEnd(lastDay); setKind(lich.kind);
        if (lich.guests) setForm(f => ({ ...f, so_khach: lich.guests! }));
      }} />
      {detailRoom&&<ChiTietPhongKhach phong={detailRoom} nhan={lastSearch.current?.bat_dau?new Date(lastSearch.current.bat_dau).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'}):start+' · '+st} tra={lastSearch.current?.ket_thuc?new Date(lastSearch.current.ket_thuc).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'}):end+' · '+et} onDong={()=>setDetailRoom(null)} onMo={setLightbox} onDat={()=>{const room=detailRoom;setDetailRoom(null);if(!room.gia_tham_khao){void choose(room);return;}void loadRooms(++serial.current).then(list=>{const free=list?.find(p=>p.id===room.id);if(free)void choose(free);else {setError('Phòng này chưa trống trong lịch đang chọn. Vui lòng đổi thời gian.');document.getElementById('dat-phong')?.scrollIntoView({block:'start'});}});}}/>}
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
                      ? (cartOnly?"Giỏ hàng · Đơn chưa hoàn thành":"Những chuyến nghỉ của bạn")
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
                  <button type="button" onClick={()=>{setToken('');sessionStorage.removeItem('homestay_guest_refresh');setHistory(null);}}>Đăng xuất</button>
                  <button type="button" className="kh-history-toggle" onClick={()=>setCartOnly(!cartOnly)}>{cartOnly?'Xem tất cả đơn':'Chỉ xem đơn chưa hoàn thành'}</button>
                  {!history.filter(d=>!cartOnly||pending(d)).length&&<p>{cartOnly?'Bạn chưa có đơn đang thực hiện.':'Chưa có đơn nào cho tài khoản này.'}</p>}
                  {history.filter(d=>!cartOnly||pending(d)).map((d) => (
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

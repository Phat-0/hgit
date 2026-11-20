import useTuyChonChuyenDong from './useTuyChonChuyenDong';
import {giamChuyenDong} from '../dung-chung/giao-dien/chuyen-dong';
import useParallaxTrangChu from './useParallaxTrangChu';
import useDieuHuongKhach,{denTrangKhach} from './useDieuHuongKhach';
import useHieuUngCuon from './useHieuUngCuon';
import ThongBaoKhach from "./thanh-phan/ThongBaoKhach";
import KhungDatDonChim from "./thanh-phan/KhungDatDonChim";
import ChanTrangKhach from "./thanh-phan/ChanTrangKhach";
import {layGiaoDien, type NoiDungTrangChu } from "../dung-chung/du-lieu/trang-chu-noi-dung";
import { useEffect, useRef, useState,type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { RangePicker } from "../dung-chung/lich/RangePicker";
import ChonKhoangGio from "./thanh-phan/ChonKhoangGio";
import DatPhongKhach,{type MucDatPhong} from "./thanh-phan/DatPhongKhach";
import KetQuaTimPhong from "./thanh-phan/KetQuaTimPhong";
import ChiTietComboKhach from "./thanh-phan/ChiTietComboKhach";
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
import "./giao-dien/trang-chu-bo-cuc.css";
import "./giao-dien/phong-va-combo.css";
import GioiThieuLuuTru,{DanhGiaTrangChu,type PhongKhach as Room,type DuLieuGioiThieu} from './thanh-phan/GioiThieuLuuTru';

import './giao-dien/trang-chu-trai-nghiem.css';
import './giao-dien/trang-chu-anh-noi.css';
import './giao-dien/trang-chu-gon.css';
import './giao-dien/font-tieng-viet.css';
import './giao-dien/can-chinh-khach.css';
import './giao-dien/trang-chu-hoan-thien.css';
import './giao-dien/tham-khao-charmy.css';
import './giao-dien/cuon-va-chuyen-trang.css';
import './giao-dien/chuyen-dong-trai-nghiem.css';
import './giao-dien/lua-chon-chuyen-dong.css';
import './giao-dien/tinh-chinh-gon.css';
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
  const route=useDieuHuongKhach();
  const motion=useTuyChonChuyenDong();
  const page=location.pathname.startsWith('/phong/')?'chi-tiet':location.pathname.startsWith('/ket-qua-phong')?'ket-qua':location.pathname.startsWith('/phong-gia')?'phong':location.pathname.startsWith('/uu-dai-combo')?'combo':'home';
  const [fullResults,setFullResults]=useState<Room[]>([]),[fullLoading,setFullLoading]=useState(false),[fullError,setFullError]=useState('');
  useEffect(()=>{if(page!=='ket-qua'&&page!=='chi-tiet')return;setFullResults([]);setFullError('');setFullLoading(false);let active=true;const q=new URLSearchParams(location.search);if(page==='chi-tiet'&&!['bat_dau','ket_thuc','hinh_thuc_dat'].every(k=>q.has(k)))return;const params=new URLSearchParams();for(const k of ['bat_dau','ket_thuc','hinh_thuc_dat','chi_nhanh_id'])if(q.get(k))params.set(k,q.get(k)!);setFullLoading(true);void khachApi<Room[]>('/phong?'+params).then(items=>{if(active){setFullResults(items);lastSearch.current=Object.fromEntries(params);setRooms(items);}}).catch(e=>{if(active)setFullError(e.message);}).finally(()=>{if(active)setFullLoading(false);});return()=>{active=false;};},[route]);
  const [catalogLoaded,setCatalogLoaded]=useState(false);
  const [catalog,setCatalog]=useState<DuLieuGioiThieu>({phong:[],combo:[],danh_gia:[],chi_nhanh:[]}),[catalogError,setCatalogError]=useState(''),[comboChon,setComboChon]=useState(new URLSearchParams(location.search).get('combo')||'');
  const [comboDetail,setComboDetail]=useState(''),[roomIntent,setRoomIntent]=useState(new URLSearchParams(location.search).get('phong')||'');
  useEffect(()=>{let active=true;void khachApi<DuLieuGioiThieu>('/gioi-thieu').then(d=>{if(active)setCatalog(d);}).catch(e=>{if(active)setCatalogError(e.message);}).finally(()=>{if(active)setCatalogLoaded(true);});return()=>{active=false;};},[]);
  const [bookingOpen,setBookingOpen]=useState(true);
  const [bookingTarget,setBookingTarget]=useState<MucDatPhong|null>(null),[receiptPhone,setReceiptPhone]=useState(''),[guestCount,setGuestCount]=useState(1);
  const [cartCount,setCartCount]=useState<number|null>(null),[cartOnly,setCartOnly]=useState(false);
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
    [receipt, setReceipt] = useState<Receipt | null>(null);
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
  const lastSearch = useRef<Record<string, string> | null>(null),
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
      if (e.key === "Escape" && !authBusy) {
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
  }, [selected, login, history, authBusy]);
  useEffect(()=>{serial.current++;setRooms([]);setSearched(false);setLoading(false);},[branch,kind,start,end,st,et,config]);
  useEffect(()=>{if(ready&&comboChon&&catalog.combo.find(c=>c.id===comboChon)?.so_gio_bao_gom)applyKind('gio');},[ready,comboChon,catalog.combo]);
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
    requestAnimationFrame(()=>document.getElementById("ket-qua-phong")?.scrollIntoView({block:"start",behavior:giamChuyenDong()?"auto":"smooth"}));
  }
  function openRoom(room:Room){
    const fromSearch=!room.gia_tham_khao&&lastSearch.current&&(rooms.some(p=>p.id===room.id)||fullResults.some(p=>p.id===room.id));
    const q=new URLSearchParams();if(fromSearch)for(const k of ['bat_dau','ket_thuc','hinh_thuc_dat','chi_nhanh_id'])if(lastSearch.current?.[k])q.set(k,lastSearch.current[k]);
    denTrangKhach('/phong/'+encodeURIComponent(room.id)+(q.size?'?'+q.toString():''));
  }
  function choose(room:Room,comboId?:string){
    const fromSearch=!room.gia_tham_khao&&!!lastSearch.current&&(rooms.some(p=>p.id===room.id)||fullResults.some(p=>p.id===room.id));
    setReceipt(null);setBookingTarget({room:{...catalog.phong.find(p=>p.id===room.id),...room},seed:fromSearch?{...lastSearch.current!}:undefined,comboId});
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
        if ((!selected || receipt) && !bookingTarget) setHistory(own);
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
        if ((!selected || receipt) && !bookingTarget)
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
  useHieuUngCuon(!motion.reduced,page==='home',!!home);
  useParallaxTrangChu(page==='home'&&!!home&&!motion.reduced);
  useEffect(()=>{setNavOpen(false);setLightbox(null);setSelected(null);setComboDetail('');setBookingTarget(null);setFullError('');setComboChon(new URLSearchParams(location.search).get('combo')||'');setRoomIntent(new URLSearchParams(location.search).get('phong')||'');if(location.hash==='#dat-phong')setBookingOpen(true);},[route]);
  const modal = selected || login || history !== null;
  const ui=layGiaoDien(home?.giao_dien);
  const heroPhotos:{url:string;ten:string;phongId?:string}[]=home?.hero?.bo_anh!==undefined?home.hero.bo_anh.flatMap(item=>{if('url' in item)return [{url:item.url,ten:ui.ten_web}];const room=catalog.phong.find(p=>p.id===item.phong_id),photo=room?.anh_chon?.find(p=>p.id===item.anh_id);return room&&photo?.url?[{url:photo.url,ten:room.ten_phong,phongId:room.id}]:[];}):[
    ...(home?.hero?.anh?[{url:home.hero.anh,ten:home.hero.tieu_de}]:[]),...(home?.hero?.album||[]).map(url=>({url,ten:ui.ten_web})),
    ...(!(home?.hero?.anh||home?.hero?.album?.length)?catalog.phong.flatMap(p=>p.anh.filter((url):url is string=>!!url).map(url=>({url,ten:p.ten_phong,phongId:p.id}))).slice(0,8):[])
  ];
  const detailId=(()=>{try{return decodeURIComponent(location.pathname.split('/')[2]||'');}catch{return '';}})();
  const detailBase=page==='chi-tiet'?catalog.phong.find(p=>p.id===detailId):undefined;
  const detailResult=fullResults.find(p=>p.id===detailId);
  const detailRoom=detailBase?{...detailBase,...detailResult,gia_tham_khao:!detailResult}:undefined;
  useEffect(()=>{document.title=(detailRoom?.ten_phong||(page==='phong'?'Phòng & Giá':page==='combo'?'Ưu đãi Combo':page==='ket-qua'?'Phòng trống':'Không gian dành cho bạn'))+' | '+ui.ten_web;},[page,detailRoom?.id,detailRoom?.ten_phong,ui.ten_web]);
  const lightboxRoom=lightbox?(detailRoom?.anh.includes(lightbox)?detailRoom:catalog.phong.find(p=>p.id===heroPhotos.find(a=>a.url===lightbox)?.phongId)||catalog.phong.find(p=>p.anh.includes(lightbox))):undefined;
  const rgb=[1,3,5].map(i=>parseInt(ui.mau_nhan.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  const buttonText=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>.179?'#20142b':'#fff';
  return (
    <main className={"kh-site kh-cms-custom kh-page-"+page+" "+(ui.anh_ben_trai?"kh-hero-left":"")} style={{'--kh-font':'"Home Serif", Georgia, serif','--kh-bg':ui.mau_nen,'--kh-site-image':ui.anh_nen_chung?`url(${JSON.stringify(ui.anh_nen_chung)})`:'none','--kh-accent':ui.mau_nhan,'--kh-button-text':buttonText,'--kh-columns':ui.so_cot,'--kh-hero-image':home?.hero?.anh_nen?`url(${JSON.stringify(home.hero.anh_nen)})`:'none'} as CSSProperties}>

      <header className="kh-nav" ref={navRef}>
        <a className="kh-brand" href="/">
          <BieuTuong ten="home" size={28}/><span>{ui.ten_web}</span>
        </a>
        <button className="kh-nav-toggle" aria-label="Menu điều hướng" aria-expanded={navOpen} aria-controls="kh-navigation" onClick={()=>setNavOpen(!navOpen)}><BieuTuong ten={navOpen ? "close" : "menu"}/></button>
        <nav id="kh-navigation" aria-label="Điều hướng chính" className={navOpen ? "kh-nav-open" : ""} onClick={()=>setNavOpen(false)}>

          <a href="/" aria-current={page==='home'?'page':undefined}>Trang chủ</a>
          {home?.hien_phong&&<a href="/phong-gia" aria-current={page==='phong'||page==='chi-tiet'?'page':undefined}>Phòng & Giá</a>}
          {home?.hien_phong&&home.hien_combo!==false&&<a href="/uu-dai-combo" aria-current={page==='combo'?'page':undefined}>Ưu đãi Combo</a>}
          {token&&<ThongBaoKhach token={token}/>}
          <button className="kh-cart-link" onClick={()=>{setCartOnly(true);void myBookings();}}><span className="kh-cart-icon"><BieuTuong ten="cart"/>{cartCount!==null&&<span className="kh-cart-count" aria-label={cartCount+' đơn chưa hoàn thành'}>{cartCount>99?'99+':cartCount}</span>}</span> Giỏ hàng</button>
          {home?.hien_phong&&<a className="kh-nav-book" onClick={()=>setBookingOpen(true)} href={page==='home'?'#dat-phong':'/#dat-phong'}><BieuTuong ten="calendar"/>Đặt phòng ngay <span aria-hidden="true">→</span></a>}
        </nav>
      </header>
      {homeError && (
        <p role="alert" className="kh-error">
          {homeError}
        </p>
      )}
      {!home && !homeError && <p role="status">Đang tải…</p>}

      {(page==='phong'||page==='combo')&&<h1 className="kh-visually-hidden">{page==='phong'?'Phòng & Giá':'Ưu đãi Combo'}</h1>}
      {page==='home'&&home?.hero && (
        <section id="trang-dau" className="kh-hero kh-cms-hero" style={{"--kh-top-image":ui.anh_nen_chung||home.hero.anh_nen?`url(${JSON.stringify(ui.anh_nen_chung||home.hero.anh_nen)})`:"none"} as CSSProperties}>
          <div>
            <span className="kh-pill">{ui.khau_hieu}</span>
            <h1 className="kh-headline-lines">{home.hero.tieu_de.split(/\n|(?<=[.!?])\s+/).map((line,i)=><span key={i} className="kh-headline-mask"><span style={{animationDelay:(i*160)+'ms'}}>{line}</span></span>)}</h1>
            <p>{home.hero.noi_dung}</p>
            <a className="kh-hero-action" href="#dat-phong" onClick={()=>setBookingOpen(true)}>Khám phá kỳ nghỉ <span aria-hidden="true">↗</span></a>
          </div>
          {heroPhotos.length?<ThuVienAnhKhach noi anh={heroPhotos} onMo={setLightbox}/>:<a className="kh-stay-note" href="#dat-phong">Chọn lịch nghỉ và khám phá phòng →</a>}


        </section>
      )}
      {page==='home'&&home?.gioi_thieu && (
        <section id="gioi-thieu" className="kh-cms-intro" style={{backgroundImage:home.gioi_thieu.anh?`url(${JSON.stringify(home.gioi_thieu.anh)})`:"none"}}>
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
      {home?.hien_phong && page==='home' && (
        <>
          <section id="dat-phong" className={"kh-booking-split "+(bookingOpen?"is-open":"")}><button type="button" className="kh-booking-toggle" aria-expanded={bookingOpen} aria-controls="kh-booking-panel" onClick={()=>setBookingOpen(!bookingOpen)}><BieuTuong ten="calendar"/>{ui.nhan_dat_don||"Đặt đơn"} <span aria-hidden="true">{bookingOpen?'−':'+'}</span></button><KhungDatDonChim title={ui.nhan_dat_don||"Đặt đơn"} description={ui.khau_hieu} open={bookingOpen} animate={!motion.reduced} duration={ui.toc_do_mo_dat_don||1600}><section className="kh-search" aria-label="Tìm phòng trống">
            {roomIntent&&<p className="kh-combo-intent">Đang chọn {catalog.phong.find(p=>p.id===roomIntent)?.ten_phong||'phòng'} · Chọn lịch để kiểm tra phòng trống. <button type="button" onClick={()=>setRoomIntent('')}>Bỏ chọn</button></p>}
            {comboChon&&<p className="kh-combo-intent">Đang chọn {catalog.combo.find(c=>c.id===comboChon)?.ten_combo||'combo'} · Kiểm tra lịch để xem phòng áp dụng. <button type="button" onClick={()=>setComboChon('')}>Bỏ chọn</button></p>}
            <form onSubmit={search}>
              <div className="kh-search-field"><span>Hình thức đặt phòng</span><div className="kh-kinds" style={{"--kind-index":["gio","ngay","dem"].indexOf(kind)} as CSSProperties}><span className="kh-kind-indicator" aria-hidden="true"/>
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
              <label className="kh-search-field">
                <span>Chi nhánh</span>
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
              <div className={"kh-search-field " + (kind !== "gio" ? "kh-search-fixed-hours" : "")}>
                <span>
                  {kind === "gio" ? "Giờ nhận / trả" : "Khung giờ áp dụng"}
                </span>
                {kind === "gio" ? (
                  <ChonKhoangGio date={start} endDate={end} start={st} end={et} config={config} onChange={(day,last,a,b)=>{setStart(day);setEnd(last);setSt(a);setEt(b);setSearched(false);setRooms([]);}}/>
                ) : (
                  <div className="kh-clock-pair"><span>Nhận <strong>{config[kind+'_tu']}</strong></span><span>Trả <strong>{config[kind+'_den']}{config[kind+'_den']<=config[kind+'_tu']?' · hôm sau':''}</strong></span></div>
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
          </KhungDatDonChim></section>
          {(searched||loading)&&<KetQuaTimPhong rooms={rooms.map(p=>({...catalog.phong.find(c=>c.id===p.id),...p}))} loading={loading} onXem={room=>openRoom(room)} onTatCa={()=>{const q=lastSearch.current;if(q)denTrangKhach('/ket-qua-phong?'+new URLSearchParams(q));}}/>}
        </>
      )}
      {page==='ket-qua'&&<section className="kh-full-results"><h1>Phòng trống theo chi nhánh</h1>{lastSearch.current&&<p className="kh-results-period">{lastSearch.current.hinh_thuc_dat} · {new Date(lastSearch.current.bat_dau).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})} → {new Date(lastSearch.current.ket_thuc).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}</p>}{fullError&&<p role="alert" className="kh-error">{fullError}</p>}<KetQuaTimPhong rooms={fullResults.map(p=>({...catalog.phong.find(c=>c.id===p.id),...p}))} loading={fullLoading} full onXem={openRoom}/></section>}
      {page==='chi-tiet'&&(catalogError?<p role="alert" className="kh-error">{catalogError}</p>:!catalogLoaded?<p role="status">Đang tải thông tin phòng…</p>:detailRoom?<><ChiTietPhongKhach phong={detailRoom} phongKhac={catalog.phong.filter(p=>p.id!==detailRoom.id).sort((a,b)=>Number(b.homestay_id===detailRoom.homestay_id)-Number(a.homestay_id===detailRoom.homestay_id)).slice(0,4)} onXem={openRoom} dangKiemTra={fullLoading} onMo={setLightbox} onDat={()=>choose(detailRoom)}/>{fullError&&<p role="alert" className="kh-error">{fullError}</p>}{fullLoading&&<p role="status">Đang kiểm tra lại lịch và giá…</p>}</>:<section className="kh-room-not-found"><h1>Không tìm thấy phòng</h1><a href="/phong-gia">Xem các phòng khác →</a></section>)}
      {home?.hien_phong&&page!=='ket-qua'&&page!=='chi-tiet'&&<><div className="kh-catalog-error">{catalogError&&<p role="alert">{catalogError}</p>}</div><GioiThieuLuuTru hienCombo={home.hien_combo!==false} data={{...catalog,combo:home.hien_combo===false?[]:catalog.combo}} page={page} phongNoiBat={ui.phong_noi_bat} comboNoiBat={ui.combo_noi_bat} tieuDePhong={ui.tieu_de_phong} tieuDeCombo={ui.tieu_de_combo||'Combo ưu đãi'} onXem={openRoom} onCombo={id=>setComboDetail(id)}/></>}
      {page==='home'&&ui.hien_danh_gia!==false&&<DanhGiaTrangChu items={catalog.danh_gia} title={ui.tieu_de_danh_gia}/>}
      {home?.chan_trang&&<ChanTrangKhach data={home.chan_trang} name={ui.ten_web} branches={catalog.chi_nhanh} branch={branch} map={ui.hien_ban_do!==false} rooms={home.hien_phong} combos={home.hien_combo!==false}/>}

      <TroChuyen token={token || undefined} branch={branch} onNhapDatPhong={text => {
        const lich = lichTuTinNhan(text);
        if (!lich) return;
        // Calendar ranges store the last occupied day, chat text names checkout day.
        const lastDay = config[lich.kind + '_den'] <= config[lich.kind + '_tu']
          ? new Date(new Date(lich.end + 'T12:00:00+07:00').getTime() - 86400000).toISOString().slice(0, 10) : lich.end;
        setStart(lich.start); setEnd(lastDay); setKind(lich.kind);
        if (lich.guests) setGuestCount(lich.guests);
      }} />
      {comboDetail&&catalog.combo.find(c=>c.id===comboDetail)&&<ChiTietComboKhach key={comboDetail} combo={catalog.combo.find(c=>c.id===comboDetail)!} phong={catalog.phong} onDong={()=>setComboDetail('')} onMo={setLightbox} onChon={(comboQuantity,roomId)=>{const item=catalog.combo.find(c=>c.id===comboDetail)!;const eligible=catalog.phong.filter(p=>item.pham_vi==='toan_he_thong'||item.pham_vi==='phong'&&item.phong_ids?.includes(p.id)||item.pham_vi==='chi_nhanh'&&!!p.homestay_id&&item.chi_nhanh_ids?.includes(p.homestay_id));setComboDetail('');setBookingTarget({comboId:item.id,comboQuantity,room:eligible.find(p=>p.id===roomId),roomIds:eligible.map(p=>p.id)});}}/>}
      {bookingTarget&&<DatPhongKhach target={bookingTarget} rooms={catalog.phong.length?catalog.phong:bookingTarget.room?[bookingTarget.room]:[]} config={config} token={token} hidden={login} guests={guestCount} onClose={()=>setBookingTarget(null)} onLogin={phone=>{setPhone(phone);setLogin(true);}} onSaved={(result,room,phone)=>{nhoDonCucBo(result);setReceipt(result);setReceiptPhone(phone);setSelected(room);setBookingTarget(null);setRooms(items=>items.filter(p=>p.id!==room.id));}}/>}

      {modal &&
        createPortal(
          <div
            className="kh-shade"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !authBusy && !authBusy) {
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
                  disabled={authBusy}
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
                        setPhone(receiptPhone);
                        setLogin(true);
                      }}
                    >
                      Tham gia để lưu đơn của bạn
                    </button>
                  )}
                </div>
              ) : null}
            </section>
          </div>,
          document.body,
        )}
      {lightbox && (
        <AnhPhongNoi
          url={lightbox}
          images={lightboxRoom?.anh.filter((u):u is string=>!!u)||heroPhotos.map(p=>p.url)}
          onNavigate={setLightbox}
          title={lightboxRoom?.ten_phong||"Ảnh không gian lưu trú"}
          action={lightboxRoom&&page!=='chi-tiet'?{label:"Xem thông tin phòng",onClick:()=>{setLightbox(null);openRoom({...lightboxRoom,gia_tham_khao:lightboxRoom.gia_tham_khao??true});}}:undefined}
          label="Xem ảnh phòng hoặc combo"
          onClose={() => setLightbox(null)}
        />
      )}
    </main>
  );
}

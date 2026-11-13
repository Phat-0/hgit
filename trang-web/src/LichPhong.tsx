import ThietLapTrangThai,{hienThiMacDinh,tenTrangThai,type ThietLapLich} from './ThietLapTrangThai';
import './don-chi-tiet-thao-tac.css';
import FormDonDatPhong, { type SeedDon } from "./FormDonDatPhong";
import "./lich-phong-dong-bo.css";
import NhapTien from "./NhapTien";
import "./lich-phong-chi-tiet.css";
import ChiTietDonLich from "./ChiTietDonLich";
import { viTriDoanLich } from "./hinh-hoc-lich";
import type { CSSProperties } from "react";
import { RangePicker } from "./RangePicker";
export { RangePicker } from "./RangePicker";
import { khoangThoiGianLich } from "./khung-gio-dat-phong";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
type Room = {
  id: string;
  ma_phong: string;
  ten_phong: string;
  homestay_id: string;
  ten_homestay: string;
  loai_phong_id?: string;
  gia_moi_dem: number | string;
  gia_moi_gio: number | string;
  gia_moi_ngay: number | string;
  gia_phu_thu_gio: number | string;
  trang_thai_van_hanh?: string;trang_thai_hien_thi?:string;
  so_gio_toi_thieu: number;
};
type Span = {
  id: string;
  ten_don?: string;
  phong_id: string;
  bat_dau: string;
  ket_thuc: string;
  loai_khoa?: string;
  co_dinh?: boolean;
  ly_do?: string;
  ghi_chu?: string;
  so_dien_thoai?: string;
  gia_ghi_nhan?: number | string;
  trang_thai?: string;trang_thai_phong?:string;trang_thai_thanh_toan?:string;
  hinh_thuc_dat?: string;
  loai_gia?: string;
  gia?: number;
  ten?: string;
  thu_trong_tuan?: number[];
  ten_khach?: string;
  ma_dat_phong?: string;
};
function NoiDungLich({item,lock}:{item:Span;lock:boolean}){const clock=(s:string)=>new Date(s).toLocaleTimeString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',hour12:false});return <span className="lp-span-copy"><strong>{lock?'Khóa · '+tenTrangThai(item.trang_thai_phong||'Bị khóa'):'Đơn'} · {item.ten_don||item.ten_khach||item.ly_do||item.ma_dat_phong||'Lịch phòng'}</strong><small>{clock(item.bat_dau)} → {clock(item.ket_thuc)} · {tenTrangThai(item.trang_thai_thanh_toan||'Chưa thanh toán')}</small></span>}
type Calendar = { phong: Room[]; khoa: Span[]; dat_phong: Span[]; gia: Span[] };
const HOUR = 3600000,
  DAY = 86400000,
  SLOT = 64;
function local(d: Date) {
  return new Date(d.getTime() + 7 * HOUR).toISOString().slice(0, 16);
}
function iso(date: string, time: string) {
  return new Date(date + "T" + time + ":00+07:00").toISOString();
}
function dateOnly(d: Date) {
  return local(d).slice(0, 10);
}
function shortDay(d: string) {
  const w = new Date(d + "T12:00:00+07:00").getUTCDay();
  return (w === 0 ? "CN" : "T" + (w + 1)) + " " + Number(d.slice(8, 10));
}
function addDays(s: string, n: number) {
  const d = new Date(s + "T00:00:00+07:00");
  return dateOnly(new Date(d.getTime() + n * DAY));
}
function overlap(x: Span, a: number, b: number) {
  return (
    new Date(x.bat_dau).getTime() < b && new Date(x.ket_thuc).getTime() > a
  );
}
async function call<T>(
  token: string,
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const r = await fetch("/api/quan-tri/lich-phong" + path, {
    method,
    headers: {
      Authorization: "Bearer " + token,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const x = (await r.json().catch(() => ({}))) as {
    message?: string | string[];
  };
  if (!r.ok)
    throw Error(
      "HTTP " +
        r.status +
        ": " +
        (Array.isArray(x.message)
          ? x.message.join(", ")
          : x.message || "Không thể tải dữ liệu từ máy chủ"),
    );
  return x as T;
}
export function TimePicker({
  value,
  onChange,
  minValue,
}: {
  value: string;
  onChange: (v: string) => void;
  minValue?: string;
}) {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const dismiss = (e: PointerEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);
  const options = Array.from(
    { length: 48 },
    (_, i) =>
      String(Math.floor(i / 2)).padStart(2, "0") + ":" + (i % 2 ? "30" : "00"),
  );
  return (
    <div ref={pickerRef} className="lp-time-control">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        ◷ {value || "Chọn giờ"}
      </button>
      {open && (
        <div className="lp-time-options">
          {options
            .filter((t) => !minValue || t > minValue)
            .map((t) => (
              <button
                type="button"
                key={t}
                className={t === value ? "active" : ""}
                onClick={() => {
                  onChange(t);
                  setOpen(false);
                }}
              >
                {t}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
export default function LichPhong({ token }: { token: string }) {
  const [bookingDetail, setBookingDetail] = useState<string | null>(null);
  const [mode, setMode] = useState<"ngay" | "chi-tiet">("ngay"),
    [branch, setBranch] = useState(""),
    [day, setDay] = useState(dateOnly(new Date())),
    [endDay, setEndDay] = useState(addDays(dateOnly(new Date()), 13)),
    [data, setData] = useState<Calendar>({
      phong: [],
      khoa: [],
      dat_phong: [],
      gia: [],
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [notice]);
  const [display,setDisplay]=useState<ThietLapLich>(hienThiMacDinh);
  const [createMode,setCreateMode]=useState<'khoa'|'don'>('khoa');
  const [lockRoomState,setLockRoomState]=useState('Bị khóa'),[lockPayment,setLockPayment]=useState('Chưa thanh toán');
  useEffect(()=>{let live=true;void call<ThietLapLich>(token,'/hien-thi').then(x=>{if(live)setDisplay({...hienThiMacDinh,...x})}).catch(e=>{if(live)setError(e.message)});return()=>{live=false}},[token]);
  const [showSettings, setShowSettings] = useState(false),
    [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [priceRoom, setPriceRoom] = useState<Room | null>(null);
  const [priceRulesVisible, setPriceRulesVisible] = useState(false),
    [priceScheduleType, setPriceScheduleType] = useState<"dates" | "weekdays">(
      "dates",
    );
  const [priceScheduled, setPriceScheduled] = useState(false),
    [priceKind, setPriceKind] = useState<"ngay" | "gio" | "qua-dem">("ngay"),
    [priceStart, setPriceStart] = useState(dateOnly(new Date())),
    [priceEnd, setPriceEnd] = useState(dateOnly(new Date())),
    [priceAmount, setPriceAmount] = useState(""),
    [priceExtra, setPriceExtra] = useState(""),
    [priceName, setPriceName] = useState(""),
    [priceWeekdays, setPriceWeekdays] = useState<number[]>([]);
  const [showHours, setShowHours] = useState(false),
    [deleteMode, setDeleteMode] = useState(false);
  const [hourConfig, setHourConfig] = useState<Record<string, string>>({
    ngay_tu: "14:00",
    ngay_den: "12:00",
    gio_tu: "08:00",
    gio_den: "22:00",
    dem_tu: "20:00",
    dem_den: "08:00",
  });
  const [hoursLoaded, setHoursLoaded] = useState(false),
    [hoursDirty, setHoursDirty] = useState(false),
    [hoursSaving, setHoursSaving] = useState(false);
  useEffect(() => {
    let active = true;
    setHoursLoaded(false);
    void call<Record<string, string>>(token, "/cau-hinh-gio")
      .then((x) => {
        if (active) {
          setHourConfig(x);
          setHoursDirty(false);
          setHoursLoaded(true);
        }
      })
      .catch((e) => {
        if (active)
          setError(e instanceof Error ? e.message : "Không tải được khung giờ");
      });
    return () => {
      active = false;
    };
  }, [token]);
  function updateHours(k: string, v: string) {
    setHourConfig((old) => ({ ...old, [k]: v }));
    setHoursDirty(true);
  }
  function importOldHours() {
    try {
      const old = JSON.parse(localStorage.getItem("lich_phong_gio") || "null");
      if (!old) throw Error();
      setHourConfig((v) => ({ ...v, ...old }));
      setHoursDirty(true);
      setNotice("Đã nạp thiết lập cũ; nhấn Lưu khung giờ để đồng bộ");
    } catch {
      setError("Không có thiết lập giờ cũ trên trình duyệt này");
    }
  }
  async function saveHours() {
    setHoursSaving(true);
    try {
      const saved = await call<Record<string, string>>(
        token,
        "/cau-hinh-gio",
        "PATCH",
        hourConfig,
      );
      setHourConfig(saved);
      setHoursDirty(false);
      setNotice("Đã lưu khung giờ dùng chung cho Lịch và Đơn đặt phòng");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được khung giờ");
    } finally {
      setHoursSaving(false);
    }
  }
  const settingsRef = useRef<HTMLDivElement>(null),
    settingsTriggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!showSettings) return;
    const dismiss = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        !settingsRef.current?.contains(target) &&
        !settingsTriggerRef.current?.contains(target)
      ) {
        setShowSettings(false);

      }
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [showSettings]);
  const customStatuses=display.trang_thai_phong;
  function tone(k:string,payment=false){return (payment?display.mau_thanh_toan:display.mau_phong)[k]||(payment?hienThiMacDinh.mau_thanh_toan[k]:hienThiMacDinh.mau_phong[k])||'#d6c5f4';}
  const [allBranches, setAllBranches] = useState<[string, string][]>([]);
  useEffect(() => {
    void fetch("/api/quan-tri/phong/tuy-chon", {
      headers: { Authorization: "Bearer " + token },
    })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((x: { chi_nhanh: { id: string; ten_homestay: string }[] }) =>
        setAllBranches(x.chi_nhanh.map((b) => [b.id, b.ten_homestay])),
      )
      .catch(() => {});
  }, [token]);
  const [blockPrice, setBlockPrice] = useState(""),
    [guestName, setGuestName] = useState(""),
    [guestPhone, setGuestPhone] = useState("");
  const [guestLookup, setGuestLookup] = useState("");
  const [foundGuest, setFoundGuest] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [lockEditMode, setLockEditMode] = useState(false);
  const [blockNote, setBlockNote] = useState(""),
    [editingBlock, setEditingBlock] = useState<string | null>(null),
    [roomSearch, setRoomSearch] = useState(""),
    [roomBranch, setRoomBranch] = useState("");
  const [selected, setSelected] = useState<{ room: Room; date: string } | null>(
      null,
    ),
    [kind, setKind] = useState<"ngay" | "gio" | "qua-dem">("ngay"),
    [from, setFrom] = useState("14:00"),
    [to, setTo] = useState("18:00"),
    [reason, setReason] = useState("Khóa giờ"),
    [blockEnd, setBlockEnd] = useState(dateOnly(new Date())),
    [editPrices, setEditPrices] = useState<Record<string, string>>({});
  const viewedLock = data.khoa.find((x) => x.id === editingBlock);
  const days = useMemo(
    () =>
      Array.from(
        {
          length: Math.min(
            31,
            Math.max(
              1,
              Math.round(
                (new Date(iso(endDay, "00:00")).getTime() -
                  new Date(iso(day, "00:00")).getTime()) /
                  DAY,
              ) + 1,
            ),
          ),
        },
        (_, i) => addDays(day, i),
      ),
    [day, endDay],
  );
  const visibleDays = mode === "ngay" ? days.slice(0, 14) : days;
  const hourOffset =
    mode === "chi-tiet" && day === dateOnly(new Date())
      ? Math.floor(
          Number(local(new Date()).slice(11, 13)) * 2 +
            Number(local(new Date()).slice(14, 16)) / 30,
        )
      : 0;
  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollLeft =
        mode === "chi-tiet" ? hourOffset * SLOT : 0;
  }, [mode, day, hourOffset]);
  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const p = new URLSearchParams({
        homestay_id: branch,
        bat_dau: iso(day, "00:00"),
        ket_thuc: iso(addDays(day, days.length), "00:00"),
      });
      setData(await call<Calendar>(token, "?" + p));
    } catch (e) {
      setData({ phong: [], khoa: [], dat_phong: [], gia: [] });
      setError(e instanceof Error ? e.message : "Không tải được lịch");
    } finally {
      setBusy(false);
    }
  }, [token, branch, day, days.length]);
  useEffect(() => {
    void load();
  }, [load]);
  const branches = allBranches;
  function select(room: Room, date: string, hour?: number) {
    if (!hoursLoaded || hoursDirty) {
      setError("Hãy tải và lưu khung giờ trước khi tạo lịch mới");
      return;
    }
    const now = local(new Date());
    const start =
      hour === undefined
        ? now.slice(11, 16)
        : String(Math.floor(hour)).padStart(2, "0") +
          ":" +
          (hour % 1 ? "30" : "00");
    if (date < dateOnly(new Date())) {
      setError("Không được khóa ngày trong quá khứ");
      return;
    }
    setCreateMode('khoa');setLockRoomState('Bị khóa');setLockPayment('Chưa thanh toán');
    setEditingBlock(null);
    setLockEditMode(true);
    setBlockNote("");
    setGuestName("");
    setGuestPhone("");
    setGuestLookup("");
    setFoundGuest(null);
    setRoomSearch("");
    setRoomBranch(room.homestay_id);
    setSelected({ room, date });
    setBlockPrice(
      String(mode === "ngay" ? room.gia_moi_ngay : room.gia_moi_gio),
    );
    setBlockEnd(date);
    setKind(mode === "ngay" ? "ngay" : "gio");
    setReason("Khóa lịch");
    setFrom(start);
    setTo(
      local(new Date(new Date(iso(date, start)).getTime() + HOUR)).slice(
        11,
        16,
      ),
    );
    setError("");
  }
  async function lookupGuest() {
    const phone = guestPhone.replace(/[\s().-]/g, "");
    if (!/^\+?[0-9]{9,15}$/.test(phone)) {
      setGuestLookup("");
      return;
    }
    setGuestLookup("Đang tìm khách hàng...");
    try {
      const result = await call<{
        found: boolean;
        guest?: { id: string; ho_ten: string; so_dien_thoai: string };
      }>(token, "/khach-theo-sdt?so_dien_thoai=" + encodeURIComponent(phone));
      if (result.found && result.guest) {
        setFoundGuest(result.guest.ho_ten);
        setGuestLookup("Đã tìm thấy tài khoản đã đăng ký");
      } else {
        setFoundGuest(null);
        setGuestLookup("Số điện thoại chưa có tài khoản đăng nhập.");
      }
    } catch (e) {
      setGuestLookup(
        e instanceof Error ? e.message : "Không tìm được khách hàng",
      );
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      if (!reason) throw Error("Vui lòng nhập lý do khóa");
      if (
        guestPhone.trim() &&
        !/^\+?[0-9]{9,15}$/.test(guestPhone.replace(/[\s().-]/g, ""))
      )
        throw Error("Số điện thoại cần có 9–15 chữ số; vui lòng kiểm tra lại");
      if (kind === "gio" && to <= from)
        throw Error("Giờ kết thúc phải sau giờ bắt đầu");
      if (selected.date < dateOnly(new Date()))
        throw Error("Không được khóa ngày trong quá khứ");
      const interval = khoangThoiGianLich(
        kind,
        selected.date,
        blockEnd,
        kind === "ngay"
          ? hourConfig.ngay_tu
          : kind === "qua-dem"
            ? hourConfig.dem_tu
            : from,
        kind === "ngay"
          ? hourConfig.ngay_den
          : kind === "qua-dem"
            ? hourConfig.dem_den
            : to,
      );
      const a = interval.start.toISOString(),
        b = interval.end.toISOString();
      if (new Date(a) >= new Date(b))
        throw Error("Giờ kết thúc phải sau giờ bắt đầu");
      await call(
        token,
        editingBlock ? "/khoa/" + editingBlock : "/khoa",
        editingBlock ? "PATCH" : "POST",
        {
          phong_id: selected.room.id,
          bat_dau: a,
          ket_thuc: b,
          loai_khoa: kind,
          co_dinh: kind === "ngay",
          ly_do: reason,
          ghi_chu: blockNote,
          ten_khach: guestName.trim(),
          so_dien_thoai: guestPhone.trim(),
          gia_ghi_nhan: Number(blockPrice || 0),trang_thai_phong:lockRoomState,trang_thai_thanh_toan:lockPayment,
        },
      );
      setNotice(editingBlock ? "Đã cập nhật khóa" : "Đã khóa lịch");
      setSelected(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được");
    } finally {
      setBusy(false);
    }
  }
  function editLock(item: Span) {
    setLockRoomState(item.trang_thai_phong||'Bị khóa');setLockPayment(item.trang_thai_thanh_toan||'Chưa thanh toán');
    const room = data.phong.find((r) => r.id === item.phong_id);
    if (!room) return;
    const a = local(new Date(item.bat_dau)),
      b = local(new Date(item.ket_thuc));
    setEditingBlock(item.id);
    setLockEditMode(false);
    setSelected({ room, date: a.slice(0, 10) });
    setBlockEnd(
      item.loai_khoa === "ngay" ? addDays(b.slice(0, 10), -1) : b.slice(0, 10),
    );
    setKind(
      item.loai_khoa === "qua-dem"
        ? "qua-dem"
        : item.loai_khoa === "ngay"
          ? "ngay"
          : "gio",
    );
    setFrom(a.slice(11, 16));
    setTo(b.slice(11, 16));
    setReason(item.ly_do || "");
    setBlockNote(item.ghi_chu || "");
    setGuestName(item.ten_khach || "");
    setGuestPhone(item.so_dien_thoai || "");
    setBlockPrice(String(item.gia_ghi_nhan ?? 0));
    setRoomBranch(room.homestay_id);
    setRoomSearch("");
    setError("");
  }
  async function removeLock() {
    if (
      !editingBlock ||
      !window.confirm("Bạn chắc chắn muốn hủy lịch khóa này?")
    )
      return;
    setBusy(true);
    try {
      await call(token, "/khoa/" + editingBlock, "DELETE");
      setSelected(null);
      setEditingBlock(null);
      setNotice("Đã hủy lịch khóa");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không hủy được");
    } finally {
      setBusy(false);
    }
  }
  async function saveBasePrices(room: Room) {
    setBusy(true);
    setError("");
    try {
      const keys = [
        "gia_moi_gio",
        "gia_moi_dem",
        "gia_moi_ngay",
        "gia_phu_thu_gio",
      ];
      const payload = Object.fromEntries(
        keys.map((k) => [
          k,
          Number(editPrices[room.id + ":" + k] ?? room[k as keyof Room] ?? 0),
        ]),
      );
      await call(token, "/phong/" + room.id + "/gia-co-ban", "PATCH", payload);
      setNotice("Đã lưu bảng giá phòng");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được giá");
    } finally {
      setBusy(false);
    }
  }

  const money = (n: number | string) =>
    new Intl.NumberFormat("vi-VN").format(Number(n) || 0) + " đ";

  function openPrices(room: Room, requestedKind?: "ngay" | "gio" | "qua-dem") {
    setPriceRoom(room);
    setPriceScheduled(false);
    setPriceRulesVisible(false);
    setPriceScheduleType("dates");
    setPriceKind(requestedKind || (mode === "ngay" ? "ngay" : "gio"));
    setPriceStart(day);
    setPriceEnd(endDay);
    setPriceAmount(
      String(
        requestedKind === "qua-dem"
          ? room.gia_moi_dem
          : requestedKind === "gio"
            ? room.gia_moi_gio
            : mode === "ngay"
              ? room.gia_moi_ngay
              : room.gia_moi_gio,
      ),
    );
    setPriceExtra(String(room.gia_phu_thu_gio));
    setPriceName("");
    setPriceWeekdays([]);
    setError("");
  }
  async function saveDefaultPrice() {
    if (!priceRoom) return;
    setBusy(true);
    setError("");
    try {
      const room = priceRoom;
      const key =
        priceKind === "ngay"
          ? "gia_moi_ngay"
          : priceKind === "gio"
            ? "gia_moi_gio"
            : "gia_moi_dem";
      const keys = [
        "gia_moi_gio",
        "gia_moi_dem",
        "gia_moi_ngay",
        "gia_phu_thu_gio",
      ] as const;
      const payload = Object.fromEntries(
        keys.map((k) => [
          k,
          Number(
            k === key
              ? priceAmount
              : k === "gia_phu_thu_gio" && priceKind === "gio"
                ? priceExtra
                : (room[k] ?? 0),
          ),
        ]),
      ) as Record<(typeof keys)[number], number>;
      if (!Number.isSafeInteger(Number(priceAmount)) || Number(priceAmount) < 0)
        throw Error("Vui lòng nhập giá hợp lệ");
      await call(token, "/phong/" + room.id + "/gia-co-ban", "PATCH", payload);
      setPriceRoom({ ...room, ...payload } as Room);
      setData((v) => ({
        ...v,
        phong: v.phong.map((p) =>
          p.id === room.id ? { ...p, ...payload } : p,
        ),
      }));
      setNotice("Đã lưu giá mặc định thành công");
      setEditPrices((v) => ({
        ...v,
        [room.id + ":" + key]: String(payload[key]),
        [room.id + ":gia_phu_thu_gio"]: String(payload.gia_phu_thu_gio),
      }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được giá");
    } finally {
      setBusy(false);
    }
  }
  async function saveScheduled(e: React.FormEvent) {
    e.preventDefault();
    if (!priceRoom) return;
    setBusy(true);
    setError("");
    try {
      await call(token, "/gia", "POST", {
        phong_id: priceRoom.id,
        loai_gia: priceKind,
        bat_dau: iso(priceStart, "00:00"),
        ket_thuc: iso(addDays(priceEnd, 1), "00:00"),
        gia: Number(priceAmount),
        phu_thu_gio: priceKind === "gio" ? Number(priceExtra) : null,
        ten: priceName.trim(),
        ...(priceScheduleType === "weekdays"
          ? { thu_trong_tuan: priceWeekdays }
          : {}),
      });
      setNotice("Đã lưu giá theo lịch");
      setPriceScheduled(false);
      setPriceRulesVisible(true);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được lịch giá");
    } finally {
      setBusy(false);
    }
  }
  function priceAt(
    room: Room,
    kind: "ngay" | "gio" | "qua-dem",
    timestamp: number,
  ) {
    const d = dateOnly(new Date(timestamp)),
      weekday = new Date(iso(d, "12:00")).getUTCDay();
    const match = [...data.gia]
      .reverse()
      .find(
        (p) =>
          p.phong_id === room.id &&
          p.loai_gia === kind &&
          overlap(p, timestamp, timestamp + 1) &&
          (!p.thu_trong_tuan?.length || p.thu_trong_tuan.includes(weekday)),
      );
    return (
      Number(
        match?.gia ??
          (kind === "ngay"
            ? room.gia_moi_ngay
            : kind === "gio"
              ? room.gia_moi_gio
              : room.gia_moi_dem),
      ) || 0
    );
  }
  function priceValue(
    room: Room,
    kind: "ngay" | "gio" | "qua-dem",
    date: string,
  ) {
    const t =
      kind === "ngay"
        ? hourConfig.ngay_tu
        : kind === "gio"
          ? hourConfig.gio_tu
          : hourConfig.dem_tu;
    return priceAt(room, kind, new Date(iso(date, t)).getTime());
  }
  function priceBands(room: Room, kind: "ngay" | "gio" | "qua-dem") {
    return days.map((d) => ({
      date: d,
      count: 1,
      price: priceValue(room, kind, d),
    }));
  }
  function withinWindow(t: string, start: string, end: string) {
    return (
      start === end ||
      (start < end ? t >= start && t < end : t >= start || t < end)
    );
  }
  function hourPriceBands(room: Room, kind: "gio" | "qua-dem" = "gio") {
    const bands: { index: number; count: number; price: number | null }[] = [];
    const start = kind === "gio" ? hourConfig.gio_tu : hourConfig.dem_tu,
      end = kind === "gio" ? hourConfig.gio_den : hourConfig.dem_den;
    for (let i = 0; i < days.length * 48; i++) {
      const d = days[Math.floor(i / 48)],
        n = i % 48,
        t =
          String(Math.floor(n / 2)).padStart(2, "0") +
          ":" +
          (n % 2 ? "30" : "00");
      const active = withinWindow(t, start, end);
      const price = active
        ? priceAt(room, kind, new Date(iso(d, t)).getTime())
        : null;
      const prev = bands[bands.length - 1];
      if (prev && prev.price === price && prev.index + prev.count === i)
        prev.count++;
      else bands.push({ index: i, count: 1, price });
    }
    return bands;
  }
  function contrastText(hex: string) {
    const h = hex.replace("#", "");
    if (!/^[a-f\d]{6}$/i.test(h)) return "#172033";
    const rgb = [0, 2, 4]
      .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
      .map((v) =>
        v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4),
      );
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 > 0.179
      ? "#172033"
      : "#ffffff";
  }
  function relatedRooms(room: Room) {
    return data.phong.filter((p) =>
      p.loai_phong_id && room.loai_phong_id
        ? p.loai_phong_id === room.loai_phong_id
        : p.id === room.id,
    );
  }
  function availableInterval(room: Room, start: number, end: number) {
    return relatedRooms(room).filter(
      (p) =>
        !["Bảo trì", "Bị khóa"].includes(p.trang_thai_van_hanh || "") &&
        ![...data.dat_phong, ...data.khoa].some(
          (x) => x.phong_id === p.id && overlap(x, start, end),
        ),
    ).length;
  }
  function available(room: Room, date: string) {
    const start = new Date(
      iso(date, mode === "ngay" ? hourConfig.ngay_tu : hourConfig.dem_tu),
    ).getTime();
    const end = new Date(
      iso(
        addDays(
          date,
          (mode === "ngay" && hourConfig.ngay_den <= hourConfig.ngay_tu) ||
            (mode === "chi-tiet" && hourConfig.dem_den <= hourConfig.dem_tu)
            ? 1
            : 0,
        ),
        mode === "ngay" ? hourConfig.ngay_den : hourConfig.dem_den,
      ),
    ).getTime();
    return availableInterval(room, start, end);
  }
  const hours = Array.from({ length: 48 }, (_, i) => i / 2);
  const monthTitle = (d: string) =>
    new Date(iso(d, "12:00")).toLocaleDateString("vi-VN", {
      month: "long",
      year: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    });
  const monthGroups = days.reduce<{ title: string; count: number }[]>(
    (arr, d) => {
      const title = monthTitle(d);
      if (arr.length && arr[arr.length - 1].title === title)
        arr[arr.length - 1].count++;
      else arr.push({ title, count: 1 });
      return arr;
    },
    [],
  );
  function dailyCells(room:Room){const all=[...data.dat_phong,...data.khoa].filter(x=>x.phong_id===room.id);const at=(date:string)=>{const a=Date.parse(iso(date,'00:00'));return all.filter(x=>overlap(x,a,a+DAY)).sort((x,y)=>Date.parse(x.bat_dau)-Date.parse(y.bat_dau))};const result:{date:string;count:number;item?:Span;items:Span[];key:string}[]=[];for(let i=0;i<days.length;){const items=at(days[i]);let count=1;if(items.length===1)while(i+count<days.length&&at(days[i+count]).length===1&&at(days[i+count])[0].id===items[0].id)count++;result.push({date:days[i],count,item:items[0],items,key:items[0]?.trang_thai_thanh_toan||'Chưa thanh toán'});i+=count;}return result;}
  function segments(room: Room) {
    const start = new Date(iso(day, "00:00")).getTime(),
      end = start + days.length * DAY;
    const all = [
      ...data.khoa
        .filter((x) => x.phong_id === room.id)
        .map((x) => ({
          ...x,
          group:x.trang_thai_phong||'Bị khóa',
          isLock:true,
          label:
            (x.ten_khach || x.ly_do || "Khóa lịch") +
            (x.gia_ghi_nhan != null && Number(x.gia_ghi_nhan) > 0
              ? " · " + money(x.gia_ghi_nhan)
              : "") +
            (x.ghi_chu ? " 📝" : ""),
        })),
      ...data.dat_phong
        .filter((x) => x.phong_id === room.id)
        .map((x) => ({
          ...x,
          group: x.trang_thai_thanh_toan || "Chưa thanh toán",
          isLock:false,
          label: x.ten_don || x.ten_khach || x.ma_dat_phong || "Đặt phòng",
        })),
    ];
    return all
      .filter((x) => overlap(x, start, end))
      .map((x) => ({
        id: x.id,
        group: x.group,
        isLock:x.isLock,
        label: x.label,
        ...viTriDoanLich(
          new Date(x.bat_dau).getTime(),
          new Date(x.ket_thuc).getTime(),
          start,
          end,
        )!,
        from: x.bat_dau,
        to: x.ket_thuc,
      }));
  }

  return (
    <section className="lp-page">
      <div className="lp-toolbar">
        <div className="lp-modes">
          <button
            className={mode === "ngay" ? "active" : ""}
            onClick={() => setMode("ngay")}
          >
            Lịch theo ngày
          </button>
          <button
            className={mode === "chi-tiet" ? "active" : ""}
            onClick={() => setMode("chi-tiet")}
          >
            Lịch theo giờ / qua đêm
          </button>
        </div>
        <select value={branch} onChange={(e) => setBranch(e.target.value)}>
          <option value="">Tất cả chi nhánh</option>
          {branches.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <RangePicker
          start={day}
          end={endDay}
          onChange={(a, b) => {
            setDay(a);
            setEndDay(b);
          }}
        />
        <button
          ref={settingsTriggerRef}
          type="button"
          className="lp-settings-trigger"
          onClick={() => setShowSettings((v) => !v)}
        >
          ⚙ Thiết lập {showSettings ? "▴" : "▾"}
        </button>
      </div>
      <div className="lp-extra">
        {showSettings && (
          <div ref={settingsRef} className="lp-settings">
            <div className="lp-settings-head">
              <div className="lp-settings-actions">
                <button type="button" onClick={() => setShowHours((v) => !v)}>
                  ◷ Điều chỉnh giờ
                </button>
              </div></div>
            {showHours && (
              <div className="lp-hours-settings">
                {[
                  ["ngay", "Theo ngày"],
                  ["gio", "Theo giờ"],
                  ["dem", "Qua đêm"],
                ].map(([k, label]) => (
                  <div className="lp-hours-setting-row" key={k}>
                    <strong>{label}</strong>
                    <label>
                      Từ{" "}
                      <TimePicker
                        value={hourConfig[k + "_tu"]}
                        onChange={(v) => updateHours(k + "_tu", v)}
                      />
                    </label>
                    <label>
                      Đến{" "}
                      <TimePicker
                        value={hourConfig[k + "_den"]}
                        onChange={(v) => updateHours(k + "_den", v)}
                      />
                    </label>
                  </div>
                ))}
                <button type="button" onClick={importOldHours}>
                  Dùng thiết lập cũ trên máy
                </button>
                <button
                  type="button"
                  disabled={!hoursLoaded || hoursSaving || !hoursDirty}
                  onClick={() => void saveHours()}
                >
                  {hoursSaving ? "Đang lưu..." : "Lưu khung giờ"}
                </button>
                <small>
                  Khung giờ dùng chung cho Lịch và Đơn đặt phòng; không thay đổi
                  các đơn đã lưu.
                </small>
              </div>
            )}
            <ThietLapTrangThai token={token} value={display} onSaved={setDisplay}/>
          </div>
        )}
      </div>
      {error && !selected && <p className="cn-error">{error}</p>}
      {notice && (
        <div className="lp-toast" role="status">
          ✓ {notice}
        </div>
      )}
      <div className="lp-scroll" ref={scrollRef}>
        <table
          className="lp-grid"
          style={
            {
              width: 205 + days.length * (mode === "ngay" ? 110 : 48 * SLOT),
              minWidth: 0,
              "--lich-width":
                205 + days.length * (mode === "ngay" ? 110 : 48 * SLOT) + "px",
              "--lich-slots": days.length * 48,
            } as CSSProperties
          }
        >
          <colgroup>
            <col style={{ width: 205 }} />
            {Array.from(
              { length: days.length * (mode === "ngay" ? 1 : 48) },
              (_, i) => (
                <col key={i} style={{ width: mode === "ngay" ? 110 : SLOT }} />
              ),
            )}
          </colgroup>
          <thead>
            <tr className="lp-month-head">
              <th className="lp-room" />
              {monthGroups.map((g, i) => (
                <th key={i} colSpan={g.count * (mode === "ngay" ? 1 : 48)}>
                  <span className="lp-sticky-month-label">{g.title}</span>
                </th>
              ))}
            </tr>
            {mode !== "ngay" && (
              <tr className="lp-day-head">
                <th className="lp-room" rowSpan={2}>
                  Phòng
                </th>
                {days.map((d) => (
                  <th
                    key={d}
                    colSpan={48}
                    className={
                      "lp-day-group" +
                      (d === dateOnly(new Date()) ? " lp-today" : "")
                    }
                  >
                    <span className="lp-sticky-day-label">{shortDay(d)}</span>
                  </th>
                ))}
              </tr>
            )}
            <tr>
              {mode === "ngay" && <th className="lp-room">Phòng</th>}
              {mode === "ngay"
                ? days.map((d) => (
                    <th
                      key={d}
                      className={
                        "lp-day-group" +
                        (d === dateOnly(new Date()) ? " lp-today" : "")
                      }
                    >
                      <span className="lp-sticky-day-label">{shortDay(d)}</span>
                    </th>
                  ))
                : days.flatMap((d) =>
                    hours.map((h) => (
                      <th key={d + h} className="lp-hour">
                        {String(Math.floor(h)).padStart(2, "0")}:
                        {h % 1 ? "30" : "00"}
                      </th>
                    )),
                  )}
            </tr>
          </thead>
          <tbody>
            {data.phong.map((room) => (
              <Fragment key={room.id}>
                <tr>
                  <th className="lp-room">
                    <button
                      type="button"
                      className="lp-room-name"
                      onClick={() =>
                        setExpandedRoom((v) => (v === room.id ? null : room.id))
                      }
                      title="Thu gọn / mở rộng bảng giá"
                    >
                      {room.ten_phong || room.ma_phong}{" "}
                      <span>{expandedRoom === room.id ? "⌃" : "⌄"}</span>
                    </button><small className="lp-room-state" style={{background:tone(room.trang_thai_hien_thi||room.trang_thai_van_hanh||"Trống"),color:contrastText(tone(room.trang_thai_hien_thi||room.trang_thai_van_hanh||"Trống"))}}>{tenTrangThai(room.trang_thai_hien_thi||room.trang_thai_van_hanh||"Trống")}</small>
                  </th>
                  {mode === "ngay" ? (
                    dailyCells(room).map((cell) => (
                      <td
                        key={cell.date}
                        colSpan={cell.count}
                        className="lp-day-slot"
                      >
                        <div className="lp-day-stack">{cell.items.length?cell.items.map(item=><button type="button" className="lp-day-click" key={item.id} title={new Date(item.bat_dau).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})+' → '+new Date(item.ket_thuc).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})} onClick={()=>{const lock=data.khoa.find(k=>k.id===item.id);if(lock)editLock(lock);else setBookingDetail(item.id)}}><span className="lp-booking-pill lp-event-card" style={{background:tone(data.khoa.some(k=>k.id===item.id)?item.trang_thai_phong||'Bị khóa':item.trang_thai_thanh_toan||'Chưa thanh toán',!data.khoa.some(k=>k.id===item.id)),color:contrastText(tone(data.khoa.some(k=>k.id===item.id)?item.trang_thai_phong||'Bị khóa':item.trang_thai_thanh_toan||'Chưa thanh toán',!data.khoa.some(k=>k.id===item.id)))}}><NoiDungLich item={item} lock={data.khoa.some(k=>k.id===item.id)}/></span></button>):<button className="lp-day-click" title="Tạo đơn hoặc khóa lịch" onClick={()=>select(room,cell.date)}/>}</div>
                      </td>
                    ))
                  ) : (
                    <td className="lp-timeline-td" colSpan={days.length * 48}>
                      <div className="lp-timeline">
                        <div className="lp-hour-background">
                          {days.flatMap((d) =>
                            hours.map((h) => (
                              <button
                                key={d + h}
                                type="button"
                                title={
                                  d +
                                  " " +
                                  String(Math.floor(h)).padStart(2, "0") +
                                  ":" +
                                  (h % 1 ? "30" : "00")
                                }
                                onClick={() => select(room, d, h)}
                              />
                            )),
                          )}
                        </div>
                        {segments(room).map((x) => (
                          <button
                            key={x.id}
                            type="button"
                            className="lp-span lp-event-card"
                            style={{
                              left: x.left + "%",
                              width: x.width + "%",
                              background: tone(x.group,!x.isLock),
                              color:contrastText(tone(x.group,!x.isLock)),
                            }}
                            title={
                              x.label +
                              " · " +
                              local(new Date(x.from)) +
                              " đến " +
                              local(new Date(x.to))
                            }
                            onClick={() => {
                              const lock = data.khoa.find((k) => k.id === x.id);
                              if (lock) editLock(lock);
                              else setBookingDetail(x.id);
                            }}
                          >
                            <NoiDungLich item={[...data.khoa,...data.dat_phong].find(i=>i.id===x.id)!} lock={data.khoa.some(i=>i.id===x.id)}/>
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
                {expandedRoom === room.id &&
                  (mode === "ngay"
                    ? [["ngay", "Giá/ngày"]]
                    : [
                        ["gio", "Giá giờ"],
                        ["qua-dem", "Giá đêm"],
                      ]
                  ).map(([k, label]) => (
                    <tr key={k} className="lp-price-row lp-price-band-row">
                      <th className="lp-room">
                        <button
                          type="button"
                          className="lp-price-band-label"
                          onClick={() => {
                            openPrices(room, k as "ngay" | "gio" | "qua-dem");
                          }}
                        >
                          {label} <span>Thiết lập</span>
                        </button>
                      </th>
                      {(mode === "ngay"
                        ? priceBands(room, "ngay").map((b) => ({
                            id: b.date,
                            count: b.count,
                            price: b.price,
                          }))
                        : hourPriceBands(room, k as "gio" | "qua-dem").map(
                            (b) => ({
                              id: String(b.index),
                              count: b.count,
                              price: b.price,
                            }),
                          )
                      ).map((b) => (
                        <td
                          key={b.id}
                          className={
                            "lp-price-band-cell" +
                            (b.price === null ? " lp-price-inactive" : "")
                          }
                          colSpan={b.count}
                        >
                          {b.price !== null && (
                            <span className="lp-floating-price">
                              {money(b.price)}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                {expandedRoom === room.id && (
                  <tr className="lp-price-row lp-price-band-row">
                    <th className="lp-room">Số phòng còn trống</th>
                    {mode === "ngay"
                      ? days.map((d) => (
                          <td key={d} className="lp-price-band-cell">
                            {available(room, d)}/{relatedRooms(room).length}
                          </td>
                        ))
                      : days.flatMap((d) =>
                          hours.map((h) => {
                            const start = new Date(
                              iso(
                                d,
                                String(Math.floor(h)).padStart(2, "0") +
                                  ":" +
                                  (h % 1 ? "30" : "00"),
                              ),
                            ).getTime();
                            return (
                              <td
                                key={d + h}
                                className="lp-price-band-cell"
                                title={
                                  d +
                                  " " +
                                  String(Math.floor(h)).padStart(2, "0") +
                                  ":" +
                                  (h % 1 ? "30" : "00")
                                }
                              >
                                {availableInterval(
                                  room,
                                  start,
                                  start + 30 * 60000,
                                )}
                              </td>
                            );
                          }),
                        )}
                  </tr>
                )}
              </Fragment>
            ))}
            {!data.phong.length && (
              <tr>
                <td
                  colSpan={
                    mode === "ngay" ? days.length + 1 : days.length * 48 + 1
                  }
                  className="lp-empty"
                >
                  {busy
                    ? "Đang tải lịch..."
                    : error
                      ? "Không tải được danh sách phòng — xem thông báo lỗi phía trên"
                      : "Chưa có phòng"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {priceRoom && (
        <div
          className="lp-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPriceRoom(null);
          }}
        >
          <div className="lp-dialog lp-price-dialog">
            <div className="lp-dialog-head">
              <strong>
                {priceScheduled ? "Tạo lịch giá" : "Thiết lập giá"} ·{" "}
                {priceRoom.ten_phong || priceRoom.ma_phong}
              </strong>
              <button type="button" onClick={() => setPriceRoom(null)}>
                ×
              </button>
            </div>
            <div className="lp-price-base">
              <label>
                Loại giá
                <select
                  value={priceKind}
                  onChange={(e) => {
                    const k = e.target.value as typeof priceKind;
                    setPriceKind(k);
                    setPriceAmount(
                      String(
                        k === "ngay"
                          ? priceRoom.gia_moi_ngay
                          : k === "gio"
                            ? priceRoom.gia_moi_gio
                            : priceRoom.gia_moi_dem,
                      ),
                    );
                    setPriceExtra(String(priceRoom.gia_phu_thu_gio));
                  }}
                >
                  <option value="ngay">Theo ngày</option>
                  <option value="gio">Theo giờ</option>
                  <option value="qua-dem">Qua đêm</option>
                </select>
              </label>
              <label>
                Ngày áp dụng
                <RangePicker
                  compact
                  start={priceStart}
                  end={priceEnd}
                  onChange={(a, b) => {
                    setPriceStart(a);
                    setPriceEnd(b);
                  }}
                />
              </label>
              <label>
                {priceKind === "gio"
                  ? "Giá áp dụng cho số giờ tối thiểu đã thiết lập (đ)"
                  : "Giá áp dụng (đ)"}
                <NhapTien
                  required
                  value={priceAmount}
                  onValueChange={setPriceAmount}
                />
              </label>
              {priceKind === "gio" && (
                <label>
                  Giá phụ thu mỗi giờ (đ)
                  <NhapTien value={priceExtra} onValueChange={setPriceExtra} />
                </label>
              )}

              {!priceScheduled && (
                <div className="lp-dialog-actions">
                  <button
                    type="button"
                    className="cn-primary"
                    disabled={busy}
                    onClick={() => void saveDefaultPrice()}
                  >
                    {busy ? "Đang lưu..." : "Lưu"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setPriceScheduled(true)}
                  >
                    Tạo lịch
                  </button>
                </div>
              )}
              {priceScheduled && (
                <form
                  onSubmit={(e) => void saveScheduled(e)}
                  className="lp-price-schedule-form"
                >
                  <strong>Tạo lịch</strong>
                  <label>
                    Tên lịch giá
                    <input
                      required
                      value={priceName}
                      onChange={(e) => setPriceName(e.target.value)}
                      placeholder="Ví dụ: Giá cuối tuần"
                    />
                  </label>
                  <label>
                    Hình thức áp dụng
                    <select
                      value={priceScheduleType}
                      onChange={(e) =>
                        setPriceScheduleType(
                          e.target.value as "dates" | "weekdays",
                        )
                      }
                    >
                      <option value="dates">Theo khoảng ngày</option>
                      <option value="weekdays">Theo thứ trong tuần</option>
                    </select>
                  </label>
                  <label>
                    Khoảng ngày hiệu lực
                    <RangePicker
                      compact
                      start={priceStart}
                      end={priceEnd}
                      onChange={(a, b) => {
                        setPriceStart(a);
                        setPriceEnd(b);
                      }}
                    />
                  </label>
                  {priceScheduleType === "weekdays" && (
                    <div className="lp-weekdays">
                      <span>Chọn các thứ áp dụng</span>
                      <div>
                        {[
                          ["CN", 0],
                          ["T2", 1],
                          ["T3", 2],
                          ["T4", 3],
                          ["T5", 4],
                          ["T6", 5],
                          ["T7", 6],
                        ].map(([label, n]) => (
                          <label key={n}>
                            <input
                              type="checkbox"
                              checked={priceWeekdays.includes(Number(n))}
                              onChange={(e) =>
                                setPriceWeekdays((v) =>
                                  e.target.checked
                                    ? [...v, Number(n)]
                                    : v.filter((x) => x !== n),
                                )
                              }
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  {error && <p className="cn-error">{error}</p>}
                  <div className="lp-dialog-actions">
                    <button
                      type="button"
                      onClick={() => setPriceScheduled(false)}
                    >
                      Quay lại
                    </button>
                    <button
                      type="submit"
                      className="cn-primary"
                      disabled={
                        busy ||
                        (priceScheduleType === "weekdays" &&
                          !priceWeekdays.length)
                      }
                    >
                      Lưu lịch giá
                    </button>
                  </div>
                </form>
              )}
              <div className="lp-saved-prices">
                <strong>Đang áp dụng</strong>
                {data.gia
                  .filter((x) => x.phong_id === priceRoom.id)
                  .map((rule) => (
                    <div className="lp-saved-price" key={rule.id}>
                      <span>
                        <strong>{rule.ten || rule.loai_gia}</strong> ·{" "}
                        {local(new Date(rule.bat_dau)).slice(0, 10)} –{" "}
                        {local(new Date(rule.ket_thuc)).slice(0, 10)} ·{" "}
                        {money(rule.gia || 0)}
                        {rule.thu_trong_tuan?.length
                          ? " · Thứ " + rule.thu_trong_tuan.join(", ")
                          : ""}
                      </span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          if (window.confirm("Xóa lịch giá này?"))
                            void (async () => {
                              setBusy(true);
                              try {
                                await call(token, "/gia/" + rule.id, "DELETE");
                                await load();
                              } catch (e) {
                                setError(
                                  e instanceof Error
                                    ? e.message
                                    : "Không xóa được",
                                );
                              } finally {
                                setBusy(false);
                              }
                            })();
                        }}
                      >
                        Xóa
                      </button>
                    </div>
                  ))}
              </div>
              {error && !priceScheduled && <p className="cn-error">{error}</p>}
            </div>
          </div>
        </div>
      )}
      {selected && (
        <div
          className="lp-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <div
            className={
              "lp-dialog" +
              (lockEditMode && editingBlock ? " lp-dialog-wide" : "")
            }
          >
            <div className="lp-dialog-head">
              <div>
                <span className="lp-dialog-eyebrow">
                  QUẢN LÝ TÌNH TRẠNG PHÒNG
                </span>
                <strong>
                  {editingBlock ? "Chỉnh sửa lịch khóa" : "Khóa nhanh"} ·{" "}
                  {selected.room.ten_phong}
                </strong>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Đóng">
                ×
              </button>
            </div>
            {!editingBlock&&<div className="lp-create-switch"><button className={createMode==='don'?'active':''} disabled={(selected.room.trang_thai_hien_thi||selected.room.trang_thai_van_hanh||'Trống')!=='Trống'} title={(selected.room.trang_thai_hien_thi||selected.room.trang_thai_van_hanh||'Trống')!=='Trống'?'Chỉ đặt được khi phòng trống':'Tạo đơn đặt phòng'} onClick={()=>setCreateMode('don')}>Tạo đơn đặt phòng</button><button className={createMode==='khoa'?'active':''} onClick={()=>setCreateMode('khoa')}>Khóa lịch</button></div>}
            {!editingBlock&&createMode==='don'?<FormDonDatPhong embedded token={token} seed={{phong_id:selected.room.id,date:selected.date,kind:mode==='ngay'?'ngay':'gio',time:mode==='chi-tiet'?from:undefined}} onClose={()=>setSelected(null)} onSaved={load}/>: (            editingBlock && !lockEditMode ? (
              <div className="lp-lock-details">
                <div>
                  <span>Phòng</span>
                  <strong>
                    {selected.room.ten_phong} · {selected.room.ten_homestay}
                  </strong>
                </div>
                <div>
                  <span>Loại khóa</span>
                  <strong>
                    {kind === "ngay"
                      ? "Theo ngày"
                      : kind === "gio"
                        ? "Theo giờ"
                        : "Qua đêm"}
                  </strong>
                </div>
                <div>
                  <span>Thời gian</span>
                  <strong>
                    {viewedLock
                      ? local(new Date(viewedLock.bat_dau))
                      : selected.date + " " + from}{" "}
                    →{" "}
                    {viewedLock
                      ? local(new Date(viewedLock.ket_thuc))
                      : blockEnd + " " + to}
                  </strong>
                </div>
                <div>
                  <span>Phòng / Thanh toán</span>
                  <strong>{tenTrangThai(lockRoomState)} · {tenTrangThai(lockPayment)}</strong>
                </div>
                <div>
                  <span>Tên khách</span>
                  <strong>{guestName || "—"}</strong>
                </div>
                <div>
                  <span>Số điện thoại</span>
                  <strong>{guestPhone || "—"}</strong>
                </div>
                <div>
                  <span>Giá ghi nhận</span>
                  <strong>{money(blockPrice)}</strong>
                </div>
                <div>
                  <span>Ghi chú</span>
                  <strong>{blockNote || "—"}</strong>
                </div>
                <div className="lp-dialog-actions">
                  <button type="button" onClick={() => setSelected(null)}>
                    Đóng
                  </button>
                  <button
                    type="button"
                    className="cn-primary"
                    disabled={busy}
                    onClick={() => setLockEditMode(true)}
                  >
                    Chỉnh sửa
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void removeLock()}
                  >
                    Xóa lịch khóa
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => void submit(e)}>
                {editingBlock && (
                  <div className="lp-dialog-field">
                    <span>Chuyển phòng</span>
                    <div>
                      <select
                        value={roomBranch}
                        onChange={(e) => setRoomBranch(e.target.value)}
                      >
                        <option value="">Tất cả chi nhánh</option>
                        {allBranches.map(([id, name]) => (
                          <option key={id} value={id}>
                            {name}
                          </option>
                        ))}
                      </select>
                      <input
                        placeholder="Tìm tên phòng"
                        value={roomSearch}
                        onChange={(e) => setRoomSearch(e.target.value)}
                      />
                      <select
                        value={selected.room.id}
                        onChange={(e) => {
                          const room = data.phong.find(
                            (r) => r.id === e.target.value,
                          );
                          if (room)
                            setSelected((v) => (v ? { ...v, room } : v));
                        }}
                      >
                        {data.phong
                          .filter(
                            (r) =>
                              (!roomBranch || r.homestay_id === roomBranch) &&
                              (r.ten_phong + " " + r.ma_phong)
                                .toLowerCase()
                                .includes(roomSearch.toLowerCase()),
                          )
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.ten_phong || r.ma_phong}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                )}
                <div className="lp-dialog-field">
                  <span>Loại đặt</span>
                  <select
                    value={kind}
                    onChange={(e) => {
                      const k = e.target.value as typeof kind;
                      setKind(k);
                      if (k === "qua-dem") {
                        setFrom(hourConfig.dem_tu);
                        setTo(hourConfig.dem_den||'08:00');
                        setReason("Khóa lịch");
                      } else if (k === "gio") {
                        setFrom(hourConfig.gio_tu);
                        setTo(hourConfig.gio_den);
                        setReason("Khóa lịch");
                      } else {
                        setFrom(hourConfig.ngay_tu);
                        setTo(hourConfig.ngay_den);
                        setReason("Khóa lịch");
                      }
                    }}
                  >
                    {mode === "ngay" && (
                      <option value="ngay">Khóa cố định theo ngày</option>
                    )}
                    <option value="gio">Theo giờ</option>
                    <option value="qua-dem">Qua đêm</option>
                  </select>
                </div>
                <div className="lp-dialog-range">
                  <span>Khoảng thời gian</span>
                  <RangePicker
                    compact
                    minDate={dateOnly(new Date())}
                    start={selected.date}
                    end={blockEnd}
                    onChange={(a, b) => {
                      setSelected({ ...selected, date: a });
                      setBlockEnd(b);
                    }}
                  />
                </div>
                {kind === "gio" && (
                  <div className="lp-time-row">
                    <span>Khung giờ</span>
                    <div className="lp-time-pair">
                      <TimePicker
                        value={from}
                        onChange={(v) => {
                          setFrom(v);
                          if (to <= v)
                            setTo(
                              local(
                                new Date(
                                  new Date(iso(selected.date, v)).getTime() +
                                    HOUR,
                                ),
                              ).slice(11, 16),
                            );
                        }}
                      />
                      <span aria-hidden="true">–</span>
                      <TimePicker value={to} minValue={from} onChange={setTo} />
                    </div>
                  </div>
                )}
                <label>
                  Tên khách
                  <input
                    maxLength={150}
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Tên khách"
                  />
                </label>
                <label>
                  Số điện thoại
                  <div>
                    <input
                      type="tel"
                      maxLength={20}
                      value={guestPhone}
                      onChange={(e) => {
                        setGuestPhone(e.target.value);
                        setGuestLookup("");
                        setFoundGuest(null);
                      }}
                      onBlur={() => void lookupGuest()}
                      placeholder="Số điện thoại"
                    />
                    {guestLookup && (
                      <small className="lp-guest-lookup">{guestLookup}</small>
                    )}
                    {foundGuest && (
                      <div className="lp-guest-suggestion">
                        <span>
                          Tài khoản: <strong>{foundGuest}</strong>
                        </span>
                        {guestName.trim() !== foundGuest && (
                          <button
                            type="button"
                            onClick={() => {
                              setGuestName(foundGuest);
                              setFoundGuest(null);
                            }}
                          >
                            Dùng tên này
                          </button>
                        )}
                        {guestName.trim() === foundGuest && (
                          <span>Đã trùng tên nhập</span>
                        )}
                      </div>
                    )}
                  </div>
                </label>
                <div className="lp-dialog-field">
                  <span>Giá ghi nhận (đ)</span>
                  <NhapTien value={blockPrice} onValueChange={setBlockPrice} />
                </div>
                <label>Trạng thái phòng<select value={lockRoomState} onChange={e=>setLockRoomState(e.target.value)}>{display.trang_thai_phong.map(n=><option key={n} value={n}>{tenTrangThai(n)}</option>)}</select></label><label>Thanh toán trên lịch<select value={lockPayment} onChange={e=>setLockPayment(e.target.value)}>{display.trang_thai_thanh_toan.map(n=><option key={n} value={n}>{tenTrangThai(n)}</option>)}</select></label><label>Lý do khóa<input maxLength={500} required value={reason} onChange={e=>setReason(e.target.value)}/></label>
                <label>
                  Ghi chú
                  <textarea
                    rows={2}
                    value={blockNote}
                    onChange={(e) => setBlockNote(e.target.value)}
                    placeholder="Ghi chú lịch khóa"
                  />
                </label>
                {kind === "ngay" && (
                  <p className="lp-hint">
                    Khóa đúng khoảng thời gian đã chọn; có thể chỉnh sửa hoặc xóa.
                  </p>
                )}
                {error && <p className="cn-error">{error}</p>}
                <div className="lp-dialog-actions">
                  <button
                    type="button"
                    className="lp-cancel"
                    onClick={() => setSelected(null)}
                  >
                    Hủy
                  </button>
                  {editingBlock && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void removeLock()}
                    >
                      Hủy lịch khóa
                    </button>
                  )}
                  <button
                    className="cn-primary"
                    disabled={busy || !reason}
                    type="submit"
                  >
                    {busy
                      ? "Đang lưu..."
                      : editingBlock
                        ? "Lưu thay đổi"
                        : "Xác nhận khóa"}
                  </button>
                </div>
              </form>
            ))}
          </div>
        </div>
      )}
      {bookingDetail && (
        <ChiTietDonLich
          id={bookingDetail}
          token={token}
          onClose={() => setBookingDetail(null)}
          onChanged={load}
        />
      )}
    </section>
  );
}

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { khachApi } from "../../dung-chung/api/khach-api";
import { RangePicker } from "../../dung-chung/lich/RangePicker";
import {
  goiYThoiGian,
  ngayVietNam,
} from "../../dung-chung/lich/mac-dinh-thoi-gian";
import { khoangThoiGianLich } from "../../dung-chung/lich/khung-gio-dat-phong";
import ChonKhoangGio,{DaiGio} from "./ChonKhoangGio";
import { mocTraPhong } from "./moc-gio-khach";
import type { PhongKhach } from "./GioiThieuLuuTru";
export type KetQuaDatPhong = {
  ma_dat_phong: string;
  tong_tien: number | string;
  trang_thai: string;
  het_han_giu_cho: string;
};
export type MucDatPhong = {
  room?: PhongKhach;
  seed?: Record<string, string>;
  comboId?: string;
  roomIds?: string[];
};
type Kind = "" | "gio" | "ngay" | "dem";
type Combo = {
  anh?: string[];
  mo_ta?: string;
  id: string;
  ten_combo: string;
  tong_gia: number;
  gia_combo: number | string;
  so_gio_bao_gom: number | null;
};
const day = (s: string) =>
    new Date(Date.parse(s) + 7 * 3600000).toISOString().slice(0, 10),
  clock = (s: string) =>
    new Date(Date.parse(s) + 7 * 3600000).toISOString().slice(11, 16);
const money = (v: number) => v.toLocaleString("vi-VN") + " ₫";
export default function DatPhongKhach({
  target,
  rooms,
  config,
  token,
  hidden = false,
  guests = 1,
  onClose,
  onLogin,
  onSaved,
}: {
  target: MucDatPhong;
  rooms: PhongKhach[];
  config: Record<string, string>;
  token: string;
  hidden?: boolean;
  guests?: number;
  onClose: () => void;
  onLogin: (phone: string) => void;
  onSaved: (result: KetQuaDatPhong, room: PhongKhach, phone: string) => void;
}) {
  const seed = target.seed,
    initialKind: Kind =
      seed?.hinh_thuc_dat === "Theo giờ"
        ? "gio"
        : seed?.hinh_thuc_dat === "Theo ngày"
          ? "ngay"
          : seed?.hinh_thuc_dat === "Theo đêm"
            ? "dem"
            : "";
  const initial = initialKind
    ? goiYThoiGian(initialKind, config)
    : { day: ngayVietNam(), endDay: ngayVietNam(), start: "", end: "" };
  const [kind, setKind] = useState<Kind>(initialKind),
    [roomId, setRoomId] = useState(target.room?.id || ""),
    [branch, setBranch] = useState(target.room?.homestay_id || ""),
    [start, setStart] = useState(seed ? day(seed.bat_dau) : initial.day),
    [end, setEnd] = useState(
      seed
        ? initialKind !== "gio" && clock(seed.ket_thuc) <= clock(seed.bat_dau)
          ? day(new Date(Date.parse(seed.ket_thuc) - 86400000).toISOString())
          : day(seed.ket_thuc)
        : initial.endDay,
    ),
    [st, setSt] = useState(seed ? clock(seed.bat_dau) : initial.start),
    [et, setEt] = useState(seed ? clock(seed.ket_thuc) : initial.end),
    [comboIds, setComboIds] = useState<string[]>(
      target.comboId ? [target.comboId] : [],
    ),
    [showCombos, setShowCombos] = useState(false),
    [guestConfirm, setGuestConfirm] = useState(false),
    [early, setEarly] = useState(0),
    [late, setLate] = useState(0),
    [surcharge, setSurcharge] = useState(0),
    [combos, setCombos] = useState<Combo[]>([]),
    [price, setPrice] = useState<number | null>(null),
    [voucher,setVoucher]=useState(""),
    [discount,setDiscount]=useState(0),
    [quoteKey, setQuoteKey] = useState(""),
    [error, setError] = useState(""),
    [quoting, setQuoting] = useState(false),
    [busy, setBusy] = useState(false),
    [form, setForm] = useState({
      ten_khach: "",
      so_dien_thoai: "",
      so_khach: guests,
      ghi_chu: "",
    });
  const allRooms = rooms.filter(
      (p) => !target.roomIds || target.roomIds.includes(p.id),
    ),
    room = allRooms.find((p) => p.id === roomId),
    branches = [
      ...new Map(
        allRooms
          .filter((p) => p.homestay_id)
          .map((p) => [p.homestay_id!, p.ten_homestay]),
      ).entries(),
    ];
  const request = useMemo(() => {
    if (!room || !kind || !start || !end) return { q: null, message: "" };
    const time = khoangThoiGianLich(
      kind === "dem" ? "qua-dem" : kind,
      start,
      end,
      kind === "gio" ? st : config[kind + "_tu"],
      kind === "gio" ? et : config[kind + "_den"],
    );
    if (kind !== "gio") {
      time.start = new Date(+time.start - early * 3600000);
      time.end = new Date(+time.end + late * 3600000);
    }
    if (
      !Number.isFinite(+time.start) ||
      !Number.isFinite(+time.end) ||
      time.end <= time.start
    )
      return { q: null, message: "Chọn giờ trả sau giờ nhận." };
    if (+time.start < Date.now() - 60000)
      return { q: null, message: "Vui lòng chọn thời gian sắp tới." };
    if (+time.end - +time.start > 31 * 86400000)
      return { q: null, message: "Khoảng đặt tối đa 31 ngày." };
    if (
      kind === "gio" &&
      +time.end - +time.start < Number(room.so_gio_toi_thieu || 1) * 3600000
    )
      return {
        q: null,
        message:
          "Phòng cần đặt tối thiểu " + (room.so_gio_toi_thieu || 1) + " giờ.",
      };
    return {
      q: {
        phong_id: room.id,
        bat_dau: time.start.toISOString(),
        ket_thuc: time.end.toISOString(),
        hinh_thuc_dat:
          kind === "gio"
            ? "Theo giờ"
            : kind === "ngay"
              ? "Theo ngày"
              : "Theo đêm",
        combo_id: comboIds[0] || null,
        combo_ids: comboIds,
        ma_voucher:voucher,
        gio_nhan_som: kind === "gio" ? 0 : early,
        gio_tra_muon: kind === "gio" ? 0 : late,
      },
      message: "",
    };
  }, [roomId, kind, start, end, st, et, config, comboIds, room, early, late,voucher]);
  const serialized = JSON.stringify(request.q),
    key = useRef(crypto.randomUUID()),
    inFlight = useRef(false),
    comboCache = useRef(new Map<string, Combo>()),
    fingerprintRef = useRef(""),
    dialog = useRef<HTMLElement>(null),
    closeRef = useRef(onClose),
    busyRef = useRef(false),
    hiddenRef = useRef(hidden);
  closeRef.current = onClose;
  busyRef.current = busy;
  hiddenRef.current = hidden;

  useEffect(() => {
    if(!request.q)setPrice(null);
    setQuoteKey("");
    setError("");
    if (!request.q) {
      setCombos([]);
    }
    if (!request.q) {
      setQuoting(false);
      return;
    }
    let active = true;
    setQuoting(true);
    const q = request.q;
    const timer = setTimeout(() => {
      void Promise.all([
        khachApi<Combo[]>("/combo", "POST", q).then((list) => {
          if (active && Array.isArray(list)) {
            list.forEach((c) => comboCache.current.set(c.id, c));
            setCombos(list);
          }
          return list;
        }),
        khachApi<{ tien_phong: number; tien_phu_thu?: number;tong_tien?:number;tien_giam?:number }>(
          "/bao-gia",
          "POST",
          q,
        ),
      ])
        .then(([list, total]) => {
          if (!active) return;
          if (
            !Array.isArray(list) ||
            !Number.isSafeInteger(Number(total.tien_phong)) ||
            Number(total.tien_phong) < 0
          )
            throw Error("Chưa tính được giá phòng. Vui lòng thử lại.");
          setCombos(list);
          if (comboIds.some((id) => !list.some((c) => c.id === id)))
            throw Error(
              "Combo không áp dụng cho phòng hoặc lịch này. Vui lòng chọn lại combo.",
            );
          setPrice(Number(total.tong_tien??total.tien_phong));
          setDiscount(Number(total.tien_giam||0));
          setSurcharge(Number(total.tien_phu_thu || 0));
          setQuoteKey(serialized);
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setQuoting(false);
        });
    }, 80);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [serialized]);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const listener = (e: KeyboardEvent) => {
      if (hiddenRef.current) return;
      if (e.key === "Escape" && !busyRef.current) closeRef.current();
      if (e.key === "Tab") {
        const nodes = Array.from(
            dialog.current?.querySelectorAll<HTMLElement>(
              'button:not(:disabled),input,select,textarea,[tabindex="0"]',
            ) || [],
          ),
          first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", listener);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", listener);
      previous?.focus();
    };
  }, []);
  function changeKind(next: Kind) {
    setKind(next);
    setEarly(0);
    setLate(0);
    if (!next) return;
    const t = goiYThoiGian(next, config);
    if (next === "gio") {
      const minimum = Number(room?.so_gio_toi_thieu) || 1;
      const find = () => {
        const begin = Date.parse(t.day + "T" + t.start + ":00+07:00"),
          desired = begin + minimum * 3600000,
          last = new Date(desired + 7 * 3600000).toISOString().slice(0, 10);
        return mocTraPhong(t.day, t.start, last, config).find(
          (s) => s.time >= desired,
        );
      };
      let finish = find();
      if (!finish) {
        const begin = Date.parse(t.day + "T" + t.start + ":00+07:00"),
          open = Date.parse(t.day + "T" + config.gio_tu + ":00+07:00");
        if (open <= begin)
          t.day = new Date(begin + 86400000 + 7 * 3600000)
            .toISOString()
            .slice(0, 10);
        t.start = config.gio_tu;
        finish = find();
      }
      if (finish) {
        t.endDay = finish.ngay;
        t.end = finish.gio;
      }
    }
    setStart(t.day);
    setEnd(t.endDay);
    setSt(t.start);
    setEt(t.end);
  }
  function toggleCombo(c: Combo) {
    setComboIds((ids) => {
      if (ids.includes(c.id)) return ids.filter((id) => id !== c.id);
      const next =
        c.so_gio_bao_gom != null
          ? ids.filter(
              (id) => comboCache.current.get(id)?.so_gio_bao_gom == null,
            )
          : ids;
      return next.length < 10 ? [...next, c.id] : next;
    });
  }
  async function submit(e?: FormEvent, allowGuest = false) {
    e?.preventDefault();
    if (showCombos) {
      setShowCombos(false);
      return;
    }
    if (!dialog.current?.querySelector("form")?.reportValidity()) return;
    if (
      inFlight.current ||
      !room ||
      !request.q ||
      price === null ||
      quoteKey !== serialized
    )
      return;
    if (!token && !allowGuest) {
      setGuestConfirm(true);
      return;
    }
    const fingerprint = JSON.stringify({ ...request.q, ...form });
    if (fingerprintRef.current !== fingerprint) {
      key.current = crypto.randomUUID();
      fingerprintRef.current = fingerprint;
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await khachApi<KetQuaDatPhong>(
        "/dat-phong",
        "POST",
        { ...request.q, ...form, khoa_yeu_cau: key.current },
        token || undefined,
      );
      onSaved(result, room, form.so_dien_thoai);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!hidden)
      dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [hidden]);
  if (hidden) return null;
  return createPortal(
    <div
      className="kh-reserve-shade"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <section
        ref={dialog}
        className="kh-reserve"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kh-reserve-title"
      >
        <header>
          <div>
            <small>Đặt phòng HomeStay</small>
            <h2 id="kh-reserve-title">Chọn lịch nghỉ của bạn</h2>
          </div>
          <button
            type="button"
            disabled={busy}
            aria-label="Đóng đặt phòng"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <form onSubmit={submit}>
          <fieldset disabled={busy} className="kh-reserve-fields">
            <div className="kh-reserve-combo-toolbar">
              <button
                type="button"
                aria-expanded={showCombos}
                onClick={() => setShowCombos(!showCombos)}
              >
                Combo ({comboIds.length}) {showCombos ? "−" : "+"}
              </button>
            </div>
            {showCombos && (
              <div
                className="kh-reserve-combo-list"
                aria-label="Danh sách combo phù hợp"
              >
                {!combos.length && (
                  <p>
                    {request.q
                      ? "Chưa có combo phù hợp với lịch này."
                      : "Chọn phòng, loại đặt và lịch để xem combo phù hợp."}
                  </p>
                )}
                {combos.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    aria-pressed={comboIds.includes(c.id)}
                    onClick={() => toggleCombo(c)}
                  >
                    <span>
                      <strong>{c.ten_combo}</strong>
                      <small>
                        {c.so_gio_bao_gom != null
                          ? `Gói ${c.so_gio_bao_gom} giờ đầu`
                          : "Dịch vụ"}
                        {c.mo_ta ? " · " + c.mo_ta : ""}
                      </small>
                    </span>
                    <b>{money(Number(c.gia_combo))}</b>
                    <span>{comboIds.includes(c.id) ? "✓" : "+"}</span>
                  </button>
                ))}
              </div>
            )}

            <fieldset
              className="kh-reserve-form-fields"
              hidden={showCombos}
              disabled={showCombos}
            >
              <label>
                Chi nhánh
                <select
                  value={branch}
                  onChange={(e) => {
                    setBranch(e.target.value);
                    setRoomId("");
                  }}
                >
                  <option value="">Tất cả chi nhánh</option>
                  {branches.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Phòng muốn đặt
                <select
                  required
                  value={roomId}
                  onChange={(e) => {
                    setRoomId(e.target.value);
                    const next = allRooms.find((p) => p.id === e.target.value);
                    if (next?.homestay_id) setBranch(next.homestay_id);
                  }}
                >
                  <option value="">Chọn phòng</option>
                  {allRooms
                    .filter((p) => !branch || p.homestay_id === branch)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.ma_phong} · {p.ten_phong}
                      </option>
                    ))}
                </select>
              </label>
              <div
                className="kh-reserve-kind"
                role="group"
                aria-label="Loại đặt phòng của khách"
              >
                <span>Loại đặt phòng</span>
                <div>
                  {(
                    [
                      ["gio", "Theo giờ"],
                      ["ngay", "Theo ngày"],
                      ["dem", "Qua đêm"],
                    ] as const
                  )
                    .filter(
                      ([k]) =>
                        !room ||
                        room[("cho_dat_theo_" + k) as keyof PhongKhach] !==
                          false,
                    )
                    .map(([k, title]) => (
                      <button
                        type="button"
                        key={k}
                        aria-pressed={kind === k}
                        onClick={() => changeKind(k)}
                      >
                        {title}
                      </button>
                    ))}
                </div>
              </div>
              <div className="kh-reserve-dates">
                <span>Ngày lưu trú</span>
                <RangePicker
                  start={start}
                  end={end}
                  minDate={ngayVietNam()}
                  onChange={(a, b) => {
                    setStart(a);
                    setEnd(b);
                  }}
                  compact
                />
              </div>
              {kind === "gio" && (
                <div className="kh-reserve-hours">
                  <ChonKhoangGio
                    minimum={Number(room?.so_gio_toi_thieu) || 1}
                    date={start}
                    endDate={end}
                    start={st}
                    end={et}
                    config={config}
                    onChange={(a, b, x, y) => {
                      const oldHours=(Date.parse(end+'T'+et+':00+07:00')-Date.parse(start+'T'+st+':00+07:00'))/3600000,newHours=(Date.parse(b+'T'+y+':00+07:00')-Date.parse(a+'T'+x+':00+07:00'))/3600000,included=comboIds.map(id=>comboCache.current.get(id)?.so_gio_bao_gom).find(n=>n&&n>0)||Number(room?.so_gio_toi_thieu||1);
                      if(Number.isFinite(oldHours)&&Number.isFinite(newHours)&&newHours>0){const delta=(Math.max(0,Math.ceil(newHours)-included)-Math.max(0,Math.ceil(oldHours)-included))*Number(room?.gia_phu_thu_gio||0);setPrice(p=>p===null?p:Math.max(0,p+delta));}
                      setStart(a);
                      setEnd(b);
                      setSt(x);
                      setEt(y);
                    }}
                  />
                </div>
              )}
              {kind && kind !== "gio" && (
                <div className="kh-reserve-extra">
                  <p className="kh-reserve-slot">
                    Nhận {config[kind + "_tu"]} · Trả {config[kind + "_den"]}
                    {config[kind + "_den"] <= config[kind + "_tu"]
                      ? " hôm sau"
                      : ""}
                  </p>
                  <div>
                    {(
                      [
                        ["Check-in sớm", early, setEarly],
                        ["Check-out muộn", late, setLate],
                      ] as const
                    ).map(([title, value, setter]) => (
                      <label key={title}>
                        {title}
                        <DaiGio label={title} items={Array.from({length:25},(_,i)=>({ngay:'extra',gio:(i/2).toLocaleString('vi-VN')+' giờ',time:i/2}))} value={'extraT'+value.toLocaleString('vi-VN')+' giờ'} onChange={slot=>{const next=slot.time,oldTotal=Math.ceil(early+late),newTotal=Math.ceil((title==='Check-in sớm'?next:early)+(title==='Check-out muộn'?next:late)),delta=(newTotal-oldTotal)*Number(room?.gia_phu_thu_gio||0);setter(next);setPrice(p=>p===null?p:Math.max(0,p+delta));setSurcharge(p=>Math.max(0,p+delta));}}/>
                      </label>
                    ))}
                  </div>
                  <small>
                    Phụ thu {money(Number(room?.gia_phu_thu_gio || 0))}/giờ ·
                    Tổng giờ lẻ làm tròn lên.
                  </small>
                </div>
              )}
              <label>
                Tên khách hàng
                <input
                  required
                  minLength={2}
                  maxLength={150}
                  autoComplete="name"
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
                  maxLength={20}
                  value={form.so_dien_thoai}
                  onChange={(e) =>
                    setForm({ ...form, so_dien_thoai: e.target.value })
                  }
                />
              </label>
              <label>
                Số khách
                <input
                  required
                  type="number"
                  min={1}
                  max={room?.suc_chua || 100}
                  value={form.so_khach}
                  onChange={(e) =>
                    setForm({ ...form, so_khach: Number(e.target.value) })
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
            </fieldset>
          </fieldset>
          <aside className="kh-reserve-summary">
            <h3>{room?.ten_phong || "Chọn phòng để bắt đầu"}</h3>
            <p>{room?.ten_homestay}</p>
            {request.q && (
              <p className="kh-reserve-time">
                {kind === "gio"
                  ? "Theo giờ"
                  : kind === "ngay"
                    ? "Theo ngày"
                    : "Qua đêm"}{" "}
                ·
                {new Date(request.q.bat_dau).toLocaleString("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "2-digit",
                  month: "2-digit",
                })}{" "}
                →{" "}
                {new Date(request.q.ket_thuc).toLocaleString("vi-VN", {
                  timeZone: "Asia/Ho_Chi_Minh",
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "2-digit",
                  month: "2-digit",
                })}
              </p>
            )}
            <div className="kh-reserve-selected-combos">
              <span>Combo đã chọn ({comboIds.length})</span>
              {!comboIds.length ? (
                <small>Không dùng combo</small>
              ) : (
                comboIds.map((id) => (
                  <div key={id}>
                    <span>
                      {comboCache.current.get(id)?.ten_combo ||
                        "Combo cần kiểm tra lại"}
                    </span>
                    <button
                      type="button"
                      aria-label={
                        "Bỏ combo " +
                        (comboCache.current.get(id)?.ten_combo || id)
                      }
                      disabled={busy}
                      onClick={() =>
                        setComboIds((ids) => ids.filter((x) => x !== id))
                      }
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
            <label className="kh-reserve-voucher">Voucher<input aria-label="Voucher đặt phòng" placeholder="Nhập mã voucher" maxLength={40} value={voucher} onChange={e=>setVoucher(e.target.value.toUpperCase())}/></label>
            {discount>0&&<small>Giảm {money(discount)}</small>}
            <div className="kh-reserve-total">
              <span>Tổng dự kiến</span>
              <strong>
                {price !== null ? money(price) : "Chọn phòng, loại đặt và lịch"}
              </strong>
            </div>
            {price !== null && surcharge > 0 && (
              <small>
                Đã gồm phụ thu nhận sớm/trả muộn: {money(surcharge)}
              </small>
            )}
            {!token && guestConfirm && (
              <div className="kh-reserve-notice" role="note">
                Bạn hãy đăng nhập hoặc đăng ký để xác nhận đơn thêm lần nữa nhé.
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onLogin(form.so_dien_thoai)}
                >
                  Đăng nhập / Đăng ký
                </button>
                <button
                  type="button"
                  disabled={busy || quoting || quoteKey !== serialized}
                  onClick={() => void submit(undefined, true)}
                >
                  Tiếp tục đặt không đăng nhập
                </button>
              </div>
            )}
            {(error || request.message) && (
              <p role="alert" className="kh-error">
                {error || request.message}
              </p>
            )}
            <small>
              Giá và phòng trống được kiểm tra lại khi gửi. Giữ chỗ 15 phút chờ
              xác nhận.
            </small>
            <button
              className="kh-reserve-submit"
              type={showCombos ? "button" : "submit"}
              onClick={showCombos ? () => setShowCombos(false) : undefined}
              disabled={
                busy ||
                (!showCombos &&
                  (quoting || price === null || quoteKey !== serialized))
              }
            >
              {busy
                ? "Đang gửi…"
                : showCombos
                  ? "Tiếp tục thông tin đặt phòng"
                  : "Gửi yêu cầu đặt phòng"}
            </button>
          </aside>
        </form>
      </section>
    </div>,
    document.body,
  );
}

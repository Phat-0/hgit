import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { RangePicker } from "./RangePicker";
import ChonGio from "./ChonGio";
import NhapTien from "./NhapTien";
import { khoangThoiGianLich } from "./khung-gio-dat-phong";
import { goiYThoiGian } from "./mac-dinh-thoi-gian";
import { quanTriApi, lucVN, ngayVN, vnd } from "./bao-cao-api";
import { tinhGiaDon, type GiaPhong } from "./tinh-gia-don";
import "./form-don-chung.css";
export type DonSua = {
  id: string;
  phong_id: string;
  ten_khach: string;
  so_dien_thoai: string;
  hinh_thuc_dat: string;
  nhan_phong_luc: string;
  tra_phong_luc: string;
  so_khach: number;
  tien_phong: string;
  ghi_chu: string | null;
  ten_phong: string;
  combo_id?: string | null;
  trang_thai?:string;trang_thai_thanh_toan?:string;tien_da_thanh_toan?:string;tien_dich_vu?:string;tien_giam?:string;
};
export type SeedDon = {
  phong_id?: string;
  date?: string;
  kind?: "gio" | "ngay" | "dem";
  time?: string;
};
type Room = GiaPhong & {
  id: string;
  homestay_id: string;
  ten_homestay: string;
  ten_phong: string;
  ten_loai: string;
  cho_dat_theo_gio: boolean;
  cho_dat_theo_ngay: boolean;
  cho_dat_theo_dem: boolean;
};
type Combo = {
  id: string;
  ten_combo: string;
  gia_combo: number | string;
  so_gio_bao_gom: number | null;
  pham_vi: string;
  chi_nhanh_ids: string[];
  phong_ids: string[];
  bat_dau: string | null;
  ket_thuc: string | null;
};
const dayOf = (s: string) =>
  new Date(new Date(s).getTime() + 7 * 3600000).toISOString().slice(0, 10);
const clockOf = (s: string) =>
  new Date(new Date(s).getTime() + 7 * 3600000).toISOString().slice(11, 16);
export default function FormDonDatPhong({
  token,
  don,
  seed,
  onClose,
  onSaved,
  embedded=false,
}: {
  token: string;
  don?: DonSua;
  seed?: SeedDon;
  onClose: () => void;
  onSaved: () => Promise<void>;
  embedded?:boolean;
}) {
  const [rooms, setRooms] = useState<Room[]>([]),
    [combos, setCombos] = useState<Combo[]>([]),
    [hours, setHours] = useState<Record<string, string>>({}),
    [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<"gio" | "ngay" | "dem">(
    don
      ? don.hinh_thuc_dat === "Theo giờ"
        ? "gio"
        : don.hinh_thuc_dat === "Theo ngày"
          ? "ngay"
          : "dem"
      : seed?.kind || "gio",
  );
  const [roomId, setRoomId] = useState(don?.phong_id || seed?.phong_id || ""),
    [branch, setBranch] = useState(""),
    [combo, setCombo] = useState(don?.combo_id || ""),
    [name, setName] = useState(don?.ten_khach || ""),
    [phone, setPhone] = useState(don?.so_dien_thoai || ""),
    [guests, setGuests] = useState(String(don?.so_khach || 1)),
    [note, setNote] = useState(don?.ghi_chu || ""),
    [price, setPrice] = useState(don?.tien_phong || "0"),
    [priceManual, setPriceManual] = useState(!!don),
    [payment, setPayment] = useState(don?.trang_thai_thanh_toan||"Chưa thanh toán");
  const [paymentTouched,setPaymentTouched]=useState(!don);
  const [paid,setPaid]=useState(String(don?.tien_da_thanh_toan||'0')),[newState,setNewState]=useState(don?.trang_thai||'Đã xác nhận'),[stateReason,setStateReason]=useState('');
  const fullAmount=Number(price||0)+Number(don?.tien_dich_vu||0)-Number(don?.tien_giam||0);
  useEffect(()=>{if(!paymentTouched)return;if(payment==='Đủ')setPaid(String(fullAmount));else if(payment==='Chưa thanh toán')setPaid('0')},[payment,fullAmount,paymentTouched]);
  const [start, setStart] = useState(seed?.date || ngayVN()),
    [end, setEnd] = useState(seed?.date || ngayVN()),
    [from, setFrom] = useState(seed?.time || "08:00"),
    [to, setTo] = useState("10:00");
  useEffect(() => {
    let active = true;
    void quanTriApi<{
      rooms: Room[];
      combos: Combo[];
      cau_hinh_gio: Record<string, string>;
    }>(token, "lich-phong/don-dat-phong/tuy-chon")
      .then((j) => {
        if (!active) return;
        setRooms(j.rooms);
        setCombos(j.combos);
        setHours(j.cau_hinh_gio);
        setBranch(
          j.rooms.find((r) => r.id === (don?.phong_id || seed?.phong_id))
            ?.homestay_id || "",
        );
        if (don) {
          const a = dayOf(don.nhan_phong_luc),
            b = dayOf(don.tra_phong_luc);
          setStart(a);
          setEnd(
            kind !== "gio" &&
              clockOf(don.tra_phong_luc) <= clockOf(don.nhan_phong_luc)
              ? new Date(new Date(b + "T12:00:00+07:00").getTime() - 86400000)
                  .toISOString()
                  .slice(0, 10)
              : b,
          );
          setFrom(clockOf(don.nhan_phong_luc));
          setTo(clockOf(don.tra_phong_luc));
        } else {
          const t = goiYThoiGian(kind, j.cau_hinh_gio);
          setStart(seed?.date || t.day);
          setEnd(seed?.date || t.endDay);
          setFrom(seed?.time || t.start);
          const minutes = seed?.time
            ? Number(seed.time.slice(0, 2)) * 60 + Number(seed.time.slice(3))
            : 0;
          setTo(
            seed?.time
              ? String(
                  Math.min(
                    23,
                    Math.floor(minutes / 60) +
                      Math.max(
                        1,
                        Number(
                          j.rooms.find((r) => r.id === seed.phong_id)
                            ?.so_gio_toi_thieu,
                        ) || 1,
                      ),
                  ),
                ).padStart(2, "0") +
                  ":" +
                  seed.time.slice(3)
              : t.end,
          );
        }
        setReady(true);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [token, don?.id]);
  const room = rooms.find((r) => r.id === roomId),
    selectedCombo = combos.find((c) => c.id === combo);
  const interval = useMemo(
    () =>
      khoangThoiGianLich(
        kind === "dem" ? "qua-dem" : kind,
        start,
        end,
        from,
        to,
      ),
    [kind, start, end, from, to, hours],
  );
  const auto = tinhGiaDon(
    room,
    kind,
    interval.start,
    interval.end,
    hours,
    selectedCombo,
  );
  useEffect(() => {
    if (ready && !priceManual) setPrice(String(auto));
  }, [auto, ready, priceManual]);
  function currentHours() {
    if (kind !== "gio") {
      setFrom(hours[kind + "_tu"]);
      setTo(hours[kind + "_den"]);
    }
  }
  function changeKind(k: typeof kind) {
    setKind(k);
    setPriceManual(false);
    setCombo("");
    const t = goiYThoiGian(k, hours);
    setFrom(t.start);
    setTo(t.end);
  }
  const changes = don
    ? [
        ...(roomId !== don.phong_id
          ? ["Phòng: " + don.ten_phong + " → " + (room?.ten_phong || roomId)]
          : []),
        ...(Number.isFinite(interval.start.getTime()) &&
        interval.start.getTime() !== Date.parse(don.nhan_phong_luc)
          ? [
              "Nhận: " +
                lucVN(don.nhan_phong_luc) +
                " → " +
                lucVN(interval.start.toISOString()),
            ]
          : []),
        ...(Number.isFinite(interval.end.getTime()) &&
        interval.end.getTime() !== Date.parse(don.tra_phong_luc)
          ? [
              "Trả: " +
                lucVN(don.tra_phong_luc) +
                " → " +
                lucVN(interval.end.toISOString()),
            ]
          : []),
      ]
    : [];
  async function save(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!ready || !roomId) return;
    if (
      !Number.isFinite(interval.start.getTime()) ||
      !Number.isFinite(interval.end.getTime()) ||
      interval.end <= interval.start
    ) {
      setError("Thời gian trả phải sau thời gian nhận");
      return;
    }
    setBusy(true);
    try {
      const body = {
        ten_khach: name,
        so_dien_thoai: phone,
        phong_id: roomId,
        hinh_thuc_dat:
          kind === "gio"
            ? "Theo giờ"
            : kind === "ngay"
              ? "Theo ngày"
              : "Theo đêm",
        combo_id: combo || null,
        nhan_phong_luc: interval.start.toISOString(),
        tra_phong_luc: interval.end.toISOString(),
        so_khach: Number(guests),
        tien_phong: Number(price),
        ghi_chu: note,
        ...(!don||paymentTouched?{trang_thai_thanh_toan:payment,tien_da_thanh_toan:Number(paid)}:{}),
        ...(don?{trang_thai_sua:newState,ly_do_sua_trang_thai:stateReason}:{}),
      };
      await quanTriApi(
        token,
        "lich-phong/don-dat-phong" + (don ? "/" + don.id : ""),
        don ? "PUT" : "POST",
        don
          ? body
          : { ...body, so_dien_thoai: phone, trang_thai_thanh_toan: payment },
      );
      await onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được đơn");
    } finally {
      setBusy(false);
    }
  }
  const dialog=(      <section
        className={"fd-dialog"+(embedded?" fd-embedded":"")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fd-title"
      >
        <header>
          <h2 id="fd-title">
            {don ? "Chỉnh sửa đơn đặt phòng" : "Tạo đơn đặt phòng"}
          </h2>
          <button
            aria-label="Đóng biểu mẫu đơn"
            disabled={busy}
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <form onSubmit={save}>
          <div className="fd-fields">
            <label>
              Tên khách hàng
              <input
                required
                maxLength={150}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Số điện thoại
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <label>
              Chi nhánh
              <select
                value={branch}
                onChange={(e) => {
                  setBranch(e.target.value);
                  setRoomId("");
                  setCombo("");
                  setPriceManual(false);
                }}
              >
                <option value="">Chọn chi nhánh</option>
                {[
                  ...new Map(
                    rooms.map((r) => [r.homestay_id, r.ten_homestay]),
                  ).entries(),
                ].map(([id, n]) => (
                  <option key={id} value={id}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Loại phòng muốn đặt
              <select
                value={kind}
                disabled={!ready}
                onChange={(e) => changeKind(e.target.value as typeof kind)}
              >
                <option value="gio">Theo giờ</option>
                <option value="ngay">Theo ngày</option>
                <option value="dem">Qua đêm</option>
              </select>
            </label>
            <label>
              Phòng
              <select
                required
                value={roomId}
                onChange={(e) => {
                  setRoomId(e.target.value);
                  currentHours();
                  setCombo("");
                  setPriceManual(false);
                }}
              >
                <option value="">Chọn phòng</option>
                {don && !rooms.some((r) => r.id === don.phong_id) && (
                  <option value={don.phong_id}>{don.ten_phong}</option>
                )}
                {rooms
                  .filter(
                    (r) =>
                      (!branch || r.homestay_id === branch) &&
                      r[
                        kind === "gio"
                          ? "cho_dat_theo_gio"
                          : kind === "ngay"
                            ? "cho_dat_theo_ngay"
                            : "cho_dat_theo_dem"
                      ],
                  )
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.ten_phong} · {r.ten_loai}
                    </option>
                  ))}
              </select>
            </label>
            <div className="fd-field">
              <span>Khoảng ngày</span>
              <RangePicker
                compact
                start={start}
                end={end}
                minDate={don ? undefined : ngayVN()}
                onChange={(a, b) => {
                  setStart(a);
                  setEnd(b);
                  currentHours();
                  setPriceManual(false);
                }}
              />
            </div>
            {kind === "gio" ? (
              <div className="fd-field fd-full">
                <span>Giờ nhận / trả</span>
                <div className="fd-times">
                  <ChonGio
                    label="Giờ nhận"
                    step={30}
                    value={from}
                    onChange={(v) => {
                      setFrom(v);
                      setPriceManual(false);
                    }}
                  />
                  <span>→</span>
                  <ChonGio
                    label="Giờ trả"
                    step={30}
                    value={to}
                    onChange={(v) => {
                      setTo(v);
                      setPriceManual(false);
                    }}
                  />
                </div>
              </div>
            ) : (
              <p className="fd-full fd-summary">
                Check-in: {lucVN(interval.start.toISOString())} · Check-out:{" "}
                {lucVN(interval.end.toISOString())}
              </p>
            )}
            <label>
              Combo
              <select
                value={combo}
                onChange={(e) => {
                  setCombo(e.target.value);
                  setPriceManual(false);
                }}
              >
                <option value="">Không chọn combo</option>
                {combos
                  .filter(
                    (c) =>
                      (!c.so_gio_bao_gom || kind === "gio") &&
                      (!c.bat_dau ||
                        Date.parse(c.bat_dau) <= interval.start.getTime()) &&
                      (!c.ket_thuc ||
                        Date.parse(c.ket_thuc) >= interval.end.getTime()) &&
                      (c.pham_vi === "toan_he_thong" ||
                        (c.pham_vi === "chi_nhanh" &&
                          c.chi_nhanh_ids.includes(branch)) ||
                        (c.pham_vi === "phong" &&
                          c.phong_ids.includes(roomId))),
                  )
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.ten_combo} · {vnd(c.gia_combo)}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Số khách
              <input
                type="number"
                required
                min={1}
                max={100}
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
              />
            </label>
            <label>
              Tiền phòng
              <NhapTien
                required
                value={price}
                onValueChange={(v) => {
                  setPrice(v);
                  setPriceManual(true);
                }}
              />
            </label>
            <label>Thanh toán<select value={payment} onChange={e=>{setPayment(e.target.value);setPaymentTouched(true)}}><option>Chưa thanh toán</option><option value="Cọc">Đã cọc</option><option value="Đủ">Đã thanh toán</option></select></label>
            <label>Số tiền đã thanh toán<NhapTien required readOnly={payment!=='Cọc'} value={paid} onValueChange={v=>{setPaid(v);setPaymentTouched(true)}}/></label>
            {don&&<><label>Trạng thái đơn<select value={newState} onChange={e=>setNewState(e.target.value)}>{['Chờ xác nhận','Đã xác nhận','Đã nhận phòng','Đã trả phòng','Không nhận phòng',...(don.trang_thai==='Chờ thanh toán'?['Chờ thanh toán']:[])].map(v=><option key={v}>{v}</option>)}</select></label>{newState!==don.trang_thai&&<label>Lý do sửa thao tác<input required maxLength={500} value={stateReason} onChange={e=>setStateReason(e.target.value)} placeholder="Ghi rõ thao tác bấm nhầm…"/></label>}</>}
            <div className="fd-full fd-price">
              {kind === "gio" && room && (
                <span>
                  Tối thiểu {room.so_gio_toi_thieu} giờ ·{" "}
                  {vnd(room.gia_moi_gio)} / {room.so_gio_toi_thieu} giờ đầu
                </span>
              )}
              Giá tự tính: {vnd(auto)}{" "}
              {priceManual && (
                <button type="button" onClick={() => setPriceManual(false)}>
                  Dùng giá tự tính
                </button>
              )}
            </div>
            <label className="fd-full">
              Ghi chú
              <textarea
                maxLength={2000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
          </div>
          {changes.length > 0 && (
            <div className="fd-changes">
              <strong>Thay đổi dự kiến</strong>
              {changes.map((c) => (
                <p key={c}>{c}</p>
              ))}
            </div>
          )}
          {error && (
            <p className="cn-error" role="alert">
              {error}
            </p>
          )}
          <footer>
            <span>
              {don
                ? "Giữ trạng thái đơn hiện tại"
                : "Đơn từ quản trị được xác nhận ngay"}
            </span>
            <button type="button" disabled={busy} onClick={onClose}>
              Thoát
            </button>
            <button type="submit" disabled={busy || !ready}>
              {busy ? "Đang lưu…" : "Lưu đơn"}
            </button>
          </footer>
        </form>
      </section>);
  return embedded?dialog:createPortal(<div className="fd-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)onClose()}}>{dialog}</div>,document.body);
}

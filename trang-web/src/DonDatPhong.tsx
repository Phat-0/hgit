import AnhDonDatPhong from './AnhDonDatPhong';
import BieuTuongDon from './BieuTuongDon';
import { useCallback, useEffect, useState, useRef } from "react";
import ChiTietDonLich from "./ChiTietDonLich";
import FormDonDatPhong from "./FormDonDatPhong";
import { quanTriApi, vnd, lucVN, type RecentOrder } from "./bao-cao-api";
import { nhanThanhToan, maDonGon } from "./hien-thi-don";
import "./don-dat-phong-bang.css";
type Booking = RecentOrder & {
  so_dien_thoai: string;
  trang_thai_hien_thi: string;
  trang_thai_thanh_toan: string;
  tien_dich_vu: string;
  ten_loai_phong: string;
  combo: string | null;
  ghi_chu: string | null;
};
const statuses = [
  ["", "Tất cả"],
  ["Đã xác nhận", "Chờ nhận phòng"],
  ["Đã nhận phòng", "Đã nhận phòng"],
  ["Chờ xác nhận", "Chờ xác nhận"],
  ["Chưa nhận phòng", "Không nhận phòng"],
  ["Đã hủy", "Đã hủy"],
  ["Đã trả phòng", "Hoàn thành"],
  ["Thanh toán", "Thanh toán"],
];
export default function DonDatPhong({
  token,
  initialId,
  onOpenChat,
}: {
  token: string;
  initialId?: string;
  onOpenChat?:(thread:{id:string;ten_hien_thi:string})=>void;
}) {
  const [photos,setPhotos]=useState('');
  async function chat(id:string){setError('');try{const t=await quanTriApi<{id:string;ten_hien_thi:string}>(token,'lich-phong/don-dat-phong/'+id+'/hoi-thoai','POST');if(onOpenChat)onOpenChat(t);else window.dispatchEvent(new CustomEvent('homestay:mo-chat',{detail:t}))}catch(e){setError((e as Error).message)}}
  const request = useRef(0);
  const [rows, setRows] = useState<Booking[]>([]),
    [counts, setCounts] = useState<Record<string, number>>({}),
    [status, setStatus] = useState(""),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState(""),
    [payment, setPayment] = useState("Chưa thanh toán"),
    [creating, setCreating] = useState(false),
    [id, setId] = useState(initialId || ""),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    const serial = ++request.current;
    setError("");
    try {
      const q = new URLSearchParams({
        trang_thai: status === "Thanh toán" ? payment : status,
        tim_kiem: filter,
      });
      const [list, c] = await Promise.all([
        quanTriApi<Booking[]>(token, "lich-phong/don-dat-phong?" + q),
        quanTriApi<Record<string, number>>(
          token,
          "lich-phong/don-dat-phong/thong-ke?tim_kiem=" +
            encodeURIComponent(filter),
        ),
      ]);
      if (serial === request.current) {
        setRows(list);
        setCounts(c);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được đơn");
    }
  }, [token, status, filter, payment]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <section className="dp-page">
      <div className="dp-toolbar">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setFilter(search);
          }}
        >
          <input
            aria-label="Tìm đơn đặt phòng"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Mã đặt, tên khách, điện thoại, phòng…"
          />
          <button>Tìm</button>
        </form>
        <button onClick={() => setCreating(true)}>+ Tạo mới</button>
        <button onClick={() => void load()}>↻ Tải lại</button>
      </div>
      <nav className="dp-tabs">
        {statuses.map(([v, label]) => (
          <button
            key={v}
            className={status === v ? "active" : ""}
            onClick={() => setStatus(v)}
          >
            {label} <span>{counts[v || "Tất cả"] || 0}</span>
          </button>
        ))}
      </nav>
      {status === "Thanh toán" && (
        <div className="dp-payment-tabs">
          {["Chưa thanh toán", "Cọc", "Đủ"].map((s) => (
            <button key={s} onClick={() => setPayment(s)}>
              {nhanThanhToan(s).text} {counts[s] || 0}
            </button>
          ))}
        </div>
      )}
      {error && (
        <p className="cn-error" role="alert">
          {error}
        </p>
      )}
      <div className="dp-table-scroll">
        <table className="dp-table-bookings">
          <thead>
            <tr>
              {[
                "Mã đặt",
                "Tổng thanh toán",
                "Kiểu đặt",
                "Nhận phòng",
                "Trả phòng",
                "Loại phòng",
                "Phòng",
                "Tình trạng",
                "Khách hàng",
                "Combo",
                "Phí dịch vụ",
                "Ghi chú",
                "Thao tác",
              ].map((x) => (
                <th key={x}>{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr
                key={d.id}
                onClick={() => setId(d.id)}
                className={
                  d.trang_thai === "Chờ xác nhận"
                    ? "dp-booking-unconfirmed"
                    : ""
                }
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter"&&e.target===e.currentTarget) setId(d.id);
                }}
              >
                <td>
                  <button className="dp-code" title={d.ma_dat_phong} onClick={() => setId(d.id)}>
                    {maDonGon(d.ma_dat_phong)}
                  </button>
                </td>
                <td>
                  {vnd(d.tong_tien)}
                  <small
                    style={{
                      display: "block",
                      color:
                        d.trang_thai_thanh_toan === "Đủ"
                          ? "#00884f"
                          : "#a65c12",
                    }}
                  >
                    {nhanThanhToan(d.trang_thai_thanh_toan).text}
                  </small>
                </td>
                <td>{d.hinh_thuc_dat}</td>
                <td>{lucVN(d.nhan_phong_luc)}</td>
                <td>{lucVN(d.tra_phong_luc)}</td>
                <td>{d.ten_loai_phong}</td>
                <td>
                  {d.ten_phong}
                  <small style={{ display: "block" }}>{d.ten_homestay}</small>
                </td>
                <td>{d.trang_thai_hien_thi || d.trang_thai}</td>
                <td>
                  {d.ten_khach}
                  <small style={{ display: "block" }}>
                    {d.so_dien_thoai || "—"}
                  </small>
                </td>
                <td>{d.combo || "—"}</td>
                <td>{vnd(d.tien_dich_vu)}</td>
                <td>{d.ghi_chu || "—"}</td>
                <td className="dp-inline-actions" onClick={e=>e.stopPropagation()}><button type="button" title="Mở cuộc trò chuyện của đơn" aria-label="Chat theo đơn" onClick={()=>void chat(d.id)}><BieuTuongDon kind="chat"/></button><button type="button" title="Ảnh của đơn" aria-label="Ảnh của đơn" onClick={()=>setPhotos(d.id)}><BieuTuongDon kind="image"/></button></td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={13}>Không có đơn phù hợp</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <footer>Hiển thị {rows.length} đơn mới nhất · tối đa 300 đơn</footer>
      {creating && (
        <FormDonDatPhong
          token={token}
          onClose={() => setCreating(false)}
          onSaved={load}
        />
      )}
      {photos&&<AnhDonDatPhong id={photos} token={token} onClose={()=>setPhotos('')}/>}
      {id && (
        <ChiTietDonLich
          id={id}
          token={token}
          onClose={() => setId("")}
          onChanged={load}

        />
      )}
    </section>
  );
}

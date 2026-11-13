import BieuTuongDon from './BieuTuongDon';
import './don-chi-tiet-thao-tac.css';
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import FormDonDatPhong, { type DonSua } from "./FormDonDatPhong";
import { quanTriApi, vnd, lucVN } from "./bao-cao-api";
import "./chi-tiet-don-lich.css";
type Change = {
  id: string;
  ngay_tao: string;
  du_lieu_cu: {
    phong_id?: string;
    ten_phong?: string;
    nhan_phong_luc?: string;
    tra_phong_luc?: string;
  };
  du_lieu_moi: {
    phong_id?: string;
    ten_phong?: string;
    nhan_phong_luc?: string;
    tra_phong_luc?: string;
  };
};
type Don = DonSua & {
  ma_dat_phong: string;
  ten_homestay: string;
  trang_thai: string;
  trang_thai_thanh_toan: string;
  tien_dich_vu: string;
  tien_giam: string;
  tong_tien: string;
  tien_da_thanh_toan: string;
  ten_combo: string | null;
  thay_doi?: Change[];
};
export default function ChiTietDonLich({
  id,
  token,
  onClose,
  onChanged,
  extraActions,
  readOnly = false,
}: {
  id: string;
  token: string;
  onClose: () => void;
  onChanged: () => Promise<void>;
  extraActions?: ReactNode;
  readOnly?: boolean;
}) {
  const [don, setDon] = useState<Don | null>(null),
    [editing, setEditing] = useState(false),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      setDon(await quanTriApi<Don>(token, "lich-phong/don-dat-phong/" + id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được đơn");
    }
  }, [id, token]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !editing && !busy) onClose();
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [busy, editing, onClose]);
  async function remove() {
    setBusy(true);
    try {
      await quanTriApi(token, "lich-phong/don-dat-phong/" + id, "DELETE");
      await onChanged();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không xóa được đơn");
    } finally {
      setBusy(false);
    }
  }
  async function status(action:string,label:string){if(!window.confirm('Xác nhận '+label.toLowerCase()+' cho đơn này?'))return;setBusy(true);setError('');try{await quanTriApi(token,'lich-phong/don-dat-phong/'+id,'PATCH',{hanh_dong:action});await load();await onChanged()}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
  const editable =
    !readOnly &&
    don &&
    ["Chờ thanh toán", "Chờ xác nhận", "Đã xác nhận","Đã nhận phòng","Đã trả phòng","Không nhận phòng"].includes(don.trang_thai);
  return createPortal(
    <div
      className="don-lich-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <section
        className="don-lich-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Chi tiết đơn đặt phòng"
      >
        <header>
          <div className="don-heading-line">
            <small>ĐƠN ĐẶT PHÒNG</small>
            <h2>{don?.ten_khach || "Chi tiết đơn"}</h2>
            <span title={don?.ma_dat_phong}>{don?.ma_dat_phong}</span>{don&&<span>{don.so_dien_thoai||'Chưa có SĐT'} · {don.ten_phong}</span>}
          </div>
          <button aria-label="Đóng chi tiết" onClick={onClose}>
            ×
          </button>
        </header>
        {error && (
          <p className="cn-error" role="alert">
            {error}
          </p>
        )}
        {don ? (
          <>
            <dl>
              {[
                ["Khách hàng", don.ten_khach],
                ["Điện thoại", don.so_dien_thoai || "—"],
                ["Chi nhánh", don.ten_homestay],
                ["Phòng", don.ten_phong],
                ["Kiểu đặt", don.hinh_thuc_dat],
                ["Nhận → Trả", lucVN(don.nhan_phong_luc)+" → "+lucVN(don.tra_phong_luc)],
                ["Số khách", String(don.so_khach)],
                ["Trạng thái đơn", don.trang_thai],
                ["Thanh toán", don.trang_thai_thanh_toan],
                ["Tiền phòng", vnd(don.tien_phong)],
                ["Tiền dịch vụ", vnd(don.tien_dich_vu)],
                ["Tiền giảm", vnd(don.tien_giam)],
                ["Tổng tiền", vnd(don.tong_tien)],
                ["Đã thanh toán", vnd(don.tien_da_thanh_toan)],
                ["Combo", don.ten_combo || "—"],
                ["Ghi chú", don.ghi_chu || "—"],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            {!!don.thay_doi?.length && (
              <section className="don-thay-doi">
                <h3>Lịch sử đổi phòng / thời gian</h3>
                {don.thay_doi.map((c) => (
                  <article key={c.id}>
                    <small>{lucVN(c.ngay_tao)}</small>
                    {c.du_lieu_cu.phong_id !== c.du_lieu_moi.phong_id && (
                      <p>
                        Phòng: {c.du_lieu_cu.ten_phong || c.du_lieu_cu.phong_id}{" "}
                        → {c.du_lieu_moi.ten_phong || c.du_lieu_moi.phong_id}
                      </p>
                    )}
                    {["nhan_phong_luc", "tra_phong_luc"].map((k) => {
                      const a = c.du_lieu_cu[k as keyof Change["du_lieu_cu"]],
                        b = c.du_lieu_moi[k as keyof Change["du_lieu_moi"]];
                      return a && b && Date.parse(a) !== Date.parse(b) ? (
                        <p key={k}>
                          {k === "nhan_phong_luc" ? "Nhận" : "Trả"}: {lucVN(a)}{" "}
                          → {lucVN(b)}
                        </p>
                      ) : null;
                    })}
                  </article>
                ))}
              </section>
            )}
            {!readOnly&&<div className="don-lifecycle">{[{action:'xac_nhan',label:'Xác nhận',from:['Chờ xác nhận'],tone:'confirm'},{action:'nhan_phong',label:'Nhận phòng',from:['Đã xác nhận'],tone:'checkin'},{action:'tra_phong',label:'Trả phòng',from:['Đã nhận phòng'],tone:'checkout'},{action:'khong_nhan',label:'Không nhận phòng',from:['Đã xác nhận','Chờ xác nhận'],tone:'absent'}].map(b=>{const enabled=!busy&&b.from.includes(don.trang_thai);return <button key={b.action} disabled={!enabled} className={enabled?'don-action-'+b.tone:'don-action-off'} title={enabled?b.label:'Muốn sửa thao tác đã chọn, bấm biểu tượng Chỉnh sửa'} onClick={()=>void status(b.action,b.label)}>{b.label}</button>})}</div>}
            {!readOnly && extraActions}
            {confirm ? (
              <div className="don-lich-confirm" role="alert">
                <strong>Xóa đơn khỏi lịch?</strong>
                <p>
                  Chuyển sang Đã hủy, giữ lịch sử và chứng từ. Không tự động
                  hoàn tiền.
                </p>
                <div className="don-lich-actions">
                  <button disabled={busy} onClick={() => setConfirm(false)}>
                    Quay lại
                  </button>
                  <button disabled={busy} onClick={() => void remove()}>
                    Xác nhận xóa
                  </button>
                </div>
              </div>
            ) : (
              <div className="don-icon-actions">{!readOnly&&<><button aria-label="Chỉnh sửa đơn" title="Chỉnh sửa đơn và sửa thao tác nhầm" disabled={busy||!editable} onClick={()=>setEditing(true)}><BieuTuongDon kind="edit"/></button><button aria-label="Xóa đơn khỏi lịch" title="Xóa đơn khỏi lịch" disabled={busy||!['Chờ thanh toán','Chờ xác nhận','Đã xác nhận'].includes(don.trang_thai)} onClick={()=>setConfirm(true)}><BieuTuongDon kind="delete"/></button></>}</div>
            )}
          </>
        ) : (
          <p>Đang tải chi tiết…</p>
        )}
        {editing && don && (
          <FormDonDatPhong
            token={token}
            don={don}
            onClose={() => setEditing(false)}
            onSaved={async () => {
              await load();
              await onChanged();
            }}
          />
        )}
      </section>
    </div>,
    document.body,
  );
}

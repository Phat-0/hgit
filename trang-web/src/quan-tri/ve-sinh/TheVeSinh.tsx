import HopThoaiKhach from "../khach-hang/HopThoaiKhach";
import { useState } from "react";
import { qlApi, luc } from "../khach-hang/api";
import "./ve-sinh.css";
export type ViecVeSinh = {
  id: string;
  ma_phong: string;
  tra_phong_luc: string;
  trang_thai: string;
  trang_thai_don?: string;
  co_the_hoan_thanh?: boolean;
  hoan_thanh_luc?: string;
};
export const quaHan = (v: ViecVeSinh, now = Date.now()) =>
  v.trang_thai !== "Hoàn thành" &&
  v.trang_thai !== "Đã hủy" &&
  Number.isFinite(Date.parse(v.tra_phong_luc)) &&
  now - Date.parse(v.tra_phong_luc) > 30 * 60000;
export default function TheVeSinh({
  viec,
  token,
  now,
  onDone,
}: {
  viec: ViecVeSinh;
  token: string;
  now: number;
  onDone: () => void | Promise<void>;
}) {
  const [confirm,setConfirm]=useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (viec.trang_thai === "Đã hủy") return null;
  const done = viec.trang_thai === "Hoàn thành";
  async function finish() {
    if(busy)return;
    setBusy(true);
    setError("");
    try {
      await qlApi(token, "ve-sinh/" + viec.id, "PUT", {
        hanh_dong: "hoan-thanh",
      });
      setConfirm(false);
      await onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article
      className={
        "vs-card" +
        (quaHan(viec, now) ? " vs-overdue" : "") +
        (done ? " vs-done" : "")
      }
    >
      <div>
        <strong>{viec.ma_phong}</strong>
        {quaHan(viec, now) && (
          <span
            role="img"
            aria-label="Quá 30 phút chưa hoàn thành"
            title="Quá 30 phút sau checkout"
          >
            ⚠
          </span>
        )}
      </div>
      <time>Out · {luc(viec.tra_phong_luc)}</time>
      {!done && (
        <button
          type="button"
          disabled={busy || !viec.co_the_hoan_thanh}
          title={
            !viec.co_the_hoan_thanh
              ? "Chờ xác nhận khách đã trả phòng"
              : undefined
          }
          onClick={() => setConfirm(true)}
        >
          {busy ? "Đang xác nhận…" : "Xác nhận đã hoàn thành"}
        </button>
      )}
      {error && <p role="alert">{error}</p>}
      {confirm&&<HopThoaiKhach narrow title="Xác nhận hoàn thành" busy={busy} onClose={()=>{setConfirm(false);setError('')}}><p>Phòng <strong>{viec.ma_phong}</strong> đã hoàn thành vệ sinh?</p>{error&&<p role="alert">{error}</p>}<div className="ql-actions"><button type="button" disabled={busy} onClick={()=>setConfirm(false)}>Quay lại</button><button type="button" className="ql-primary" disabled={busy} onClick={()=>void finish()}>{busy?'Đang xác nhận…':'Xác nhận hoàn thành'}</button></div></HopThoaiKhach>}
    </article>
  );
}

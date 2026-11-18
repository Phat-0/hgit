import { useEffect, useState } from "react";
import { qlApi, luc } from "../khach-hang/api";
import "../khach-hang/quan-ly.css";
export default function VeSinh({ token }: { token: string }) {
  const [rows, setRows] = useState<any[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notes, setNotes] = useState<Record<string, string>>({}),
    [filter, setFilter] = useState("");
  async function load() {
    try {
      setRows(await qlApi(token, "ve-sinh"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 30000);
    return () => clearInterval(t);
  }, [token]);
  async function act(id: string, action: string) {
    setBusy(true);
    try {
      await qlApi(token, "ve-sinh/" + id, "PUT", {
        hanh_dong: action,
        noi_dung: notes[id] || "",
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="ql-page">
      <div className="ql-head">
        <h2>Vệ sinh</h2>
        <div className="ql-actions">
          <select
            aria-label="Trạng thái vệ sinh"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {["", "Chờ nhận", "Đã nhận", "Hoàn thành", "Đã hủy"].map((x) => (
              <option key={x} value={x}>
                {x || "Tất cả"}
              </option>
            ))}
          </select>
          <button onClick={() => void load()}>Làm mới</button>
        </div>
      </div>
      {error && <p className="ql-error">{error}</p>}
      <div className="ql-tasks">
        {rows
          .filter((v) => !filter || v.trang_thai === filter)
          .map((v) => (
            <article className="ql-card ql-task" key={v.id}>
              <div className="ql-head">
                <h3>{v.ma_phong}</h3>
                <span>{v.trang_thai}</span>
              </div>
              <p>
                {v.ten_homestay}
                <br />
                Checkout: {luc(v.tra_phong_luc)}
                <br />
                {v.nhan_vien || "Chưa có người nhận"}
              </p>
              {["Đã nhận", "Đang thực hiện", "Chờ kiểm tra"].includes(
                v.trang_thai,
              ) && (
                <textarea
                  aria-label={"Báo cáo " + v.ma_phong}
                  placeholder="Ghi chú hoàn tất vệ sinh…"
                  value={notes[v.id] || ""}
                  onChange={(e) =>
                    setNotes({ ...notes, [v.id]: e.target.value })
                  }
                />
              )}
              <div className="ql-actions">
                {v.trang_thai === "Chờ nhận" && (
                  <button
                    className="ql-primary"
                    disabled={busy}
                    onClick={() => void act(v.id, "nhan")}
                  >
                    Nhận việc
                  </button>
                )}
                {["Đã nhận", "Đang thực hiện", "Chờ kiểm tra"].includes(
                  v.trang_thai,
                ) && (
                  <button
                    disabled={busy || v.trang_thai_don !== "Đã trả phòng" || !v.co_the_hoan_thanh}
                    onClick={() => void act(v.id, "hoan-thanh")}
                  >
                    Hoàn tất vệ sinh
                  </button>
                )}
              </div>
            </article>
          ))}
      </div>
      {!rows.length && <p>Chưa có công việc</p>}
    </section>
  );
}

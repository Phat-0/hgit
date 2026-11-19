import { useEffect, useState } from "react";
import { qlApi } from "../khach-hang/api";
import TheVeSinh, { quaHan, type ViecVeSinh } from "./TheVeSinh";
import "../khach-hang/quan-ly.css";
export default function VeSinh({ token }: { token: string }) {
  const [rows, setRows] = useState<ViecVeSinh[]>([]),
    [error, setError] = useState(""),
    [tab, setTab] = useState<"pending" | "done">("pending"),
    [now, setNow] = useState(Date.now());
  async function load() {
    try {
      setRows(await qlApi(token, "ve-sinh"));
      setError("");
      setNow(Date.now());
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      setNow(Date.now());
      void load();
    }, 30000);
    return () => clearInterval(timer);
  }, [token]);
  const visible = rows
    .filter(
      (v) =>
        v.trang_thai !== "Đã hủy" &&
        (v.trang_thai === "Hoàn thành") === (tab === "done"),
    )
    .sort((a, b) =>
      tab === "pending"
        ? Number(quaHan(b, now)) - Number(quaHan(a, now)) ||
          Date.parse(a.tra_phong_luc) - Date.parse(b.tra_phong_luc)
        : Date.parse(b.hoan_thanh_luc || b.tra_phong_luc) -
          Date.parse(a.hoan_thanh_luc || a.tra_phong_luc),
    );
  return (
    <section className="ql-page vs-page" aria-label="Vệ sinh">
      <nav className="vs-tabs">
        {(
          [
            ["pending", "Chưa hoàn thành"],
            ["done", "Hoàn thành"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </nav>
      {error && (
        <p role="alert" className="ql-error">
          {error}
        </p>
      )}
      <div className="vs-grid">
        {visible.map((v) => (
          <TheVeSinh
            key={v.id}
            viec={v}
            token={token}
            now={now}
            onDone={load}
          />
        ))}
      </div>
      {!visible.length && <p>Chưa có công việc</p>}
    </section>
  );
}

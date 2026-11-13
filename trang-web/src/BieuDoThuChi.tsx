import { useMemo, useState } from "react";
import { vnd } from "./bao-cao-api";
import type { DongThuChi } from "./so-thu-chi";
type Option = {
  id: string;
  homestay_id?: string;
  ten_homestay?: string;
  ten_phong?: string;
};
export default function BieuDoThuChi({
  rows,
  branches,
  rooms,
}: {
  rows: DongThuChi[];
  branches: Option[];
  rooms: Option[];
}) {
  const [branch, setBranch] = useState(""),
    [room, setRoom] = useState(""),
    [group, setGroup] = useState("ngay"),
    [sort, setSort] = useState("ngay"),
    [percent, setPercent] = useState(false),
    [income, setIncome] = useState(
      () => localStorage.getItem("thu-chi:mau-thu") || "#42b69a",
    ),
    [expense, setExpense] = useState(
      () => localStorage.getItem("thu-chi:mau-chi") || "#b16bd4",
    );
  const filtered = rows.filter(
    (r) =>
      (!branch || r.homestay_id === branch) && (!room || r.phong_id === room),
  );
  const data = useMemo(() => {
    const map = new Map<
      string,
      { key: string; label: string; thu: number; chi: number }
    >();
    for (const r of filtered) {
      const key =
        group === "tong"
          ? "Tổng"
          : group === "chi_nhanh"
            ? r.homestay_id || "chung"
            : group === "phong"
              ? r.phong_id || "chung"
              : r.ngay;
      const label =
        group === "chi_nhanh"
          ? branches.find((b) => b.id === key)?.ten_homestay ||
            "Toàn hệ thống / chưa gán"
          : group === "phong"
            ? rooms.find((p) => p.id === key)?.ten_phong || "Chưa gán phòng"
            : key;
      const d = map.get(key) || { key, label, thu: 0, chi: 0 };
      if (Number(r.so_tien) > 0) d.thu += Number(r.so_tien);
      else d.chi += Math.abs(Number(r.so_tien));
      map.set(key, d);
    }
    return [...map.values()].sort((a, b) =>
      sort === "lon"
        ? b.thu + b.chi - (a.thu + a.chi)
        : sort === "be"
          ? a.thu + a.chi - (b.thu + b.chi)
          : a.label.localeCompare(b.label, "vi"),
    );
  }, [rows, branch, room, group, sort, branches, rooms]);
  const thu = data.reduce((s, d) => s + d.thu, 0),
    chi = data.reduce((s, d) => s + d.chi, 0),
    total = thu + chi,
    max = Math.max(1, ...data.map((d) => Math.max(d.thu, d.chi))),
    ratio = total ? (thu / total) * 100 : 0;
  const text = (n: number) =>
    percent ? (total ? ((n / total) * 100).toFixed(1) : "0") + "%" : vnd(n);
  return (
    <section className="stc-charts">
      <header>
        <h2>Biểu đồ thu chi</h2>
        <div className="stc-tools">
          <select
            aria-label="Chi nhánh biểu đồ"
            value={branch}
            onChange={(e) => {
              setBranch(e.target.value);
              setRoom("");
            }}
          >
            <option value="">Tất cả chi nhánh</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.ten_homestay}
              </option>
            ))}
          </select>
          <select
            aria-label="Phòng biểu đồ"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          >
            <option value="">Tất cả phòng</option>
            {rooms
              .filter((p) => !branch || p.homestay_id === branch)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.ten_phong}
                </option>
              ))}
          </select>
          <select
            aria-label="Nhóm biểu đồ"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
          >
            <option value="ngay">Theo ngày</option>
            <option value="chi_nhanh">Theo chi nhánh</option>
            <option value="phong">Theo phòng</option>
            <option value="tong">Tổng thu chi</option>
          </select>
          <select
            aria-label="Sắp xếp biểu đồ"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="ngay">Ngày / tên</option>
            <option value="lon">Lớn → bé</option>
            <option value="be">Bé → lớn</option>
          </select>
          <label>
            <input
              type="checkbox"
              checked={percent}
              onChange={(e) => setPercent(e.target.checked)}
            />
            Hiện %
          </label>
          <label>
            Thu
            <input
              type="color"
              aria-label="Màu biểu đồ thu"
              value={income}
              onChange={(e) => {
                setIncome(e.target.value);
                localStorage.setItem("thu-chi:mau-thu", e.target.value);
              }}
            />
          </label>
          <label>
            Chi
            <input
              type="color"
              aria-label="Màu biểu đồ chi"
              value={expense}
              onChange={(e) => {
                setExpense(e.target.value);
                localStorage.setItem("thu-chi:mau-chi", e.target.value);
              }}
            />
          </label>
        </div>
      </header>
      <div className="stc-chart-grid">
        <figure>
          <figcaption>
            Thu / chi · {percent ? "% tổng dòng tiền" : "VND"}
          </figcaption>
          <div className="stc-bars-scroll">
            <div
              className="stc-bars"
              style={{
                gridTemplateColumns: `repeat(${Math.max(1, data.length)},minmax(176px,1fr))`,
                minWidth: Math.max(260, data.length * 176),
              }}
            >
              {data.map((d) => (
                <div key={d.key} className="stc-bar-pair">
                  <div className="stc-bar-space">
                    {[
                      ["thu", d.thu, income],
                      ["chi", d.chi, expense],
                    ].map(([kind, n, color]) => (
                      <div
                        key={kind}
                        title={d.label + " · " + kind + ": " + vnd(n)}
                        className="stc-money-bar"
                        style={{
                          height: (Number(n) / max) * 160,
                          background: String(color),
                        }}
                      >
                        <span>{text(Number(n))}</span>
                      </div>
                    ))}
                  </div>
                  <small title={d.label}>{d.label}</small>
                </div>
              ))}
            </div>
          </div>
          {!data.length && <p>Chưa có thu chi trong phạm vi đã chọn.</p>}
        </figure>
        <figure>
          <figcaption>Cơ cấu tổng thu / chi</figcaption>
          <div
            className="stc-pie"
            role="img"
            aria-label={"Thu " + text(thu) + "; Chi " + text(chi)}
            style={{
              background: total
                ? `conic-gradient(${income} 0 ${ratio}%,${expense} ${ratio}% 100%)`
                : "#e9e3ef",
            }}
          >
            <span>{percent ? (total ? "100%" : "0%") : vnd(total)}</span>
          </div>
          <p>
            <i style={{ background: income }} />
            Thu: {text(thu)} · {ratio.toFixed(1)}%
          </p>
          <p>
            <i style={{ background: expense }} />
            Chi: {text(chi)} · {(total ? 100 - ratio : 0).toFixed(1)}%
          </p>
          <small>
            % tính trên tổng thu + trị tuyệt đối chi, không gồm tiền tồn.
          </small>
        </figure>
      </div>
    </section>
  );
}

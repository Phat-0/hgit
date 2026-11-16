import { vnd } from "./bao-cao-api";
import "./bieu-do-doanh-thu.css";
export type CotDoanhThu = {
  key: string;
  label: string;
  money: number;
  count: number;
};
const gon = (n: number) =>
  n >= 1e9
    ? (n / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + " tỷ"
    : n >= 1e6
      ? (n / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + " tr"
      : n >= 1000
        ? (n / 1000).toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + "k"
        : String(n);
export default function BieuDoDoanhThu({
  data,
  label,
  onSelect,
}: {
  data: CotDoanhThu[];
  label: string;
  onSelect?: (key: string) => void;
}) {
  const max = Math.max(1, ...data.map((d) => d.money));
  return (
    <figure className="dt-chart" aria-label={label}>
      <figcaption>{label}</figcaption>
      <div className="dt-chart-body">
        <div className="dt-axis">
          {[1, 0.75, 0.5, 0.25, 0].map((n) => (
            <span key={n}>{gon(Math.round(max * n))} đ</span>
          ))}
        </div>
        <div className="dt-chart-scroll">
          <div
            className="dt-columns"
            style={{
              gridTemplateColumns: `repeat(${Math.max(1, data.length)},minmax(84px,1fr))`,
              minWidth: Math.max(280, data.length * 84),
            }}
          >
            {data.map((d) => (
              <button
                type="button"
                key={d.key}
                className="dt-column"
                title={d.label + " · " + d.count + " đơn · " + vnd(d.money)}
                onClick={() => onSelect?.(d.key)}
              >
                <span className="dt-plot">
                  <span
                    className="dt-bar"
                    style={{ height: (d.money / max) * 170 }}
                  >
                    <span className="dt-money">{gon(d.money)} đ</span>
                  </span>
                  <span
                    className={
                      "dt-count " + (d.money === 0 ? "dt-count-zero" : "")
                    }
                  >
                    {d.count}
                  </span>
                </span>
                <span className="dt-label">{d.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <small>
        Độ cao: doanh thu · Dưới cột: số đơn · Trỏ chuột để xem số tiền đầy đủ.
      </small>
      {!data.length && <p>Chưa có dữ liệu trong khoảng này.</p>}
    </figure>
  );
}

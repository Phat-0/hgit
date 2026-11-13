import { useEffect, useState } from "react";
import { quanTriApi, lucVN, type Review } from "./bao-cao-api";
import ChiTietDonLich from "./ChiTietDonLich";
import "./bao-cao.css";
export default function DanhGia({
  token,
  initial,
}: {
  token: string;
  initial?: { tu_ngay?: string; den_ngay?: string };
}) {
  const [q, setQ] = useState(""),
    [stars, setStars] = useState(""),
    [start, setStart] = useState(initial?.tu_ngay || ""),
    [end, setEnd] = useState(initial?.den_ngay || ""),
    [rows, setRows] = useState<Review[]>([]),
    [error, setError] = useState(""),
    [id, setId] = useState("");
  useEffect(() => {
    const ac = new AbortController();
    const timer = setTimeout(() => {
      setError("");
      void quanTriApi<Review[]>(
        token,
        "danh-gia?" +
          new URLSearchParams({
            tim_kiem: q,
            so_sao: stars,
            tu_ngay: start,
            den_ngay: end,
          }),
      )
        .then((x) => {
          if (!ac.signal.aborted) setRows(x);
        })
        .catch((e) => {
          if (!ac.signal.aborted) setError(e.message);
        });
    }, 200);
    return () => {
      ac.abort();
      clearTimeout(timer);
    };
  }, [token, q, stars, start, end]);
  return (
    <section className="bc-page">
      <div className="bc-toolbar">
        <input
          aria-label="Tìm đánh giá"
          placeholder="Tên khách, phòng, nội dung…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          aria-label="Số sao"
          value={stars}
          onChange={(e) => setStars(e.target.value)}
        >
          <option value="">Tất cả số sao</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
        <label>
          Từ ngày
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label>
          Đến ngày
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="bc-card dg-list">
        <h2>
          Đánh giá khách hàng{" "}
          <small>
            ({rows.length}
            {rows.length === 300 ? " gần nhất" : ""})
          </small>
        </h2>
        {rows.map((r) => (
          <article key={r.id}>
            <header>
              <strong>{r.ho_ten || "Khách hàng"}</strong>
              <span>
                {"★".repeat(r.so_sao)} · {r.so_sao}/5
              </span>
              <time>{lucVN(r.ngay_tao)}</time>
            </header>
            <p>{r.noi_dung || "Khách không để lại nhận xét."}</p>
            <footer>
              <span>
                {r.ten_homestay} · {r.ten_phong} · {r.trang_thai}
              </span>
              <button onClick={() => setId(r.dat_phong_id)}>
                Xem đơn {r.ma_dat_phong?.slice(-8)}
              </button>
            </footer>
          </article>
        ))}
        {!rows.length && <p>Chưa có đánh giá phù hợp.</p>}
      </div>
      {id && (
        <ChiTietDonLich
          id={id}
          token={token}
          readOnly
          onClose={() => setId("")}
          onChanged={async () => {}}
        />
      )}
    </section>
  );
}

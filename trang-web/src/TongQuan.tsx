import { useEffect, useState } from "react";
import {
  quanTriApi,
  vnd,
  ngayVN,
  lucVN,
  type Overview,
  type Go,
} from "./bao-cao-api";
import "./bao-cao.css";
export default function TongQuan({ token, onGo }: { token: string; onGo: Go }) {
  const [data, setData] = useState<Overview | null>(null),
    [error, setError] = useState(""),
    [month, setMonth] = useState(ngayVN().slice(0, 7));
  useEffect(() => {
    let active = true;
    setError("");
    void quanTriApi<Overview>(token, "tong-quan-moi?thang=" + month)
      .then((x) => {
        if (active) setData(x);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [token, month]);
  if (!data) return <p role="status">{error || "Đang tải tổng quan…"}</p>;
  const total = data.theo_ngay.reduce((s, d) => s + Number(d.doanh_thu), 0),
    from = month + "-01",
    end = data.theo_ngay.at(-1)?.ngay || ngayVN();
  const report = () => onGo("bao-cao", { tu_ngay: from, den_ngay: end });
  const stats = [
    {
      name: "Homestay / Phòng",
      value: data.tong_homestay + " / " + data.tong_phong,
      note: "Chi nhánh / tổng phòng",
      go: report,
    },
    {
      name: "Doanh thu tháng",
      value: vnd(total),
      note:
        (Number(data.chenh_lech_hom_qua) > 0 ? "+" : "") +
        vnd(data.chenh_lech_hom_qua) +
        " so với hôm qua",
      go: report,
    },
    {
      name: "Đơn đặt phòng",
      value: data.tong_dat_phong,
      note: "Tổng số đơn",
      go: report,
    },
    {
      name: "Người dùng",
      value: data.tong_nguoi_dung,
      note: "Tổng tài khoản",
      go: report,
    },
    {
      name: "Đánh giá",
      value: data.tong_danh_gia,
      note: data.danh_gia_tuan + " đánh giá mới tuần này",
      go: () => onGo("danh-gia"),
    },
  ];
  return (
    <section className="bc-page tq-page">
      <div className="bc-toolbar">
        <label>
          Tháng thống kê{" "}
          <input
            type="month"
            value={month}
            onChange={(e) => {
              if (e.target.value) setMonth(e.target.value);
            }}
          />
        </label>
        {error && <p role="alert">{error}</p>}
      </div>
      <div className="tq-stats">
        {stats.map((s) => (
          <button key={s.name} onClick={s.go}>
            <span>{s.name}</span>
            <strong>{s.value}</strong>
            <small>{s.note}</small>
          </button>
        ))}
      </div>
      <div className="tq-main">
        <section className="bc-card">
          <h2>Thống kê đặt phòng</h2>
          <p>
            Số đơn và doanh thu theo ngày tạo đơn · bấm ngày để xem đánh giá
            ngày đó
          </p>
          <div className="tq-chart">
            {data.theo_ngay.map((d) => (
              <button
                key={d.ngay}
                title={d.ngay + ": " + d.so_don + " đơn · " + vnd(d.doanh_thu)}
                onClick={() =>
                  onGo("danh-gia", { tu_ngay: d.ngay, den_ngay: d.ngay })
                }
              >
                <span className="tq-bars">
                  <i
                    style={{
                      height: Math.max(
                        2,
                        (d.so_don /
                          Math.max(1, ...data.theo_ngay.map((x) => x.so_don))) *
                          120,
                      ),
                    }}
                  />
                  <i
                    style={{
                      height: Math.max(
                        2,
                        (Number(d.doanh_thu) /
                          Math.max(
                            1,
                            ...data.theo_ngay.map((x) => Number(x.doanh_thu)),
                          )) *
                          120,
                      ),
                    }}
                  />
                </span>
                <strong>{d.so_don} đơn</strong>
                <small>{vnd(d.doanh_thu)}</small>
                <span>{d.ngay.slice(8)}</span>
              </button>
            ))}
          </div>
          <small>
            Tím: số đơn · Hồng: doanh thu; mỗi chuỗi có thang đo riêng.
          </small>
          <button onClick={report}>Xem báo cáo chi tiết →</button>
        </section>
        <section className="bc-card">
          <h2>Đánh giá mới nhất</h2>
          {data.danh_gia_moi.map((r) => (
            <button
              className="tq-review"
              key={r.id}
              onClick={() => onGo("danh-gia")}
            >
              <strong>
                {r.ho_ten || "Khách hàng"} · {r.so_sao}/5 ★
              </strong>
              <span>{r.noi_dung || "Không có nhận xét"}</span>
              <small>
                {r.ten_phong} · {lucVN(r.ngay_tao)}
              </small>
            </button>
          ))}
          {!data.danh_gia_moi.length && <p>Chưa có đánh giá.</p>}
        </section>
      </div>
      <div className="tq-main">
        <section className="bc-card">
          <h2>Lượt đặt phòng và hủy trong tháng</h2>
          <div className="tq-counts">
            <strong>
              Đặt {data.theo_ngay.reduce((s, x) => s + x.so_don, 0)}
            </strong>
            <strong>
              Hủy {data.theo_ngay.reduce((s, x) => s + x.so_huy, 0)}
            </strong>
          </div>
          {data.theo_kieu.map((k) => (
            <button
              className="tq-review"
              key={k.ten}
              onClick={() => onGo("dat-phong")}
            >
              <strong>{k.ten === "Theo đêm" ? "Qua đêm" : k.ten}</strong>
              <span>
                {k.so_don} đơn · {k.so_huy} hủy · {vnd(k.doanh_thu)}
              </span>
            </button>
          ))}
          <button onClick={() => onGo("dat-phong")}>
            Xem các đơn đặt phòng →
          </button>
        </section>
        <section className="bc-card">
          <h2>Đơn đặt phòng mới nhất trong tháng</h2>
          {data.don.slice(0, 6).map((d) => (
            <button
              key={d.id}
              className="tq-review"
              onClick={() => onGo("dat-phong", { don_id: d.id })}
            >
              <strong>
                {d.ten_khach} · {d.ten_phong}
              </strong>
              <span>
                {d.hinh_thuc_dat} · {vnd(d.tong_tien)}
              </span>
              <small>
                Đặt lúc {lucVN(d.ngay_tao)} · Nhận {lucVN(d.nhan_phong_luc)}
              </small>
            </button>
          ))}
          {!data.don.length && <p>Chưa có đơn trong tháng đã chọn.</p>}
        </section>
      </div>
    </section>
  );
}

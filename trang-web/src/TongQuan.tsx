import { useEffect, useState } from "react";
import {
  quanTriApi,
  vnd,
  ngayVN,
  lucVN,
  type Overview,
  type Go,
} from "./bao-cao-api";
import BieuDoDoanhThu from "./BieuDoDoanhThu";
import "./tong-quan-noi-dung.css";
export default function TongQuan({ token, onGo }: { token: string; onGo: Go }) {
  const [data, setData] = useState<Overview | null>(null),
    [error, setError] = useState("");
  const month = ngayVN().slice(0, 7);
  useEffect(() => {
    let live = true;
    void quanTriApi<Overview>(token, "tong-quan-moi?thang=" + month)
      .then((x) => {
        if (live) setData(x);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [token, month]);
  if (!data) return <p role="status">{error || "Đang tải tổng quan…"}</p>;
  const goReport = () =>
    onGo("bao-cao", { tu_ngay: month + "-01", den_ngay: ngayVN() });
  const stats = [
    {
      ten: "Homestay / Phòng",
      so: data.tong_homestay + " / " + data.tong_phong,
      icon: "⌂",
      tone: "violet",
      note: "Chi nhánh / tổng phòng",
      go: goReport,
    },
    {
      ten: "Doanh thu tháng",
      so: vnd(data.theo_ngay.reduce((n, d) => n + Number(d.doanh_thu), 0)),
      icon: "▤",
      tone: "blue",
      note:
        (Number(data.chenh_lech_hom_qua) > 0 ? "+" : "") +
        vnd(data.chenh_lech_hom_qua) +
        " so với hôm qua",
      go: goReport,
    },
    {
      ten: "Đơn đặt phòng",
      so: data.tong_dat_phong,
      icon: "▣",
      tone: "pink",
      note: "Tổng số đơn",
      go: goReport,
    },
    {
      ten: "Người dùng",
      so: data.tong_nguoi_dung,
      icon: "♙",
      tone: "green",
      note: "Tổng tài khoản",
      go: goReport,
    },
    {
      ten: "Đánh giá",
      so: Number(data.sao_trung_binh||0).toLocaleString('vi-VN')+' / 5',
      icon: "◷",
      tone: "orange",
      note: data.tong_danh_gia+" đánh giá · "+data.danh_gia_tuan + " mới tuần này",
      go: () => onGo("danh-gia"),
    },
  ];
  return (
    <section className="qt-overview-content">
      {error && <p role="alert">{error}</p>}
      <div className="qt-stats">
        {stats.map((s, i) => (
          <article
            role="button"
            tabIndex={0}
            onClick={s.go}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                s.go();
              }
            }}
            className={"qt-stat qt-tone-" + s.tone}
            key={s.ten}
            style={{ animationDelay: i * 80 + "ms" }}
          >
            <div className="qt-stat-icon">{s.icon}</div>
            <p>{s.ten}</p>
            <strong>{s.so}</strong>
            <span className="qt-stat-foot">{s.note}</span>
          </article>
        ))}
      </div>
      <div className="qt-main-grid">
        <section className="qt-chart-card">
          <div className="qt-card-head">
            <h2>
              <span className="qt-heading-icon">▣</span> Thống kê đặt phòng
            </h2>
            <button onClick={goReport}>Báo cáo →</button>
          </div>
          <BieuDoDoanhThu
            label={
              "Doanh thu và số đơn · " + month.split("-").reverse().join("/")
            }
            data={data.theo_ngay.map((d) => ({
              key: d.ngay,
              label: d.ngay.slice(8),
              money: Number(d.doanh_thu),
              count: d.so_don,
            }))}
            onSelect={(day) =>
              onGo("danh-gia", { tu_ngay: day, den_ngay: day })
            }
          />
        </section>
        <section className="qt-side-card qt-status-card">
          <div className="qt-card-head">
            <h2>
              <span className="qt-heading-icon">◉</span> Đánh giá mới nhất
            </h2>
          </div>
          <div className="qt-new-reviews">
            {data.danh_gia_moi.map((r) => (
              <button key={r.id} onClick={() => onGo("danh-gia")}>
                <span className="qt-review-avatar">
                  {(r.ho_ten || "K").slice(0, 1)}
                </span>
                <span>
                  <strong>{r.ho_ten || "Khách hàng"}</strong>
                  <small>{"★".repeat(r.so_sao)}</small>
                  <p>{r.noi_dung || "Không có nhận xét"}</p>
                  <time>{lucVN(r.ngay_tao)}</time>
                </span>
              </button>
            ))}
            {!data.danh_gia_moi.length && <p>Chưa có đánh giá.</p>}
          </div>
        </section>
      </div>
      <div className="qt-bottom-grid">
        <section className="qt-recent-card">
          <div className="qt-recent-title">
            <h2>
              <span className="qt-heading-icon orange-icon">⌂</span> Lượt đặt /
              hủy trong tháng
            </h2>
            <button onClick={() => onGo("dat-phong")}>Xem tất cả →</button>
          </div>
          <div className="qt-kind-counts">
            {[
              ["Theo giờ", "◷"],
              ["Theo ngày", "☀"],
              ["Theo đêm", "☾"],
            ].map(([kind, icon]) => {
              const row = data.theo_kieu.find((x) => x.ten === kind);
              return (
                <button key={kind} onClick={() => onGo("dat-phong")}>
                  <i>{icon}</i>
                  <strong>{kind === "Theo đêm" ? "Qua đêm" : kind}</strong>
                  <span>
                    <b>{row?.so_don || 0}</b> lượt đặt
                  </span>
                  <small>{row?.so_huy || 0} lượt hủy</small>
                </button>
              );
            })}
          </div>
        </section>
        <section className="qt-recent-card">
          <div className="qt-recent-title">
            <h2>
              <span className="qt-heading-icon">▣</span> Đơn đặt phòng mới nhất
            </h2>
            <button onClick={() => onGo("dat-phong")}>Xem tất cả →</button>
          </div>
          <div className="qt-new-orders">
            {data.don.slice(0, 5).map((d) => (
              <button
                key={d.id}
                onClick={() => onGo("dat-phong", { don_id: d.id })}
              >
                <span className="qt-order-avatar">▣</span>
                <span className="qt-order-copy">
                  <strong>
                    {d.ten_khach} · {d.ten_phong}
                  </strong>
                  <span>
                    {d.hinh_thuc_dat} · {vnd(d.tong_tien)}
                  </span>
                  <small>
                    {lucVN(d.nhan_phong_luc)} → {lucVN(d.tra_phong_luc)}
                  </small>
                </span>
                <time title="Thời gian tạo đơn">{lucVN(d.ngay_tao)}</time>
              </button>
            ))}
            {!data.don.length && <p>Chưa có đơn trong tháng.</p>}
          </div>
        </section>
      </div>
    </section>
  );
}

import { useEffect, useState } from "react";
import {
  quanTriApi,
  vnd,
  ngayVN,
  lucVN,
  type Report,
  type Go,
} from "./bao-cao-api";
import "./bao-cao.css";
export default function BaoCao({
  token,
  initial,
  onGo,
}: {
  token: string;
  initial?: { tu_ngay?: string; den_ngay?: string };
  onGo: Go;
}) {
  const [start, setStart] = useState(
      initial?.tu_ngay || ngayVN().slice(0, 7) + "-01",
    ),
    [end, setEnd] = useState(initial?.den_ngay || ngayVN()),
    [branch, setBranch] = useState(""),
    [data, setData] = useState<Report | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setError("");
    void quanTriApi<Report>(
      token,
      "bao-cao?" +
        new URLSearchParams({
          tu_ngay: start,
          den_ngay: end,
          homestay_id: branch,
        }),
    )
      .then((x) => {
        if (active) setData(x);
      })
      .catch((e) => {
        if (active) {
          setData(null);
          setError(e.message);
        }
      });
    return () => {
      active = false;
    };
  }, [token, start, end, branch]);
  const sum = (
    key:
      | "so_don"
      | "so_huy"
      | "doanh_thu"
      | "tien_phong"
      | "tien_dich_vu"
      | "tien_giam",
  ) => data?.theo_ngay.reduce((s, d) => s + Number(d[key]), 0) || 0;
  function csv() {
    if (!data) return;
    const cell = (x: unknown) =>
      '"' +
      String(x)
        .replace(/^[=+@-]/, "'$&")
        .replace(/"/g, '""') +
      '"';
    const contents =
      "\ufeff" +
      [
        ["Ngày", "Số đơn", "Hủy", "Doanh thu", "Tiền phòng", "Dịch vụ", "Giảm"],
        ...data.theo_ngay.map((d) => [
          d.ngay,
          d.so_don,
          d.so_huy,
          d.doanh_thu,
          d.tien_phong,
          d.tien_dich_vu,
          d.tien_giam,
        ]),
      ]
        .map((row) => row.map(cell).join(","))
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([contents], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "bao-cao-" + start + "-" + end + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section className="bc-page">
      <div className="bc-toolbar">
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
        <select
          aria-label="Chi nhánh báo cáo"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
        >
          <option value="">Tất cả chi nhánh</option>
          {data?.chi_nhanh.map((b) => (
            <option key={b.id} value={b.id}>
              {b.ten_homestay}
            </option>
          ))}
        </select>
        <button onClick={csv} disabled={!data}>
          Xuất CSV theo ngày
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {data && (
        <>
          <div className="tq-stats">
            {[
              ["Số đơn", sum("so_don")],
              ["Đơn hủy", sum("so_huy")],
              ["Doanh thu đặt phòng", vnd(sum("doanh_thu"))],
              ["Tiền đã thu", vnd(data.da_thu)],
              [
                "Giá trị trung bình/đơn",
                vnd(
                  Math.round(
                    sum("doanh_thu") /
                      Math.max(
                        1,
                        data.theo_trang_thai
                          .filter((s) =>
                            [
                              "Đã xác nhận",
                              "Đã nhận phòng",
                              "Đã trả phòng",
                            ].includes(s.ten),
                          )
                          .reduce((n, s) => n + s.so_don, 0),
                      ),
                  ),
                ),
              ],
            ].map(([k, v]) => (
              <button key={k} onClick={() => onGo("dat-phong")}>
                <span>{k}</span>
                <strong>{v}</strong>
              </button>
            ))}
          </div>
          <div className="tq-stats">
            {[
              ["Homestay", data.tong_quan.tong_homestay],
              ["Phòng", data.tong_quan.tong_phong],
              ["Tài khoản toàn hệ thống", data.tong_quan.tong_nguoi_dung],
              ["Tài khoản mới trong kỳ", data.tong_quan.nguoi_dung_moi],
              [
                "Tỷ lệ hủy",
                ((sum("so_huy") / Math.max(1, sum("so_don"))) * 100).toFixed(
                  1,
                ) + "%",
              ],
            ].map(([label, value]) => (
              <button
                key={label}
                onClick={() =>
                  onGo("bao-cao", { tu_ngay: start, den_ngay: end })
                }
              >
                <span>{label}</span>
                <strong>{value}</strong>
              </button>
            ))}
          </div>
          <section className="bc-card">
            <h2>Đánh giá trong kỳ</h2>
            {[5, 4, 3, 2, 1].map((star) => (
              <button
                className="tq-review"
                key={star}
                onClick={() =>
                  onGo("danh-gia", { tu_ngay: start, den_ngay: end })
                }
              >
                {star} ★ ·{" "}
                {data.danh_gia_theo_sao.find((r) => r.sao === star)?.so_luong ||
                  0}{" "}
                đánh giá
              </button>
            ))}
          </section>
          <p>
            Doanh thu tính theo ngày tạo đơn đã xác nhận, đã nhận hoặc đã trả
            phòng; gồm tiền phòng + dịch vụ − giảm giá. Tiền đã thu chỉ cộng
            giao dịch đã xác nhận, theo ngày giao dịch. Nhãn “Đã thanh toán” của
            đơn không tự sinh giao dịch thu tiền.
          </p>
          <div className="tq-main">
            {[
              ["Theo kiểu đặt", data.theo_kieu],
              ["Theo chi nhánh", data.theo_chi_nhanh],
              ["Theo trạng thái", data.theo_trang_thai],
              ["Theo phòng", data.theo_phong],
              ["Theo thanh toán", data.theo_thanh_toan],
            ].map(([label, raw]) => (
              <section className="bc-card" key={String(label)}>
                <h2>{String(label)}</h2>
                {(raw as Report["theo_kieu"]).map((g) => (
                  <button
                    className="tq-review"
                    key={g.ten}
                    onClick={() => onGo("dat-phong")}
                  >
                    <strong>{g.ten}</strong>
                    <span>
                      {g.so_don} đơn · {g.so_huy} hủy · {vnd(g.doanh_thu)}
                    </span>
                  </button>
                ))}
              </section>
            ))}
          </div>
          <section className="bc-card">
            <h2>Chi tiết theo ngày</h2>
            <div className="bc-table">
              <table>
                <thead>
                  <tr>
                    {[
                      "Ngày",
                      "Đơn",
                      "Hủy",
                      "Tiền phòng",
                      "Dịch vụ",
                      "Giảm",
                      "Doanh thu",
                      "Liên kết",
                    ].map((s) => (
                      <th key={s}>{s}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.theo_ngay.map((d) => (
                    <tr key={d.ngay}>
                      <td>{d.ngay.split("-").reverse().join("/")}</td>
                      <td>{d.so_don}</td>
                      <td>{d.so_huy}</td>
                      <td>{vnd(d.tien_phong)}</td>
                      <td>{vnd(d.tien_dich_vu)}</td>
                      <td>{vnd(d.tien_giam)}</td>
                      <td>{vnd(d.doanh_thu)}</td>
                      <td>
                        <button
                          onClick={() =>
                            onGo("danh-gia", {
                              tu_ngay: d.ngay,
                              den_ngay: d.ngay,
                            })
                          }
                        >
                          Đánh giá
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="bc-card">
            <h2>Đơn trong kỳ · tối đa 300 đơn mới nhất</h2>
            <div className="bc-table">
              <table>
                <thead>
                  <tr>
                    {[
                      "Khách / mã",
                      "Phòng / kiểu đặt",
                      "Đặt lúc",
                      "Nhận / trả",
                      "Tổng",
                      "Trạng thái",
                    ].map((x) => (
                      <th key={x}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.don.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <button
                          onClick={() => onGo("dat-phong", { don_id: d.id })}
                        >
                          {d.ten_khach} · {d.ma_dat_phong.slice(-8)}
                        </button>
                      </td>
                      <td>
                        {d.ten_phong} · {d.hinh_thuc_dat}
                      </td>
                      <td>{lucVN(d.ngay_tao)}</td>
                      <td>
                        {lucVN(d.nhan_phong_luc)} → {lucVN(d.tra_phong_luc)}
                      </td>
                      <td>{vnd(d.tong_tien)}</td>
                      <td>{d.trang_thai}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </section>
  );
}

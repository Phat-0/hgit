import { useEffect, useState } from "react";
import { qlApi, luc } from "../khach-hang/api";
import "../khach-hang/quan-ly.css";
export default function LichSu({ token }: { token: string }) {
  const [q, setQ] = useState({
      tu: "",
      den: "",
      nhom: "",
      tim: "",
      trang: "1",
    }),
    [data, setData] = useState<any>({ dong: [], tong_so: 0 }),
    [error, setError] = useState(""),
    [rev, setRev] = useState(0);
  useEffect(() => {
    let active = true;
    const t = setTimeout(
      () =>
        void qlApi(token, "lich-su?" + new URLSearchParams(q))
          .then((x) => {
            if (active) {
              setData(x);
              setError("");
            }
          })
          .catch((e) => {
            if (active) setError(e.message);
          }),
      200,
    );
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [q, token, rev]);
  function filter(k: string, v: string) {
    setQ({ ...q, [k]: v, trang: "1" });
  }
  return (
    <section className="ql-page">
      <div className="ql-head">
        <h2>Lịch sử</h2>
        <button onClick={() => setRev((v) => v + 1)}>Làm mới</button>
      </div>
      {error && <p className="ql-error">{error}</p>}
      <div className="ql-tools">
        <input
          aria-label="Tìm lịch sử"
          placeholder="Thao tác, người thực hiện…"
          value={q.tim}
          onChange={(e) => filter("tim", e.target.value)}
        />
        <select
          aria-label="Loại lịch sử"
          value={q.nhom}
          onChange={(e) => filter("nhom", e.target.value)}
        >
          {[
            "",
            "Hệ thống",
            "Đăng nhập",
            "Đơn đặt phòng",
            "Trạng thái đơn",
            "Thu chi",
            "AI",
          ].map((x) => (
            <option key={x} value={x}>
              {x || "Tất cả lịch sử"}
            </option>
          ))}
        </select>
        <input
          aria-label="Lịch sử từ ngày"
          type="date"
          value={q.tu}
          onChange={(e) => filter("tu", e.target.value)}
        />
        <input
          aria-label="Lịch sử đến ngày"
          type="date"
          value={q.den}
          onChange={(e) => filter("den", e.target.value)}
        />
      </div>
      <div className="ql-table">
        <table>
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Nhóm</th>
              <th>Người thực hiện</th>
              <th>Thao tác</th>
              <th>Nội dung</th>
            </tr>
          </thead>
          <tbody>
            {data.dong.map((x: any) => (
              <tr key={x.nhom + x.id}>
                <td>{luc(x.ngay_tao)}</td>
                <td>{x.nhom}</td>
                <td>{x.nguoi_thuc_hien || "Hệ thống / chưa xác định"}</td>
                <td>
                  {x.hanh_dong}
                  <small>{x.ten_bang}</small>
                </td>
                <td>
                  <details>
                    <summary>Xem</summary>
                    <pre>{JSON.stringify(x.du_lieu, null, 2)}</pre>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.dong.length && <p>Chưa có lịch sử phù hợp</p>}
      </div>
      <div
        className="ql-actions"
        style={{ justifyContent: "flex-end", marginTop: 12 }}
      >
        <button
          disabled={q.trang === "1"}
          onClick={() => setQ({ ...q, trang: String(+q.trang - 1) })}
        >
          Trước
        </button>
        <span>
          {q.trang} / {Math.max(1, Math.ceil(data.tong_so / 50))}
        </span>
        <button
          disabled={+q.trang * 50 >= data.tong_so}
          onClick={() => setQ({ ...q, trang: String(+q.trang + 1) })}
        >
          Sau
        </button>
      </div>
    </section>
  );
}

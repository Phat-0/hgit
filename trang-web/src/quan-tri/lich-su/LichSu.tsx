import { useEffect, useState } from "react";
import { qlApi, luc } from "../khach-hang/api";
import "../khach-hang/quan-ly.css";
import "./lich-su.css";
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
    <section className="ql-page ls-page">
      <div className="ql-head">
        <h2>Lịch sử</h2>
        <button onClick={() => setRev((v) => v + 1)}>Làm mới</button>
      </div>
      {error && <p className="ql-error">{error}</p>}
      <div className="ql-tools">
        <input
          aria-label="Tìm lịch sử"
          placeholder="Thao tác, đối tượng, người thực hiện…"
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
          <colgroup>
            <col style={{ width: 150 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 150 }} />
            <col style={{ width: 230 }} />
            <col style={{ width: 250 }} />
            <col style={{ width: 85 }} />
          </colgroup>
          <thead>
            <tr>
              <th>Thời gian</th>
              <th>Nhóm</th>
              <th>Người thực hiện</th>
              <th>Thao tác</th>
              <th>Đối tượng</th>
              <th>Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {data.dong.map((x: any) => (
              <tr key={x.nhom + x.id}>
                <td>{luc(x.ngay_tao)}</td>
                <td>{x.nhom}</td>
                <td>{x.nguoi_thuc_hien || "Hệ thống / chưa xác định"}</td>
                <td>
                  <strong>{x.thao_tac || x.hanh_dong}</strong>
                  {x.tom_tat && (
                    <small className="ls-summary">{x.tom_tat}</small>
                  )}
                </td>
                <td>{x.doi_tuong || x.ten_bang}</td>
                <td>
                  <details>
                    <summary>Xem</summary>
                    <dl>
                      {(x.thay_doi || []).map((v: any, i: number) => (
                        <div key={i}>
                          <dt>{v.truong}</dt>
                          <dd>
                            {v.truoc !== null && (
                              <del>{v.truoc_hien ?? String(v.truoc)}</del>
                            )}
                            <span>
                              {v.sau === null
                                ? "Đã bỏ"
                                : (v.sau_hien ?? String(v.sau))}
                            </span>
                          </dd>
                        </div>
                      ))}
                    </dl>
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

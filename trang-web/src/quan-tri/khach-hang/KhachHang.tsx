import { useEffect, useState } from "react";
import { qlApi, tien, luc } from "./api";
import "./quan-ly.css";
export default function KhachHang({ token }: { token: string }) {
  const [data, setData] = useState<any>({
      khach: [],
      diem_chung: [],
      chi_nhanh: [],
    }),
    [filters, setFilters] = useState({
      tim: "",
      chi_nhanh: "",
      tu: "",
      den: "",
      toi_thieu: "0",
      so_thich: "",
    }),
    [selected, setSelected] = useState<any>(null),
    [detail, setDetail] = useState<any>(null),
    [edit, setEdit] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0),
    [archived, setArchived] = useState(false),
    [sort, setSort] = useState("gan_nhat");
  useEffect(() => {
    let active = true;
    const t = setTimeout(
      () =>
        void qlApi(token, "khach-hang?" + new URLSearchParams(filters))
          .then((x) => {
            if (active) setData(x);
          })
          .catch((e) => {
            if (active) setError(e.message);
          }),
      250,
    );
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [token, filters, revision]);
  useEffect(() => {
    let active = true;
    if (!selected?.khach_khoa) return;
    setDetail(null);
    if (selected?.khach_khoa)
      void qlApi(
        token,
        "khach-hang/chi-tiet?" +
          new URLSearchParams({ khoa: selected.khach_khoa }),
      )
        .then((d) => {
          if (!active) return;
          setDetail(d);
          setEdit({
            khach_khoa: selected.khach_khoa,
            ten_khach: selected.ten_khach || "",
            so_dien_thoai: selected.so_dien_thoai || "",
            ngan_sach_du_kien: d.ho_so?.ngan_sach_du_kien ?? "",
            so_khach_uu_tien: d.ho_so?.so_khach_uu_tien ?? "",
            ghi_chu: d.ho_so?.thong_tin_bo_sung?.ghi_chu || "",
            dong_y_phan_tich_ai: d.ho_so?.dong_y_phan_tich_ai || false,
            bang_chung_dong_y:
              d.ho_so?.thong_tin_bo_sung?.bang_chung_dong_y || "",
            luu_tru: d.ho_so?.thong_tin_bo_sung?.luu_tru || false,
            so_thich: d.so_thich.map((p: any) => ({
              ten: p.ten_thuoc_tinh,
              gia_tri: p.gia_tri,
              nguon: p.nguon,
            })),
          });
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    return () => {
      active = false;
    };
  }, [token, selected]);
  const rows = [...data.khach]
      .sort((a: any, b: any) =>
        sort === "ten"
          ? String(a.ten_khach).localeCompare(String(b.ten_khach), "vi")
          : sort === "gan_nhat"
            ? +new Date(b.gan_nhat || 0) - +new Date(a.gan_nhat || 0)
            : Number(b[sort]) - Number(a[sort]),
      )
      .filter((r: any) => archived || !r.thong_tin_bo_sung?.luu_tru),
    field = (key: string, value: any) => setEdit({ ...edit, [key]: value });
  function exportCsv() {
    const cell = (v: any) =>
      '"' +
      String(v ?? "")
        .replace(/^[=+@-]/, "'$&")
        .replaceAll('"', '""') +
      '"';
    const lines = [
      [
        "Tên khách",
        "Điện thoại",
        "Số đơn",
        "Lượt ở",
        "Đơn hủy",
        "Giá trị đơn",
        "Đã thu",
      ],
      ...rows.map((r: any) => [
        r.ten_khach,
        r.so_dien_thoai,
        r.so_don,
        r.da_o,
        r.huy,
        r.gia_tri_don,
        r.da_thu,
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\ufeff" + lines.map((l) => l.map(cell).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "khach-hang.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section className="ql-page" aria-label="Quản lý khách hàng">
      <div className="ql-head">
        <h2>Khách hàng</h2>
        <div className="ql-actions">
          <button
            onClick={() => {
              setSelected(null);
              setDetail({ don: [] });
              setEdit({
                khach_khoa: "",
                ten_khach: "",
                so_dien_thoai: "",
                ngan_sach_du_kien: "",
                so_khach_uu_tien: "",
                ghi_chu: "",
                dong_y_phan_tich_ai: false,
                bang_chung_dong_y: "",
                luu_tru: false,
                so_thich: [],
              });
            }}
          >
            + Thêm khách
          </button>
          <button onClick={exportCsv}>Xuất CSV</button>
          <button onClick={() => setRevision((v) => v + 1)}>Làm mới</button>
        </div>
      </div>
      {error && (
        <p className="ql-error" role="alert">
          {error}
        </p>
      )}
      <div className="ql-tools">
        <input
          aria-label="Tìm khách"
          placeholder="Tên, điện thoại…"
          value={filters.tim}
          onChange={(e) => setFilters({ ...filters, tim: e.target.value })}
        />
        <select
          aria-label="Chi nhánh khách"
          value={filters.chi_nhanh}
          onChange={(e) =>
            setFilters({ ...filters, chi_nhanh: e.target.value })
          }
        >
          <option value="">Tất cả chi nhánh</option>
          {data.chi_nhanh.map((x: any) => (
            <option key={x.id} value={x.id}>
              {x.ten_homestay}
            </option>
          ))}
        </select>
        <input
          aria-label="Từ ngày khách"
          type="date"
          value={filters.tu}
          onChange={(e) => setFilters({ ...filters, tu: e.target.value })}
        />
        <input
          aria-label="Đến ngày khách"
          type="date"
          value={filters.den}
          onChange={(e) => setFilters({ ...filters, den: e.target.value })}
        />
        <label>
          Tối thiểu số đơn
          <input
            type="number"
            min={0}
            value={filters.toi_thieu}
            onChange={(e) =>
              setFilters({ ...filters, toi_thieu: e.target.value })
            }
          />
        </label>
        <input
          aria-label="Lọc điểm chung"
          placeholder="Sở thích, nhu cầu…"
          value={filters.so_thich}
          onChange={(e) => setFilters({ ...filters, so_thich: e.target.value })}
        />
        <label className="ql-check">
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
          />
          Gồm hồ sơ lưu trữ
        </label>
      </div>
      <div className="ql-tools">
        <label>
          Sắp xếp
          <select
            aria-label="Sắp xếp khách"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="gan_nhat">Gần nhất</option>
            <option value="so_don">Tần suất đặt</option>
            <option value="da_o">Lượt ở</option>
            <option value="gia_tri_don">Giá trị đơn</option>
            <option value="da_thu">Đã thu</option>
            <option value="ten">Tên A–Z</option>
          </select>
        </label>
      </div>
      <div className="ql-common">
        {data.diem_chung.map((p: any) => (
          <button
            key={p.ten_thuoc_tinh + ":" + p.gia_tri}
            onClick={() =>
              setFilters({
                ...filters,
                so_thich: filters.so_thich === p.gia_tri ? "" : p.gia_tri,
              })
            }
          >
            {p.ten_thuoc_tinh}: {p.gia_tri} · {p.so_khach} khách
          </button>
        ))}
      </div>
      <div className="ql-table">
        <table>
          <thead>
            <tr>
              {[
                "Khách",
                "Đơn / lượt ở",
                "Tần suất đặt",
                "Giá trị đơn / đã thu",
                "Điểm chung",
                "Gần nhất",
              ].map((x) => (
                <th key={x}>{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr
                key={r.khach_khoa}
                className={
                  selected?.khach_khoa === r.khach_khoa ? "ql-selected" : ""
                }
                onClick={() => {
                  setSelected(r);
                  setError("");
                }}
              >
                <td>
                  {r.ten_khach}
                  <small>
                    {r.so_dien_thoai || "Chưa có điện thoại"}
                    {!r.nguoi_dung_id ? " · Chưa đăng ký" : ""}
                  </small>
                </td>
                <td>
                  {r.so_don} đơn · {r.da_o} lượt ở
                  <small>{r.huy} hủy / không nhận</small>
                </td>
                <td>
                  {r.so_don > 1
                    ? Math.round(
                        (+new Date(r.gan_nhat) - +new Date(r.lan_dau)) /
                          86400000 /
                          (r.so_don - 1),
                      ) + " ngày / lần đặt"
                    : "Chưa có lần đặt tiếp"}
                  <small>
                    {r.gio_trung_binh
                      ? Number(r.gio_trung_binh).toFixed(1) + " giờ / đơn"
                      : ""}
                  </small>
                </td>
                <td>
                  {tien(r.gia_tri_don)}
                  <small>Đã thu {tien(r.da_thu)}</small>
                </td>
                <td>
                  {(r.loai_dat || []).join(", ")}
                  <small>
                    {r.so_thich.map((p: any) => p.gia_tri).join(", ")}
                  </small>
                </td>
                <td>{luc(r.gan_nhat)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p>Chưa có khách phù hợp</p>}
      </div>
      {edit && detail && (
        <div className="ql-card" style={{ marginTop: 12 }}>
          <div className="ql-head">
            <h3>{selected ? "Hồ sơ khách" : "Khách mới"}</h3>
            <button
              onClick={() => {
                setEdit(null);
                setSelected(null);
              }}
            >
              Đóng
            </button>
          </div>
          <form
            className="ql-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                const body = {
                  ...edit,
                  khach_khoa: edit.khach_khoa || "p:" + edit.so_dien_thoai,
                };
                await qlApi(token, "khach-hang", "POST", body);
                setRevision((v) => v + 1);
                setEdit(null);
                setSelected(null);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {[
              "ten_khach",
              "so_dien_thoai",
              "ngan_sach_du_kien",
              "so_khach_uu_tien",
            ].map((key, i) => (
              <label key={key}>
                {
                  [
                    "Tên khách",
                    "Điện thoại",
                    "Ngân sách dự kiến",
                    "Số khách thường đi",
                  ][i]
                }
                <input
                  required={i === 0 || (!selected && i === 1)}
                  type={i > 1 ? "number" : "text"}
                  min={i === 3 ? 1 : 0}
                  max={i === 3 ? 100 : undefined}
                  value={edit[key]}
                  onChange={(e) => field(key, e.target.value)}
                />
              </label>
            ))}
            <label className="ql-wide">
              Ghi chú
              <textarea
                value={edit.ghi_chu}
                onChange={(e) => field("ghi_chu", e.target.value)}
              />
            </label>
            <div className="ql-wide ql-prefs">
              {edit.so_thich.map((p: any, i: number) => (
                <div className="ql-pref" key={i}>
                  {["ten", "gia_tri", "nguon"].map((k, j) => (
                    <input
                      key={k}
                      required
                      aria-label={
                        ["Loại sở thích", "Giá trị sở thích", "Nguồn sở thích"][
                          j
                        ] +
                        " " +
                        (i + 1)
                      }
                      placeholder={
                        [
                          "Loại: tiện nghi",
                          "Giá trị: bồn tắm",
                          "Nguồn: khách cung cấp",
                        ][j]
                      }
                      value={p[k]}
                      onChange={(e) =>
                        field(
                          "so_thich",
                          edit.so_thich.map((x: any, n: number) =>
                            n === i ? { ...x, [k]: e.target.value } : x,
                          ),
                        )
                      }
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      field(
                        "so_thich",
                        edit.so_thich.filter((_: any, n: number) => n !== i),
                      )
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={edit.so_thich.length >= 30}
                onClick={() =>
                  field("so_thich", [
                    ...edit.so_thich,
                    { ten: "", gia_tri: "", nguon: "Khách cung cấp" },
                  ])
                }
              >
                + Sở thích
              </button>
            </div>
            <label className="ql-check">
              <input
                type="checkbox"
                checked={edit.dong_y_phan_tich_ai}
                onChange={(e) => field("dong_y_phan_tich_ai", e.target.checked)}
              />
              Khách đã đồng ý phân tích AI
            </label>
            {edit.dong_y_phan_tich_ai && (
              <label>
                Nguồn xác nhận
                <input
                  required
                  value={edit.bang_chung_dong_y}
                  onChange={(e) => field("bang_chung_dong_y", e.target.value)}
                />
              </label>
            )}
            <label className="ql-check">
              <input
                type="checkbox"
                checked={edit.luu_tru}
                onChange={(e) => field("luu_tru", e.target.checked)}
              />
              Lưu trữ hồ sơ
            </label>
            <footer>
              <button className="ql-primary" disabled={busy}>
                Lưu hồ sơ
              </button>
            </footer>
          </form>
          <h3>Lịch sử đặt phòng</h3>
          <div className="ql-table">
            <table>
              <thead>
                <tr>
                  <th>Đơn / phòng</th>
                  <th>Thời gian</th>
                  <th>Loại đặt</th>
                  <th>Trạng thái</th>
                  <th>Giá trị</th>
                </tr>
              </thead>
              <tbody>
                {detail.don.map((d: any) => (
                  <tr key={d.id}>
                    <td>
                      {d.ma_dat_phong}
                      <small>
                        {d.ten_homestay} · {d.ten_phong}
                      </small>
                    </td>
                    <td>
                      {luc(d.nhan_phong_luc)}
                      <small>→ {luc(d.tra_phong_luc)}</small>
                    </td>
                    <td>{d.hinh_thuc_dat}</td>
                    <td>{d.trang_thai}</td>
                    <td>{tien(d.tong_tien)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

import { useEffect, useState } from "react";
import { qlApi, tien, luc } from "./api";
import TomTatKhach from "./TomTatKhach";
import HopThoaiKhach from "./HopThoaiKhach";
import ThemKhach from "./ThemKhach";
import "./quan-ly.css";
import "./khach-hang-gon.css";
export default function KhachHang({ token }: { token: string }) {
  const [data, setData] = useState<any>({ khach: [], chi_nhanh: [] }),
    [filters, setFilters] = useState({
      tim: "",
      chi_nhanh: "",
      tu: "",
      den: "",
      toi_thieu: "",
    }),
    [sort, setSort] = useState("gan_nhat"),
    [revision, setRevision] = useState(0),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<any>(null),
    [detail, setDetail] = useState<any>(null),
    [profile, setProfile] = useState<any>(null),
    [create, setCreate] = useState(false);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      void qlApi(token, "khach-hang?" + new URLSearchParams(filters))
        .then((x) => {
          if (active) {
            setData(x);
            setError("");
          }
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [token, filters, revision]);
  useEffect(() => {
    let active = true;
    setDetail(null);
    if (selected)
      void qlApi(
        token,
        "khach-hang/chi-tiet?" +
          new URLSearchParams({ khoa: selected.khach_khoa }),
      )
        .then((d) => {
          if (active) setDetail(d);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    return () => {
      active = false;
    };
  }, [token, selected]);
  const rows = [...data.khach]
    .filter((r: any) => !r.thong_tin_bo_sung?.luu_tru)
    .sort((a: any, b: any) =>
      sort === "ten"
        ? String(a.ten_khach || "").localeCompare(
            String(b.ten_khach || ""),
            "vi",
          )
        : sort === "gan_nhat"
          ? +new Date(b.gan_nhat || 0) - +new Date(a.gan_nhat || 0)
          : Number(b[sort] || 0) - Number(a[sort] || 0),
    );
  function frequency(r: any) {
    const first = Date.parse(r.lan_dau),
      last = Date.parse(r.gan_nhat);
    return r.so_don > 1 && Number.isFinite(first) && Number.isFinite(last)
      ? Math.round((last - first) / 86400000 / (r.so_don - 1)) +
          " ngày / lần đặt"
      : "—";
  }
  return (
    <section className="ql-page kh-customers" aria-label="Quản lý khách hàng">
      {error && (
        <p className="ql-error" role="alert">
          {error}
        </p>
      )}
      <div className="kh-customer-tools">
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
          {data.chi_nhanh.map((b: any) => (
            <option key={b.id} value={b.id}>
              {b.ten_homestay}
            </option>
          ))}
        </select>
        <input
          type="date"
          aria-label="Từ ngày khách"
          value={filters.tu}
          onChange={(e) => setFilters({ ...filters, tu: e.target.value })}
        />
        <input
          type="date"
          aria-label="Đến ngày khách"
          value={filters.den}
          onChange={(e) => setFilters({ ...filters, den: e.target.value })}
        />
        <input
          type="number"
          aria-label="Số đơn tối thiểu"
          placeholder="Số đơn tối thiểu"
          min={0}
          value={filters.toi_thieu}
          onChange={(e) =>
            setFilters({ ...filters, toi_thieu: e.target.value })
          }
        />
        <select
          aria-label="Sắp xếp khách"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          {[
            ["gan_nhat", "Gần nhất"],
            ["so_don", "Số đơn"],
            ["huy", "Hủy"],
            ["gia_tri_don", "Giá trị đơn"],
            ["da_thu", "Đã thu"],
            ["ten", "Tên A–Z"],
          ].map(([v, n]) => (
            <option key={v} value={v}>
              {n}
            </option>
          ))}
        </select>
        <button onClick={() => setCreate(true)}>+ Thêm khách</button>
      </div>
      <div className="ql-table">
        <table>
          <thead>
            <tr>
              {[
                "Khách",
                "Đơn / hủy",
                "Tần suất đặt",
                "Giá trị đơn / đã thu",
                "Điểm chung",
                "Gần nhất",
                "Hồ sơ",
              ].map((h) => (
                <th key={h}>{h}</th>
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
                onClick={() =>
                  setSelected(selected?.khach_khoa === r.khach_khoa ? null : r)
                }
              >
                <td>
                  {r.ten_khach}
                  <small>
                    {r.so_dien_thoai || "Chưa có điện thoại"}
                    {!r.khach_khoa?.startsWith("u:") ? " · Chưa đăng ký" : ""}
                  </small>
                </td>
                <td>
                  {r.so_don || 0} đơn · {r.huy || 0} hủy
                </td>
                <td>
                  {frequency(r)}
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
                    {(r.so_thich || []).map((p: any) => p.gia_tri).join(", ")}
                  </small>
                </td>
                <td>{luc(r.gan_nhat)}</td>
                <td>
                  {r.khach_khoa?.startsWith("u:") ? (
                    <button
                      className="kh-profile-icon"
                      aria-label={"Hồ sơ " + r.ten_khach}
                      title="Hồ sơ khách"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProfile(r);
                      }}
                    >
                      <svg
                        width="19"
                        height="19"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        aria-hidden="true"
                      >
                        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6" />
                        <circle cx="10" cy="12" r="2" />
                        <path d="M7 18v-1a3 3 0 0 1 6 0v1M16 13h1M16 17h1" />
                      </svg>
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p>Chưa có khách phù hợp</p>}
      </div>
      {selected && detail && (
        <section className="kh-order-history">
          <div className="ql-head">
            <strong>Đơn của {selected.ten_khach}</strong>
            <button
              aria-label="Đóng lịch sử khách"
              onClick={() => setSelected(null)}
            >
              ×
            </button>
          </div>
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
            {!detail.don.length && <p>Chưa có đơn</p>}
          </div>
        </section>
      )}
      {profile && (
        <HopThoaiKhach
          title={"Hồ sơ · " + profile.ten_khach}
          onClose={() => setProfile(null)}
        >
          <TomTatKhach
            key={profile.khach_khoa}
            token={token}
            khoa={profile.khach_khoa}
            revision={revision}
          />
        </HopThoaiKhach>
      )}
      {create && (
        <ThemKhach
          token={token}
          onClose={() => setCreate(false)}
          onSaved={() => {
            setCreate(false);
            setRevision((r) => r + 1);
          }}
        />
      )}
    </section>
  );
}

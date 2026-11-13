import VaiTroNhanVien from "./VaiTroNhanVien";
import "./nhan-vien-ro-net.css";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
type Assignment = {
  vai_tro: string;
  chi_nhanh_id: string;
  ten_chi_nhanh: string;
};
type Employee = {
  id: string;
  ho_ten: string;
  email: string;
  so_dien_thoai: string | null;
  trang_thai: string;
  phan_cong: Assignment[];
};
type Branch = { id: string; ten_homestay: string };
const empty = {
  ho_ten: "",
  so_dien_thoai: "",
  trang_thai: "Đang hoạt động",
  vai_tro: "Chăm sóc khách hàng",
  chi_nhanh_ids: [] as string[],
  nguoi_dung_id: "",
  email: "",
  mat_khau: "",
};
export default function NhanVien({ token }: { token: string }) {
  const [tab, setTab] = useState("nhan-vien"),
    [roles, setRoles] = useState<string[]>([]);
  const [rows, setRows] = useState<Employee[]>([]),
    [branches, setBranches] = useState<Branch[]>([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState(""),
    [branch, setBranch] = useState(""),
    [page, setPage] = useState(1),
    [modal, setModal] = useState<"create" | "edit" | "detail" | null>(null),
    [selected, setSelected] = useState<Employee | null>(null),
    [form, setForm] = useState({ ...empty }),
    [mode, setMode] = useState("new");
  async function api<T>(path = "", method = "GET", body?: unknown): Promise<T> {
    const r = await fetch("/api/quan-tri/nhan-vien" + path, {
      method,
      headers: {
        Authorization: "Bearer " + token,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.message || "Không thể xử lý nhân viên");
    return d;
  }
  async function load() {
    setBusy(true);
    setError("");
    try {
      const d = await api<{
        du_lieu: Employee[];
        chi_nhanh: Branch[];
        vai_tro: string[];
      }>();
      setRows(d.du_lieu);
      setBranches(d.chi_nhanh);
      setRoles(d.vai_tro);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, [token]);
  useEffect(() => {
    setPage(1);
  }, [search, branch]);
  useEffect(() => {
    if (!modal) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) setModal(null);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [modal, busy]);
  function open(row: Employee | null, kind: "create" | "edit" | "detail") {
    setError("");
    setSelected(row);
    setForm(
      row
        ? {
            ...empty,
            ho_ten: row.ho_ten,
            so_dien_thoai: row.so_dien_thoai || "",
            trang_thai: row.trang_thai,
            vai_tro: row.phan_cong[0]?.vai_tro || empty.vai_tro,
            chi_nhanh_ids: row.phan_cong.map((x) => x.chi_nhanh_id),
            nguoi_dung_id: row.id,
            email: row.email || "",
          }
        : { ...empty, chi_nhanh_ids: [] },
    );
    setMode("new");
    setModal(kind);
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { email, mat_khau, nguoi_dung_id, ...profile } = form;
      await api(selected ? "/" + selected.id : "", selected ? "PUT" : "POST", {
        ...profile,
        ...(!selected
          ? mode === "new"
            ? { email, mat_khau }
            : { nguoi_dung_id }
          : {}),
      });
      setModal(null);
      setNotice("Đã lưu nhân viên");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(row: Employee) {
    if (
      !window.confirm(
        "Gỡ nhân viên " +
          row.ho_ten +
          " và thu hồi toàn bộ quyền nhân viên? Tài khoản, đơn đặt và lịch sử trò chuyện được giữ lại.",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await api("/" + row.id, "DELETE");
      setModal(null);
      setNotice("Đã thu hồi quyền nhân viên");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const filtered = rows.filter(
    (r) =>
      (r.ho_ten + " " + r.email + " " + (r.so_dien_thoai || ""))
        .toLocaleLowerCase("vi")
        .includes(search.toLocaleLowerCase("vi")) &&
      (!branch || r.phan_cong.some((x) => x.chi_nhanh_id === branch)),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 15)),
    visible = filtered.slice(
      (Math.min(page, pages) - 1) * 15,
      Math.min(page, pages) * 15,
    );
  return (
    <section className="cn-page nv-page">
      <div className="nv-tabs">
        <button onClick={() => setTab("nhan-vien")}>Nhân viên</button>
        <button onClick={() => setTab("vai-tro")}>Vai trò và quyền</button>
      </div>
      {tab === "vai-tro" ? (
        <VaiTroNhanVien token={token} onChanged={load} />
      ) : (
        <>
          <div className="cn-panel">
            <div className="nv-toolbar">
              <input
                aria-label="Tìm nhân viên"
                placeholder="Tên, email, số điện thoại…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                aria-label="Lọc chi nhánh"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              >
                <option value="">Tất cả chi nhánh</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.ten_homestay}
                  </option>
                ))}
              </select>
              <button disabled={busy} onClick={() => void load()}>
                ↻ Làm mới
              </button>
              <button disabled={busy} onClick={() => open(null, "create")}>
                + Tạo nhân viên
              </button>
            </div>
            {error && !modal && (
              <p role="alert" className="cn-error">
                {error}
              </p>
            )}
            {notice && <p role="status">{notice}</p>}
            <div className="nv-table">
              <table>
                <thead>
                  <tr>
                    <th>Nhân viên</th>
                    <th>Liên hệ</th>
                    <th>Vai trò / chi nhánh</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <button
                          className="nv-name"
                          onClick={() => open(r, "detail")}
                        >
                          {r.ho_ten}
                        </button>
                      </td>
                      <td>
                        {r.email}
                        <br />
                        {r.so_dien_thoai || "Chưa có SĐT"}
                      </td>
                      <td>
                        {r.phan_cong.map((p, i) => (
                          <div key={i}>
                            {p.vai_tro} · {p.ten_chi_nhanh}
                          </div>
                        ))}
                      </td>
                      <td>{r.phan_cong.length ? r.trang_thai : "Đã gỡ"}</td>
                      <td>
                        <button disabled={busy} onClick={() => open(r, "edit")}>
                          Sửa
                        </button>{" "}
                        <button
                          disabled={busy || !r.phan_cong.length}
                          onClick={() => void remove(r)}
                        >
                          Gỡ
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!visible.length && (
                    <tr>
                      <td colSpan={5}>
                        {busy ? "Đang tải…" : "Chưa có nhân viên phù hợp"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <footer className="nv-pagination">
              <span>
                {filtered.length} nhân viên · tối đa 1.000 hồ sơ mỗi lần tải
              </span>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ‹
              </button>
              <span>
                {Math.min(page, pages)} / {pages}
              </span>
              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                ›
              </button>
            </footer>
          </div>
          {modal &&
            createPortal(
              <div
                className="nv-backdrop"
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget && !busy) setModal(null);
                }}
              >
                <section
                  className="nv-dialog"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="nv-title"
                >
                  <header>
                    <h2 id="nv-title">
                      {modal === "create"
                        ? "Tạo nhân viên"
                        : modal === "edit"
                          ? "Sửa nhân viên"
                          : selected?.ho_ten}
                    </h2>
                    <button
                      disabled={busy}
                      aria-label="Đóng nhân viên"
                      onClick={() => setModal(null)}
                    >
                      ×
                    </button>
                  </header>
                  {error && (
                    <p role="alert" className="cn-error">
                      {error}
                    </p>
                  )}
                  {modal === "detail" ? (
                    <>
                      <dl>
                        <dt>Email</dt>
                        <dd>{selected?.email}</dd>
                        <dt>Số điện thoại</dt>
                        <dd>{selected?.so_dien_thoai || "Chưa có"}</dd>
                        <dt>Mã tài khoản</dt>
                        <dd>{selected?.id}</dd>
                        <dt>Trạng thái</dt>
                        <dd>
                          {selected?.phan_cong.length
                            ? selected.trang_thai
                            : "Đã gỡ"}
                        </dd>
                        <dt>Phân công</dt>
                        <dd>
                          {selected?.phan_cong.map((p, i) => (
                            <p key={i}>
                              {p.vai_tro} · {p.ten_chi_nhanh}
                            </p>
                          ))}
                        </dd>
                      </dl>
                      <footer>
                        <button onClick={() => open(selected, "edit")}>
                          Chỉnh sửa
                        </button>
                        <button
                          disabled={busy || !selected?.phan_cong.length}
                          onClick={() => selected && void remove(selected)}
                        >
                          Gỡ nhân viên
                        </button>
                      </footer>
                    </>
                  ) : (
                    <form onSubmit={save}>
                      <div className="nv-form-grid">
                        {modal === "create" && (
                          <label>
                            Kiểu tài khoản
                            <select
                              value={mode}
                              onChange={(e) => setMode(e.target.value)}
                            >
                              <option value="new">Tạo tài khoản mới</option>
                              <option value="existing">
                                Dùng tài khoản có sẵn
                              </option>
                            </select>
                          </label>
                        )}
                        <label>
                          Họ tên
                          <input
                            required
                            minLength={2}
                            maxLength={150}
                            value={form.ho_ten}
                            onChange={(e) =>
                              setForm({ ...form, ho_ten: e.target.value })
                            }
                          />
                        </label>
                        {modal === "create" &&
                          (mode === "new" ? (
                            <>
                              <label>
                                Email
                                <input
                                  required
                                  type="email"
                                  autoComplete="off"
                                  value={form.email}
                                  onChange={(e) =>
                                    setForm({ ...form, email: e.target.value })
                                  }
                                />
                              </label>
                              <label>
                                Mật khẩu ban đầu
                                <input
                                  type="password"
                                  required
                                  minLength={12}
                                  maxLength={128}
                                  autoComplete="new-password"
                                  value={form.mat_khau}
                                  onChange={(e) =>
                                    setForm({
                                      ...form,
                                      mat_khau: e.target.value,
                                    })
                                  }
                                />
                              </label>
                            </>
                          ) : (
                            <label>
                              Mã tài khoản Supabase
                              <input
                                required
                                value={form.nguoi_dung_id}
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    nguoi_dung_id: e.target.value,
                                  })
                                }
                              />
                            </label>
                          ))}
                        <label>
                          Số điện thoại
                          <input
                            type="tel"
                            value={form.so_dien_thoai}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                so_dien_thoai: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          Vai trò
                          <select
                            value={form.vai_tro}
                            onChange={(e) =>
                              setForm({ ...form, vai_tro: e.target.value })
                            }
                          >
                            {roles.map((r) => (
                              <option key={r}>{r}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Trạng thái
                          <select
                            value={form.trang_thai}
                            onChange={(e) =>
                              setForm({ ...form, trang_thai: e.target.value })
                            }
                          >
                            <option>Đang hoạt động</option>
                            <option>Tạm khóa</option>
                          </select>
                        </label>
                        <fieldset>
                          <legend>Chi nhánh phân công</legend>
                          {branches.map((b) => (
                            <label key={b.id}>
                              <input
                                type="checkbox"
                                checked={form.chi_nhanh_ids.includes(b.id)}
                                onChange={(e) =>
                                  setForm({
                                    ...form,
                                    chi_nhanh_ids: e.target.checked
                                      ? [...form.chi_nhanh_ids, b.id]
                                      : form.chi_nhanh_ids.filter(
                                          (x) => x !== b.id,
                                        ),
                                  })
                                }
                              />
                              {b.ten_homestay}
                            </label>
                          ))}
                        </fieldset>
                      </div>
                      <p>
                        Quyền trang áp dụng toàn hệ thống; chi nhánh chỉ là phân
                        công công việc. Tạm khóa áp dụng cho toàn bộ tài khoản.
                        Gỡ nhân viên chỉ thu hồi quyền công việc, giữ tài khoản
                        và lịch sử. Tài khoản mới được quản trị cấp sẵn, không
                        gửi email mời.
                      </p>
                      <footer>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setModal(null)}
                        >
                          Thoát
                        </button>
                        <button disabled={busy || !form.chi_nhanh_ids.length}>
                          {busy ? "Đang lưu…" : "Lưu nhân viên"}
                        </button>
                      </footer>
                    </form>
                  )}
                </section>
              </div>,
              document.body,
            )}
        </>
      )}
    </section>
  );
}

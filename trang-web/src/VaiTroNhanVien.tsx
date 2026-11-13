import { useEffect, useState } from "react";
import { quanTriApi } from "./bao-cao-api";
const names: Record<string, string> = {
  "tong-quan": "Tổng quan",
  lich: "Lịch",
  "chi-nhanh": "Chi nhánh",
  phong: "Phòng",
  "loai-phong": "Loại phòng",
  "goi-combo": "Combo",
  "dat-phong": "Đơn đặt phòng",
  "trang-chu": "Trang chủ",
  "danh-gia": "Đánh giá",
  "bao-cao": "Báo cáo thống kê",
  "tin-nhan": "Tin nhắn",
};
type Role = {
  id: string;
  ma_vai_tro: string;
  he_thong: boolean;
  quyen_trang: string[];
};
export default function VaiTroNhanVien({
  token,
  onChanged,
}: {
  token: string;
  onChanged: () => Promise<void>;
}) {
  const [roles, setRoles] = useState<Role[]>([]),
    [pages, setPages] = useState<string[]>([]),
    [id, setId] = useState(""),
    [name, setName] = useState(""),
    [selected, setSelected] = useState<string[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    try {
      const x = await quanTriApi<{ vai_tro: Role[]; trang: string[] }>(
        token,
        "vai-tro",
      );
      setRoles(x.vai_tro);
      setPages(x.trang);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, [token]);
  return (
    <section className="nv-roles">
      <h2>Vai trò và quyền truy cập trang</h2>
      <p>
        Quyền trang bao gồm xem và thao tác dữ liệu toàn hệ thống. Chi nhánh
        phân công là thông tin công việc, không giới hạn dữ liệu theo chi nhánh.
        Chỉ quản trị hệ thống được cấp quyền và quản lý nhân viên.
      </p>
      <div className="nv-role-layout">
        <div className="nv-role-list">
          <button
            onClick={() => {
              setId("");
              setName("");
              setSelected([]);
            }}
          >
            ＋ Vai trò mới
          </button>
          {roles.map((r) => (
            <button
              key={r.id}
              className={id === r.id ? "active" : ""}
              onClick={() => {
                setId(r.id);
                setName(r.ma_vai_tro);
                setSelected(r.quyen_trang);
              }}
            >
              {r.ma_vai_tro}
              <small>
                {r.quyen_trang.map((p) => names[p]).join(", ") ||
                  "Chưa có quyền trang"}
              </small>
            </button>
          ))}
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await quanTriApi(
                token,
                "vai-tro" + (id ? "/" + id : ""),
                id ? "PUT" : "POST",
                { ten: name, trang: selected },
              );
              await load();
              await onChanged();
              setError(
                "Đã lưu vai trò. Nhân viên tải lại trang để cập nhật menu; backend áp dụng quyền mới ngay.",
              );
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Tên vai trò
            <input
              required
              minLength={2}
              maxLength={100}
              disabled={!!roles.find((r) => r.id === id)?.he_thong}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <fieldset>
            <legend>Các trang được truy cập</legend>
            {pages.map((p) => (
              <label key={p}>
                <input
                  type="checkbox"
                  checked={selected.includes(p)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...selected, p]
                        : selected.filter((x) => x !== p),
                    )
                  }
                />
                {names[p]}
              </label>
            ))}
          </fieldset>
          <button disabled={busy} type="submit">
            {busy ? "Đang lưu…" : "Lưu vai trò"}
          </button>
          {error && <p role="status">{error}</p>}
        </form>
      </div>
    </section>
  );
}

import { useEffect, useState, type FormEvent } from "react";
import { quanTriApi } from "./bao-cao-api";
import type { DoiTuongBieuDo, TuyChonBieuDo } from "./bieu-do-thu-chi";
type Settings = { doi_tuong: DoiTuongBieuDo[]; phien_ban: number };
export default function DoiTuongBieuDoPanel({
  token,
  branches,
  rooms,
  onChanged,
}: {
  token: string;
  branches: TuyChonBieuDo[];
  rooms: TuyChonBieuDo[];
  onChanged: (o: DoiTuongBieuDo[]) => void;
}) {
  const [config, setConfig] = useState<Settings>({
      doi_tuong: [],
      phien_ban: 0,
    }),
    [ready, setReady] = useState(false),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [edit, setEdit] = useState<DoiTuongBieuDo | null>(null);
  useEffect(() => {
    let live = true;
    setReady(false);
    void quanTriApi<Settings>(token, "thu-chi/bieu-do")
      .then((x) => {
        if (live) {
          setConfig(x);
          onChanged(x.doi_tuong);
          setReady(true);
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [token, onChanged]);
  async function persist(objects: DoiTuongBieuDo[]) {
    setBusy(true);
    setError("");
    try {
      const x = await quanTriApi<Settings>(token, "thu-chi/bieu-do", "PUT", {
        doi_tuong: objects,
        phien_ban: config.phien_ban,
      });
      setConfig(x);
      onChanged(x.doi_tuong);
      setEdit(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function add() {
    setEdit({
      id: crypto.randomUUID(),
      ten: "",
      mau: "#8c67bd",
      loai: "chi_nhanh",
      ids: [],
      tu_khoa: "",
    });
    setOpen(true);
  }
  function save(e: FormEvent) {
    e.preventDefault();
    if (!edit) return;
    const objects = config.doi_tuong.some((o) => o.id === edit.id)
      ? config.doi_tuong.map((o) => (o.id === edit.id ? edit : o))
      : [...config.doi_tuong, edit];
    void persist(objects);
  }
  return (
    <div className="stc-object-panel">
      <div className="stc-object-heading">
        <button disabled={!ready || busy} onClick={add}>
          ＋ Tạo đối tượng
        </button>
        <button onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          Đối tượng đã lưu ({config.doi_tuong.length})
        </button>
        <small>
          Nhóm so sánh lưu theo tài khoản, lấy số liệu từ sổ đã lưu.
        </small>
      </div>
      {error && <p role="alert">{error}</p>}
      {open && (
        <div className="stc-object-content">
          <div className="stc-object-list">
            {config.doi_tuong.map((o) => (
              <div key={o.id}>
                <i style={{ background: o.mau }} />
                <strong>{o.ten}</strong>
                <button
                  title={"Sửa " + o.ten}
                  disabled={busy}
                  onClick={() => setEdit({ ...o, ids: [...o.ids] })}
                >
                  ✎
                </button>
                <button
                  title={"Xóa " + o.ten}
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Xóa đối tượng so sánh " +
                          o.ten +
                          "? Không xóa dòng thu chi.",
                      )
                    )
                      void persist(
                        config.doi_tuong.filter((x) => x.id !== o.id),
                      );
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            {!config.doi_tuong.length && <p>Chưa có đối tượng tùy chỉnh.</p>}
          </div>
          {edit && (
            <form className="stc-object-form" inert={busy} onSubmit={save}>
              <label>
                Tên đối tượng
                <input
                  required
                  maxLength={80}
                  aria-label="Tên đối tượng biểu đồ"
                  value={edit.ten}
                  onChange={(e) => setEdit({ ...edit, ten: e.target.value })}
                />
              </label>
              <label>
                Màu
                <input
                  type="color"
                  value={edit.mau}
                  onChange={(e) => setEdit({ ...edit, mau: e.target.value })}
                />
              </label>
              <label>
                Phạm vi
                <select
                  aria-label="Phạm vi đối tượng biểu đồ"
                  value={edit.loai}
                  onChange={(e) =>
                    setEdit({
                      ...edit,
                      loai: e.target.value as DoiTuongBieuDo["loai"],
                      ids: [],
                    })
                  }
                >
                  <option value="chi_nhanh">Các chi nhánh</option>
                  <option value="phong">Các phòng</option>
                  <option value="khoan_khac">
                    Khoản chung chưa gán phòng/chi nhánh
                  </option>
                </select>
              </label>
              <label>
                Từ khóa (tùy chọn)
                <input
                  maxLength={100}
                  placeholder="Tên khoản hoặc ghi chú"
                  value={edit.tu_khoa}
                  onChange={(e) =>
                    setEdit({ ...edit, tu_khoa: e.target.value })
                  }
                />
              </label>
              {edit.loai !== "khoan_khac" && (
                <div className="stc-object-options">
                  {(edit.loai === "chi_nhanh" ? branches : rooms).map((x) => (
                    <label key={x.id}>
                      <input
                        type="checkbox"
                        checked={edit.ids.includes(x.id)}
                        onChange={(e) =>
                          setEdit({
                            ...edit,
                            ids: e.target.checked
                              ? [...edit.ids, x.id]
                              : edit.ids.filter((id) => id !== x.id),
                          })
                        }
                      />
                      {x.ten_homestay ||
                        (branches.find((b) => b.id === x.homestay_id)
                          ?.ten_homestay || "") +
                          " · " +
                          x.ten_phong}
                    </label>
                  ))}
                </div>
              )}
              <div className="stc-object-buttons">
                <button
                  disabled={
                    busy || (!edit.ids.length && edit.loai !== "khoan_khac")
                  }
                  type="submit"
                >
                  Lưu đối tượng
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setEdit(null)}
                >
                  Hủy
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { qlApi, tien, luc } from "../khach-hang/api";
import "../khach-hang/quan-ly.css";
const blank = () => ({
  ma_khuyen_mai: "",
  ten_khuyen_mai: "",
  loai_giam: "Phần trăm",
  gia_tri: "",
  giam_toi_da: "",
  don_toi_thieu: "0",
  gioi_han_su_dung: "",
  bat_dau: "",
  ket_thuc: "",
  trang_thai: "Đang hoạt động",
  homestay_id: "",
});
const local = (s: string) =>
  s ? new Date(+new Date(s) + 7 * 3600000).toISOString().slice(0, 16) : "";
export default function Voucher({ token }: { token: string }) {
  const [data, setData] = useState<any>({ voucher: [], chi_nhanh: [] }),
    [edit, setEdit] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [recipients, setRecipients] = useState<any[] | null>(null),
    [sendId, setSendId] = useState(""),
    [chosen, setChosen] = useState<string[]>([]),
    [notice, setNotice] = useState(""),
    [search, setSearch] = useState("");
  async function load() {
    try {
      setData(await qlApi(token, "voucher"));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, [token]);
  return (
    <section className="ql-page">
      <div className="ql-head">
        <h2>Voucher</h2>
        <button onClick={() => setEdit(blank())}>+ Thêm voucher</button>
      </div>
      {error && <p className="ql-error">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <div className="ql-table">
        <table>
          <thead>
            <tr>
              {[
                "Mã / tên",
                "Ưu đãi",
                "Thời hạn",
                "Lượt dùng",
                "Trạng thái",
                "",
              ].map((x, i) => (
                <th key={i}>{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.voucher.map((v: any) => (
              <tr key={v.id}>
                <td>
                  {v.ma_khuyen_mai}
                  <small>{v.ten_khuyen_mai}</small>
                </td>
                <td>
                  {v.loai_giam === "Phần trăm"
                    ? v.gia_tri + "%"
                    : tien(v.gia_tri)}
                  <small>
                    Đơn từ {tien(v.don_toi_thieu)}
                    {v.giam_toi_da !== null
                      ? " · Tối đa " + tien(v.giam_toi_da)
                      : ""}
                  </small>
                </td>
                <td>
                  {luc(v.bat_dau)}
                  <small>→ {luc(v.ket_thuc)}</small>
                </td>
                <td>
                  {v.da_dung} / {v.gioi_han_su_dung ?? "∞"}
                </td>
                <td>{v.trang_thai}</td>
                <td>
                  <div className="ql-actions">
                    <button
                      onClick={() =>
                        setEdit({
                          ...v,
                          bat_dau: local(v.bat_dau),
                          ket_thuc: local(v.ket_thuc),
                          homestay_id: v.homestay_id || "",
                          giam_toi_da: v.giam_toi_da ?? "",
                          gioi_han_su_dung: v.gioi_han_su_dung ?? "",
                        })
                      }
                    >
                      Sửa
                    </button>
                    <button
                      onClick={async () => {
                        setError("");
                        try {
                          setRecipients(await qlApi(token, "voucher/khach"));
                          setSendId(v.id);
                          setChosen([]);
                        } catch (e) {
                          setError((e as Error).message);
                        }
                      }}
                    >
                      Gửi khách
                    </button>
                    <button
                      onClick={() =>
                        void navigator.clipboard
                          .writeText(v.ma_khuyen_mai)
                          .catch(() =>
                            setError(
                              "Không sao chép được; chọn mã để sao chép",
                            ),
                          )
                      }
                    >
                      Sao chép
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {edit && (
        <form
          className="ql-card ql-form"
          style={{ marginTop: 12 }}
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const body = {
                ...edit,
                bat_dau: new Date(edit.bat_dau + ":00+07:00").toISOString(),
                ket_thuc: new Date(edit.ket_thuc + ":00+07:00").toISOString(),
              };
              await qlApi(
                token,
                "voucher" + (edit.id ? "/" + edit.id : ""),
                edit.id ? "PUT" : "POST",
                body,
              );
              setEdit(null);
              await load();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {[
            "ma_khuyen_mai",
            "ten_khuyen_mai",
            "gia_tri",
            "don_toi_thieu",
            "giam_toi_da",
            "gioi_han_su_dung",
            "bat_dau",
            "ket_thuc",
          ].map((key, i) => (
            <label key={key}>
              {
                [
                  "Mã voucher",
                  "Tên voucher",
                  "Giá trị giảm",
                  "Đơn tối thiểu",
                  "Giảm tối đa",
                  "Giới hạn lượt",
                  "Bắt đầu",
                  "Kết thúc",
                ][i]
              }
              <input
                aria-label={
                  [
                    "Mã voucher",
                    "Tên voucher",
                    "Giá trị giảm",
                    "Đơn tối thiểu",
                    "Giảm tối đa",
                    "Giới hạn lượt",
                    "Bắt đầu voucher",
                    "Kết thúc voucher",
                  ][i]
                }
                required={![4, 5].includes(i)}
                type={i > 5 ? "datetime-local" : i > 1 ? "number" : "text"}
                min={0}
                value={edit[key]}
                onChange={(e) => setEdit({ ...edit, [key]: e.target.value })}
              />
            </label>
          ))}
          <label>
            Loại giảm
            <select
              value={edit.loai_giam}
              onChange={(e) => setEdit({ ...edit, loai_giam: e.target.value })}
            >
              <option>Phần trăm</option>
              <option>Số tiền</option>
            </select>
          </label>
          <label>
            Chi nhánh
            <select
              value={edit.homestay_id}
              onChange={(e) =>
                setEdit({ ...edit, homestay_id: e.target.value })
              }
            >
              <option value="">Toàn hệ thống</option>
              {data.chi_nhanh.map((b: any) => (
                <option value={b.id} key={b.id}>
                  {b.ten_homestay}
                </option>
              ))}
            </select>
          </label>
          <label>
            Trạng thái
            <select
              value={edit.trang_thai}
              onChange={(e) => setEdit({ ...edit, trang_thai: e.target.value })}
            >
              <option>Đang hoạt động</option>
              <option>Tạm ngưng</option>
            </select>
          </label>
          <footer>
            <button type="button" onClick={() => setEdit(null)}>
              Đóng
            </button>
            <button className="ql-primary" disabled={busy}>
              Lưu voucher
            </button>
          </footer>
        </form>
      )}
      {recipients && (
        <section className="ql-card" style={{ marginTop: 12 }}>
          <div className="ql-head">
            <h3>Gửi voucher</h3>
            <button onClick={() => setRecipients(null)}>Đóng</button>
          </div>
          <input
            placeholder="Tìm khách…"
            aria-label="Tìm khách nhận voucher"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div
            className="ql-common"
            style={{ marginTop: 12, maxHeight: 240, overflow: "auto" }}
          >
            {recipients
              .filter((r) =>
                (r.ho_ten + " " + (r.so_dien_thoai || ""))
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((r) => (
                <label className="ql-check" key={r.id}>
                  <input
                    type="checkbox"
                    checked={chosen.includes(r.id)}
                    disabled={!chosen.includes(r.id) && chosen.length >= 100}
                    onChange={(e) =>
                      setChosen(
                        e.target.checked
                          ? [...chosen, r.id]
                          : chosen.filter((x) => x !== r.id),
                      )
                    }
                  />
                  {r.ho_ten} · {r.so_dien_thoai}
                </label>
              ))}
          </div>
          <button
            className="ql-primary"
            disabled={busy || !chosen.length}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await qlApi(
                  token,
                  "voucher/" + sendId + "/gui",
                  "POST",
                  { khach_ids: chosen },
                );
                setNotice(
                  "Đã gửi thông báo voucher đến " + r.da_gui + " khách",
                );
                setRecipients(null);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Gửi ({chosen.length})
          </button>
        </section>
      )}
    </section>
  );
}

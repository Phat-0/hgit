import { useEffect, useState } from "react";
import { type Khoi, type NoiDungTrangChu, macDinh } from "./trang-chu-noi-dung";
import "./trang-chu-quan-tri.css";
const khoiMoi = (): Khoi => ({
  hien: true,
  tieu_de: "Nội dung mới",
  noi_dung: "",
  anh: "",
});
type Row = {
  ban_nhap: NoiDungTrangChu;
  da_xuat_ban: NoiDungTrangChu;
  phien_ban: number;
  xuat_ban_luc: string | null;
};
export default function TrangChuQuanTri({ token }: { token: string }) {
  const [data, setData] = useState<NoiDungTrangChu>(macDinh),
    [revision, setRevision] = useState(0),
    [published, setPublished] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [dirty, setDirty] = useState(false);
  async function api(path = "", method = "GET", body?: unknown) {
    const upload = body instanceof FormData;
    const r = await fetch("/api/quan-tri/trang-chu" + path, {
      method,
      headers: {
        Authorization: "Bearer " + token,
        ...(body && !upload ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? (upload ? body : JSON.stringify(body)) : undefined,
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.message || "Không thể xử lý Trang chủ");
    return d;
  }
  function apply(row: Row) {
    setData(row.ban_nhap);
    setRevision(row.phien_ban);
    setPublished(row.xuat_ban_luc);
    setDirty(false);
  }
  async function load() {
    if (dirty && !window.confirm("Tải lại sẽ bỏ thay đổi chưa lưu. Tiếp tục?"))
      return;
    setBusy(true);
    setError("");
    try {
      apply(await api());
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
    const fn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", fn);
    return () => window.removeEventListener("beforeunload", fn);
  }, [dirty]);
  function change(next: NoiDungTrangChu) {
    setData(next);
    setDirty(true);
    setNotice("");
  }
  async function save(publish = false) {
    setBusy(true);
    setError("");
    try {
      apply(
        await api("", "PUT", {
          cau_hinh: data,
          phien_ban: revision,
          xuat_ban: publish,
        }),
      );
      setNotice(
        publish
          ? "Đã xuất bản. Trang khách thấy bản này khi mở hoặc tải lại trang."
          : "Đã lưu nháp. Trang khách vẫn giữ bản đã xuất bản.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function image(file: File | undefined, replace: (url: string) => void) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      if (file.size > 5242880) throw Error("Ảnh tối đa 5 MB");
      const body = new FormData();
      body.append("file", file);
      const r = await api("/anh", "POST", body);
      replace(r.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function block(title: string, b: Khoi | null, onChange: (v: Khoi) => void) {
    const x = b || { ...khoiMoi(), hien: false };
    return (
      <fieldset className="tc-block" disabled={busy}>
        <legend>{title}</legend>
        <label className="tc-toggle">
          <input
            type="checkbox"
            checked={x.hien}
            onChange={(e) => onChange({ ...x, hien: e.target.checked })}
          />{" "}
          Cho phép hiển thị
        </label>
        <label>
          Tiêu đề
          <input
            maxLength={180}
            value={x.tieu_de}
            onChange={(e) => onChange({ ...x, tieu_de: e.target.value })}
          />
        </label>
        <label>
          Nội dung
          <textarea
            maxLength={4000}
            rows={3}
            value={x.noi_dung}
            onChange={(e) => onChange({ ...x, noi_dung: e.target.value })}
          />
        </label>
        <div className="tc-image">
          {x.anh ? (
            <img src={x.anh} alt={x.tieu_de} />
          ) : (
            <span>Chưa có ảnh</span>
          )}
          <label>
            Tải ảnh JPEG/PNG/WebP
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                void image(e.target.files?.[0], (url) =>
                  onChange({ ...x, anh: url }),
                );
                e.target.value = "";
              }}
            />
          </label>
          {x.anh && (
            <button type="button" onClick={() => onChange({ ...x, anh: "" })}>
              Bỏ ảnh khỏi phần này
            </button>
          )}
        </div>
      </fieldset>
    );
  }
  return (
    <section className="tc-page">
      <div className="tc-toolbar">
        <a href="/" target="_blank" rel="noopener noreferrer">
          ↗ Xem trang khách
        </a>
        <button disabled={busy} onClick={() => void load()}>
          ↻ Tải lại
        </button>
        <button disabled={busy || !revision} onClick={() => void save()}>
          Lưu nháp
        </button>
        <button disabled={busy || !revision} onClick={() => void save(true)}>
          Xuất bản trang chủ
        </button>
      </div>
      <p>
        Đường dẫn trang khách:{" "}
        <a href="/" target="_blank" rel="noopener noreferrer">
          {window.location.origin}/
        </a>
      </p>
      <p>
        {dirty ? "Có thay đổi chưa lưu. " : ""}Bản xuất bản gần nhất:{" "}
        {published ? new Date(published).toLocaleString("vi-VN") : "Chưa có"}.
        Bản nháp không hiển thị cho khách.
      </p>
      {error && (
        <p className="cn-error" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <div className="tc-grid">
        {block("Banner đầu trang", data.hero, (b) =>
          change({ ...data, hero: b }),
        )}
        {block("Giới thiệu", data.gioi_thieu, (b) =>
          change({ ...data, gioi_thieu: b }),
        )}
        {block("Chân trang", data.chan_trang, (b) =>
          change({ ...data, chan_trang: b }),
        )}
        <fieldset className="tc-block" disabled={busy}>
          <legend>Danh sách phòng</legend>
          <label className="tc-toggle">
            <input
              type="checkbox"
              checked={data.hien_phong}
              onChange={(e) =>
                change({ ...data, hien_phong: e.target.checked })
              }
            />{" "}
            Hiện bộ lọc và phòng trống cho khách đặt
          </label>
          <p>
            Phòng, giá và ảnh lấy từ dữ liệu Phòng; không nhập lại ở đây. Tắt
            phần này chỉ ẩn khỏi Trang chủ, không ngừng kinh doanh phòng trong
            DB.
          </p>
        </fieldset>
      </div>
      <div className="tc-section-head">
        <h2>Các thẻ hình ảnh và nội dung</h2>
        <button
          disabled={busy || data.the.length >= 8}
          onClick={() => change({ ...data, the: [...data.the, khoiMoi()] })}
        >
          + Thêm thẻ ({data.the.length}/8)
        </button>
      </div>
      <div className="tc-grid">
        {data.the.map((b, i) => (
          <div key={i}>
            {block("Thẻ " + (i + 1), b, (next) =>
              change({
                ...data,
                the: data.the.map((v, j) => (j === i ? next : v)),
              }),
            )}
            <div className="tc-card-actions">
              <button
                disabled={busy || i === 0}
                onClick={() => {
                  const a = [...data.the];
                  [a[i - 1], a[i]] = [a[i], a[i - 1]];
                  change({ ...data, the: a });
                }}
              >
                ↑ Lên
              </button>
              <button
                disabled={busy || i === data.the.length - 1}
                onClick={() => {
                  const a = [...data.the];
                  [a[i + 1], a[i]] = [a[i], a[i + 1]];
                  change({ ...data, the: a });
                }}
              >
                ↓ Xuống
              </button>
              <button
                disabled={busy}
                onClick={() => {
                  if (window.confirm("Xóa thẻ này khỏi bản nháp?"))
                    change({
                      ...data,
                      the: data.the.filter((_, j) => i !== j),
                    });
                }}
              >
                Xóa thẻ
              </button>
            </div>
          </div>
        ))}
      </div>
      <small>
        Ảnh marketing được lưu công khai trên Storage; không tải giấy tờ hoặc
        ảnh riêng tư. Bỏ ảnh khỏi phần này không xóa tệp để giữ bản đã xuất bản
        đang sử dụng.
      </small>
    </section>
  );
}

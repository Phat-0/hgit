import { useEffect, useState } from "react";
import {
  type Khoi,
  type NoiDungTrangChu,
  macDinh,
  layGiaoDien,
} from "../../dung-chung/du-lieu/trang-chu-noi-dung";
import "./trang-chu-quan-tri.css";
import AnhDauTrang from "./AnhDauTrang";
import AnhPhongNoi from "../../dung-chung/giao-dien/AnhPhongNoi";
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
  const [preview, setPreview] = useState("");
  const [options, setOptions] = useState<{
      phong: {
        id: string;
        ten_phong: string;
        ten_homestay: string;
        anh_chon?: { id: string; url: string | null }[];
      }[];
      combo: { id: string; ten_combo: string }[];
    }>({ phong: [], combo: [] }),
    [optionError, setOptionError] = useState("");
  useEffect(() => {
    let active = true;
    void fetch("/api/khach/gioi-thieu")
      .then(async (r) => {
        if (!r.ok) throw Error("Chưa tải được danh sách nổi bật");
        return r.json();
      })
      .then((d) => {
        if (active)
          setOptions({
            phong: Array.isArray(d.phong) ? d.phong : [],
            combo: Array.isArray(d.combo) ? d.combo : [],
          });
      })
      .catch((e) => {
        if (active) setOptionError(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
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
    setData({
      ...row.ban_nhap,
      giao_dien: {
        ...layGiaoDien(row.ban_nhap.giao_dien),
        hien_hoat_anh: true,
        hien_thong_ke: true,
        hien_danh_gia: true,
        hien_ban_do: true,
      },
    });
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
  function block(
    title: string,
    b: Khoi | null,
    onChange: (v: Khoi) => void,
    role?: "hero" | "footer",
  ) {
    const x = b || { ...khoiMoi(), hien: false };
    return (
      <fieldset className="tc-block" disabled={busy}>
        <legend>{title}</legend>

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
        {role === "hero" ? (
          <AnhDauTrang
            value={x}
            phong={options.phong}
            onChange={onChange}
            onUpload={image}
          />
        ) : role !== "footer" ? (
          <div className="tc-image">
            <label>
              {role === "footer" ? "Logo footer" : "Ảnh nền giới thiệu"}
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
              <div className="tc-image-thumb">
                <button
                  type="button"
                  onClick={() => setPreview(x.anh)}
                  aria-label={"Phóng to ảnh " + title}
                >
                  <img src={x.anh} alt={x.tieu_de} />
                </button>
                <button
                  type="button"
                  className="tc-image-remove"
                  aria-label={"Bỏ ảnh " + title}
                  onClick={() => onChange({ ...x, anh: "" })}
                >
                  ×
                </button>
              </div>
            )}
          </div>
        ) : null}
        {title.includes("Giới thiệu") && (
          <button
            type="button"
            onClick={() =>
              onChange({
                ...x,
                tieu_de: "Nghỉ yên, tận hưởng từng khoảnh khắc.",
                noi_dung:
                  "Không gian riêng tư, tiện nghi vừa đủ cho một kỳ nghỉ thoải mái.",
              })
            }
          >
            Dùng nội dung giới thiệu gợi ý
          </button>
        )}
        {role === "footer" && (
          <div className="tc-contact-fields">
            {(
              [
                ["dia_chi", "Địa chỉ liên hệ"],
                ["dien_thoai", "Số điện thoại liên hệ"],
                ["tieu_de_lien_ket", "Tiêu đề khám phá"],
                ["tieu_de_ket_noi", "Tiêu đề kết nối"],
                ["noi_dung_ket_noi", "Nội dung kết nối"],
                ["nhan_nut", "Nhãn nút nhắn tin"],
                ["zalo", "Liên kết Zalo (HTTPS)"],
                ["website", "Website (HTTPS)"],
                ["facebook", "Facebook (HTTPS)"],
                ["instagram", "Instagram (HTTPS)"],
                ["tiktok", "TikTok (HTTPS)"],
                ["chinh_sach", "Chính sách (HTTPS)"],
                ["bao_mat", "Bảo mật (HTTPS)"],
                ["faq", "FAQ (HTTPS)"],
                ["ban_quyen", "Dòng bản quyền"],
                ["loi_ich_1", "Lợi ích 1"],
                ["loi_ich_2", "Lợi ích 2"],
                ["loi_ich_3", "Lợi ích 3"],
              ] as const
            ).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  type="text"
                  maxLength={key === "dien_thoai" ? 30 : 500}
                  value={x[key] || ""}
                  onChange={(e) => onChange({ ...x, [key]: e.target.value })}
                />
              </label>
            ))}
          </div>
        )}
      </fieldset>
    );
  }
  const ui = layGiaoDien(data.giao_dien);
  function setUi(
    key: keyof typeof ui,
    value: string | number | boolean | string[],
  ) {
    change({ ...data, giao_dien: { ...ui, [key]: value } });
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
      <fieldset className="tc-block tc-design" disabled={busy}>
        <legend>00 · Thương hiệu và nền</legend>
        <div className="tc-design-grid">
          {[
            ["ten_web", "Tên website"],
            ["khau_hieu", "Dòng giới thiệu ngắn"],
          ].map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                maxLength={150}
                value={String(ui[key as keyof typeof ui])}
                onChange={(e) => setUi(key as keyof typeof ui, e.target.value)}
              />
            </label>
          ))}
          <label>
            Màu nền tối bên dưới
            <input
              type="color"
              value={ui.mau_nen}
              onChange={(e) => setUi("mau_nen", e.target.value)}
            />
          </label>
          <label>
            Ảnh nền đầu trang
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                void image(e.target.files?.[0], (url) =>
                  setUi("anh_nen_chung", url),
                );
                e.target.value = "";
              }}
            />
            {ui.anh_nen_chung && (
              <>
                <img
                  src={ui.anh_nen_chung}
                  alt="Nền đầu trang"
                  style={{ width: 120, height: 64, objectFit: "cover" }}
                />
                <button
                  type="button"
                  onClick={() => setUi("anh_nen_chung", "")}
                >
                  Bỏ ảnh nền đầu trang
                </button>
              </>
            )}
          </label>
          <label>
            Màu nút chính
            <input
              type="color"
              value={ui.mau_nhan}
              onChange={(e) => setUi("mau_nhan", e.target.value)}
            />
          </label>
          {data.the.some((b) => b.hien) && (
            <label>
              Số thẻ mỗi hàng
              <select
                value={ui.so_cot}
                onChange={(e) => setUi("so_cot", Number(e.target.value))}
              >
                {[2, 3, 4].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
          )}
          <label>
            Vị trí ảnh nổi
            <select
              value={String(ui.anh_ben_trai)}
              onChange={(e) => setUi("anh_ben_trai", e.target.value === "true")}
            >
              <option value="false">Bên phải</option>
              <option value="true">Bên trái</option>
            </select>
          </label>
        </div>
        <div
          className="tc-preview"
          style={{
            fontFamily: '"Home Serif",Georgia,serif',
            background: ui.mau_nen,
            backgroundImage: ui.anh_nen_chung
              ? `url(${JSON.stringify(ui.anh_nen_chung)})`
              : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <strong>{ui.ten_web}</strong>
          <small>{ui.khau_hieu}</small>
          <h3>{data.hero?.tieu_de}</h3>
          <p>{data.hero?.noi_dung}</p>
          <span style={{ background: ui.mau_nhan }}>Xem trước màu nút</span>
        </div>
      </fieldset>
      <fieldset className="tc-block tc-home-motion" disabled={busy}>
        <legend>Thống kê và khung đặt đơn</legend>
        <div className="tc-design-grid">
          {(
            [
              ["nhan_dat_don", "Tên nút mở đặt đơn", "Đặt đơn"],
              ["tieu_de_thong_ke", "Tiêu đề các con số", ui.ten_web],
            ] as const
          ).map(([key, label, fallback]) => (
            <label key={key}>
              {label}
              <input
                maxLength={150}
                value={String(ui[key] ?? fallback)}
                onChange={(e) => setUi(key, e.target.value)}
              />
            </label>
          ))}
          <label>
            Tốc độ mở đặt đơn (ms)
            <input
              type="number"
              min={1400}
              max={1600}
              step={50}
              value={Math.max(1400, ui.toc_do_mo_dat_don || 1600)}
              onChange={(e) =>
                setUi("toc_do_mo_dat_don", Number(e.target.value))
              }
            />
          </label>
        </div>
      </fieldset>
      <div className="tc-grid">
        {block(
          "01 · Đầu trang: nội dung và dải ảnh",
          data.hero,
          (b) => change({ ...data, hero: b }),
          "hero",
        )}
        {block("02 · Giới thiệu bổ sung", data.gioi_thieu, (b) =>
          change({ ...data, gioi_thieu: b }),
        )}
      </div>
      <div className="tc-section-head">
        <h2>03 · Các thẻ nội dung bổ sung</h2>
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
      <fieldset className="tc-block tc-search-settings" disabled={busy}>
        <legend>04 · Tìm phòng và kết quả phòng trống</legend>
        <label className="tc-toggle">
          <input
            type="checkbox"
            checked={data.hien_phong}
            onChange={(e) => change({ ...data, hien_phong: e.target.checked })}
          />
          Hiện bộ tìm phòng và danh mục lưu trú
        </label>
      </fieldset>
      <h2 className="tc-stage-title">05 · Tab Giá phòng và Combo</h2>
      {optionError && <p role="alert">{optionError}</p>}
      <div className="tc-feature-grid">
        <fieldset className="tc-block" disabled={busy}>
          <legend>Tab Giá phòng</legend>

          <div className="tc-feature-options">
            {options.phong.map((p) => (
              <label key={p.id}>
                <input
                  type="checkbox"
                  checked={(ui.phong_noi_bat || []).includes(p.id)}
                  onChange={(e) =>
                    setUi(
                      "phong_noi_bat",
                      e.target.checked
                        ? [...(ui.phong_noi_bat || []), p.id].slice(0, 20)
                        : (ui.phong_noi_bat || []).filter((id) => id !== p.id),
                    )
                  }
                />
                <span>
                  {p.ten_phong}
                  <small>{p.ten_homestay}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="tc-block" disabled={busy}>
          <legend>Tab Combo</legend>
          <label className="tc-toggle">
            <input
              type="checkbox"
              checked={data.hien_combo !== false}
              onChange={(e) =>
                change({ ...data, hien_combo: e.target.checked })
              }
            />
            Hiện Combo
          </label>

          <div className="tc-feature-options">
            {options.combo.map((c) => (
              <label key={c.id}>
                <input
                  type="checkbox"
                  checked={(ui.combo_noi_bat || []).includes(c.id)}
                  onChange={(e) =>
                    setUi(
                      "combo_noi_bat",
                      e.target.checked
                        ? [...(ui.combo_noi_bat || []), c.id].slice(0, 20)
                        : (ui.combo_noi_bat || []).filter((id) => id !== c.id),
                    )
                  }
                />
                <span>{c.ten_combo}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <fieldset className="tc-block tc-review-settings" disabled={busy}>
        <legend>06 · Đánh giá khách hàng</legend>
        <label>
          Tiêu đề
          <input
            maxLength={150}
            value={ui.tieu_de_danh_gia || "Khách hàng nói về HomeStay"}
            onChange={(e) => setUi("tieu_de_danh_gia", e.target.value)}
          />
        </label>
      </fieldset>
      <section className="tc-footer-settings">
        {block(
          "07 · Footer: logo, nội dung và liên hệ",
          data.chan_trang,
          (b) => change({ ...data, chan_trang: b }),
          "footer",
        )}
      </section>
      {preview && (
        <AnhPhongNoi
          url={preview}
          title="Ảnh Trang chủ"
          onClose={() => setPreview("")}
        />
      )}
    </section>
  );
}

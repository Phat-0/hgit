import { useEffect, useState } from "react";
import { qlApi, luc, tien } from "./api";
import "./tom-tat-khach.css";
type Item = { noi_dung: string; nguon: { id: string; trich_dan: string }[] };
type Data = {
  dong_y: boolean;
  ngan_sach?: number | null;
  loai_dat?: {
    hinh_thuc_dat: string;
    so_lan: number;
    gio_trung_binh: number;
  }[];
  thoi_gian?: { nhan: string; tra: string; so_lan: number }[];
  ghi_chu?: { noi_dung: string; so_lan: number }[];
  ghi_chu_ho_so?: string;
  phong_thuong_dat: {
    ma_phong: string;
    ten_phong: string;
    ten_homestay: string;
    so_lan: number;
  }[];
  tom_tat: {
    cau_hoi: Item[];
    yeu_cau: Item[];
    ngan_sach?: Item[];
    ngay_tao: string;
    so_tin: number;
  } | null;
};
function Items({ items }: { items?: Item[] }) {
  return items?.length ? (
    <ul>
      {items.map((v, i) => (
        <li key={i}>
          <span>{v.noi_dung}</span>
          <details>
            <summary>Nguồn</summary>
            {v.nguon.map((s, j) => (
              <blockquote key={j}>{s.trich_dan}</blockquote>
            ))}
          </details>
        </li>
      ))}
    </ul>
  ) : (
    <p>Chưa có thông tin.</p>
  );
}
export default function TomTatKhach({
  token,
  khoa,
  revision,
}: {
  token: string;
  khoa: string;
  revision: number;
}) {
  const [data, setData] = useState<Data | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [consent, setConsent] = useState(false),
    [source, setSource] = useState("");
  async function load() {
    setData(
      await qlApi(token, "khach-hang/tom-tat?" + new URLSearchParams({ khoa })),
    );
  }
  useEffect(() => {
    let active = true;
    void qlApi(token, "khach-hang/tom-tat?" + new URLSearchParams({ khoa }))
      .then((x) => {
        if (active) setData(x);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [token, khoa, revision]);
  async function generate() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      setData(
        await qlApi(token, "khach-hang/tom-tat", "POST", { khach_khoa: khoa }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function saveConsent(value: boolean) {
    setBusy(true);
    setError("");
    try {
      await qlApi(token, "khach-hang/dong-y-ai", "POST", {
        khach_khoa: khoa,
        dong_y: value,
        nguon: source,
      });
      await load();
      setConsent(false);
      setSource("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="kh-summary">
      <div className="kh-summary-body">
        {error && (
          <p className="ql-error" role="alert">
            {error}
          </p>
        )}
        {data ? (
          <>
            <div className="ql-head">
              <span />
              <button
                type="button"
                disabled={busy || !data.dong_y}
                onClick={() => void generate()}
              >
                {busy
                  ? "Đang xử lý…"
                  : data.tom_tat
                    ? "Cập nhật AI"
                    : "Tóm tắt AI"}
              </button>
            </div>
            <div className="kh-summary-grid">
              <article>
                <h4>Ngân sách</h4>
                {data.ngan_sach ? (
                  <p>{tien(data.ngan_sach)}</p>
                ) : (
                  <Items items={data.tom_tat?.ngan_sach} />
                )}
              </article>
              <article>
                <h4>Phòng thường đặt</h4>
                {data.phong_thuong_dat.length ? (
                  <ul>
                    {data.phong_thuong_dat.map((p, i) => (
                      <li key={i}>
                        <b>{p.ma_phong}</b> · {p.ten_phong}
                        <small>
                          {p.ten_homestay} · {p.so_lan} lần
                        </small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Chưa có đơn xác nhận.</p>
                )}
              </article>
              <article>
                <h4>Loại đặt và thời gian</h4>
                {data.loai_dat?.length ? (
                  <ul>
                    {data.loai_dat.map((v, i) => (
                      <li key={i}>
                        {v.hinh_thuc_dat} · {v.so_lan} lần
                        <small>
                          Trung bình{" "}
                          {Number(v.gio_trung_binh).toLocaleString("vi-VN")} giờ
                        </small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Chưa có dữ liệu.</p>
                )}
                {!!data.thoi_gian?.length && (
                  <ul>
                    {data.thoi_gian.map((v, i) => (
                      <li key={i}>
                        {v.nhan} → {v.tra}
                        <small>{v.so_lan} lần</small>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
              <article>
                <h4>Ghi chú thường có</h4>
                {data.ghi_chu_ho_so && <p>{data.ghi_chu_ho_so}</p>}
                {data.ghi_chu?.length ? (
                  <ul>
                    {data.ghi_chu.map((v, i) => (
                      <li key={i}>
                        <details>
                          <summary>
                            {v.noi_dung.slice(0, 110)}
                            {v.noi_dung.length > 110 ? "…" : ""}
                          </summary>
                          <p>{v.noi_dung}</p>
                          <small>{v.so_lan} đơn</small>
                        </details>
                      </li>
                    ))}
                  </ul>
                ) : (
                  !data.ghi_chu_ho_so && <p>Chưa có ghi chú.</p>
                )}
              </article>
              <article>
                <h4>Khách thường hỏi</h4>
                <Items items={data.tom_tat?.cau_hoi} />
              </article>
              <article>
                <h4>Yêu cầu của khách</h4>
                <Items items={data.tom_tat?.yeu_cau} />
              </article>
            </div>
            <div className="kh-profile-consent">
              <label>
                <input
                  type="checkbox"
                  aria-label="Khách đồng ý phân tích AI"
                  disabled={busy}
                  checked={data.dong_y}
                  onChange={(e) => {
                    if (e.target.checked) setConsent(true);
                    else void saveConsent(false);
                  }}
                />
                Khách đồng ý phân tích AI
              </label>
              {consent && (
                <form
                  className="kh-profile-consent"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void saveConsent(true);
                  }}
                >
                  <input
                    required
                    maxLength={500}
                    aria-label="Nguồn xác nhận AI"
                    placeholder="Nguồn xác nhận đồng ý"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                  />
                  <button type="submit" disabled={busy}>
                    Xác nhận
                  </button>
                  <button type="button" onClick={() => setConsent(false)}>
                    Hủy
                  </button>
                </form>
              )}
            </div>
            {data.tom_tat && (
              <small>
                AI tham khảo · {luc(data.tom_tat.ngay_tao)} ·{" "}
                {data.tom_tat.so_tin} nguồn gần nhất.
              </small>
            )}
          </>
        ) : (
          !error && <p>Đang tải…</p>
        )}
      </div>
    </section>
  );
}

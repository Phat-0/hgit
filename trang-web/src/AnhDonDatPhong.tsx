import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { quanTriApi } from "./bao-cao-api";
import BieuTuongDon from "./BieuTuongDon";
import "./anh-don.css";
type Photo = { id: string; ten_tep: string; url: string; ngay_tao: string };
export default function AnhDonDatPhong({
  id,
  token,
  onClose,
}: {
  id: string;
  token: string;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<Photo[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [zoom, setZoom] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const load = useCallback(async () => {
    try {
      setRows(
        await quanTriApi<Photo[]>(
          token,
          "lich-phong/don-dat-phong/" + id + "/anh",
        ),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id, token]);
  useEffect(() => {
    void load();
  }, [load]);
  async function upload(files: FileList | null) {
    if (!files) return;
    setBusy(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        if (
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size > 5242880
        )
          throw Error("Ảnh JPG/PNG/WebP tối đa 5 MB");
        const data = new FormData();
        data.append("file", file);
        const r = await fetch(
          "/api/quan-tri/lich-phong/don-dat-phong/" + id + "/anh",
          {
            method: "POST",
            headers: { Authorization: "Bearer " + token },
            body: data,
          },
        );
        if (!r.ok) {
          const j = await r.json();
          throw Error(j.message || "Không tải được ảnh");
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      await load();
    }
  }
  return createPortal(
    <div
      className="ad-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <section
        className="ad-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Ảnh đơn đặt phòng"
      >
        <header>
          <h2>Ảnh của đơn đặt phòng</h2>
          <button aria-label="Đóng ảnh đơn" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="ad-toolbar">
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={(e) => {
              void upload(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            disabled={busy || rows.length >= 20}
            title="Thêm ảnh vào đơn"
            aria-label="Thêm ảnh vào đơn"
            onClick={() => input.current?.click()}
          >
            <BieuTuongDon kind="image" />
          </button>
          <span>{rows.length}/20 ảnh · tối đa 5 MB/ảnh</span>
        </div>
        {error && <p role="alert">{error}</p>}
        <div className="ad-grid">
          {rows.map((p) => (
            <figure key={p.id}>
              <button
                className="ad-photo"
                onClick={() => setZoom(p.url)}
                title={p.ten_tep}
              >
                <img src={p.url} alt={p.ten_tep} />
              </button>
              <figcaption>{p.ten_tep}</figcaption>
              <button
                aria-label={"Xóa ảnh " + p.ten_tep}
                title="Xóa ảnh"
                disabled={busy}
                onClick={async () => {
                  if (!window.confirm("Xóa ảnh này khỏi đơn?")) return;
                  setBusy(true);
                  try {
                    await quanTriApi(
                      token,
                      "lich-phong/don-dat-phong/" + id + "/anh/" + p.id,
                      "DELETE",
                    );
                    await load();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <BieuTuongDon kind="delete" />
              </button>
            </figure>
          ))}
        </div>
        {!rows.length && <p>Chưa có ảnh của đơn.</p>}
        {zoom && (
          <div className="ad-zoom" onClick={() => setZoom("")}>
            <button aria-label="Đóng ảnh phóng to">×</button>
            <img src={zoom} alt="Ảnh đơn phóng to" />
          </div>
        )}
      </section>
    </div>,
    document.body,
  );
}

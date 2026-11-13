import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { quanTriApi } from "./bao-cao-api";
type Tep = { id: string; ten_tep: string; url: string; mime: string };
export default function ChungTuThuChi({
  token,
  id,
  onClose,
  onChanged,
}: {
  token: string;
  id: string;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [files, setFiles] = useState<Tep[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const picker = useRef<HTMLInputElement>(null);
  const load = useCallback(async () => {
    try {
      setFiles(await quanTriApi<Tep[]>(token, "thu-chi/" + id + "/chung-tu"));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id, token]);
  useEffect(() => {
    void load();
  }, [load]);
  return createPortal(
    <div
      className="stc-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <section
        className="stc-docs"
        role="dialog"
        aria-modal="true"
        aria-label="Chứng từ thu chi"
      >
        <header>
          <h2>Chứng từ thu chi</h2>
          <button disabled={busy} aria-label="Đóng chứng từ" onClick={onClose}>
            ×
          </button>
        </header>
        <p>
          Ảnh tối đa 10 MB; PDF, TXT, CSV, DOCX, XLSX tối đa 20 MB. Tối đa 10
          tệp/dòng.
        </p>
        <input
          hidden
          ref={picker}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,.csv,.docx,.xlsx"
          onChange={async (e) => {
            const chosen = Array.from(e.target.files || []);
            e.target.value = "";
            setBusy(true);
            setError("");
            try {
              for (const f of chosen) {
                if (f.size > 20971520) throw Error("Tệp tối đa 20 MB");
                const body = new FormData();
                body.append("file", f);
                const r = await fetch(
                  "/api/quan-tri/thu-chi/" + id + "/chung-tu",
                  {
                    method: "POST",
                    headers: { Authorization: "Bearer " + token },
                    body,
                  },
                );
                if (!r.ok) {
                  const j = await r.json();
                  throw Error(j.message || "Không tải được tệp");
                }
              }
            } catch (x) {
              setError((x as Error).message);
            } finally {
              setBusy(false);
              await load();
              await onChanged();
            }
          }}
        />
        <button
          disabled={busy || files.length >= 10}
          onClick={() => picker.current?.click()}
        >
          ＋ Thêm ảnh / tệp
        </button>
        {error && <p role="alert">{error}</p>}
        <div className="stc-doc-list">
          {files.map((f) => (
            <article key={f.id}>
              <a
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                download={f.ten_tep}
              >
                {f.mime.startsWith("image/") && (
                  <img src={f.url} alt={f.ten_tep} />
                )}
                <span>{f.ten_tep}</span>
              </a>
              <button
                disabled={busy}
                title="Xóa chứng từ"
                aria-label={"Xóa " + f.ten_tep}
                onClick={async () => {
                  if (!window.confirm("Xóa chứng từ " + f.ten_tep + "?"))
                    return;
                  setBusy(true);
                  try {
                    await quanTriApi(
                      token,
                      "thu-chi/" + id + "/chung-tu/" + f.id,
                      "DELETE",
                    );
                    await load();
                    await onChanged();
                  } catch (e) {
                    setError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                ×
              </button>
            </article>
          ))}
        </div>
        {!files.length && <p>Chưa có chứng từ.</p>}
      </section>
    </div>,
    document.body,
  );
}

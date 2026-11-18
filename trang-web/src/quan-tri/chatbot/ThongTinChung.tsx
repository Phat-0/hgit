import { useEffect, useState } from "react";
type Info = {
  id?: string;
  tieu_de: string;
  nhom: string;
  noi_dung: string;
  xuat_ban: boolean;
  phien_ban?: number;
};
export default function ThongTinChung({
  rows,
  busy,
  onSave,
}: {
  rows: Info[];
  busy: boolean;
  onSave: (x: Info) => Promise<void>;
}) {
  const [edit, setEdit] = useState<Info | null>(null);
  useEffect(() => {
    if (!edit) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [edit]);
  return (
    <section className="cb-card cb-common-info">
      <div className="cb-card-title">
        <h2>Kiến thức</h2>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            setEdit({
              tieu_de: "",
              noi_dung: "",
              nhom: "Câu hỏi thường gặp",
              xuat_ban: false,
            })
          }
        >
          + Thêm thông tin
        </button>
      </div>
      <div className="cb-info-list">
        {rows.map((x) => (
          <button
            type="button"
            key={x.id}
            className={"cb-entry " + (x.xuat_ban ? "is-enabled" : "")}
            onClick={() => setEdit({ ...x })}
          >
            <strong>{x.tieu_de}</strong>
          </button>
        ))}
      </div>
      {!rows.length && (
        <p>
          Chưa có thông tin chung. Thêm nội dung rồi bật để làm nguồn cho
          chatbot.
        </p>
      )}
      {edit && (
        <form
          className="cb-info-editor"
          onSubmit={async (e) => {
            e.preventDefault();
            if (edit.tieu_de.startsWith("Tình huống: ")) return;
            try {
              await onSave(edit);
              setEdit(null);
            } catch {}
          }}
        >
          <label>
            Tiêu đề
            <input
              required
              maxLength={150}
              value={edit.tieu_de}
              onChange={(e) => setEdit({ ...edit, tieu_de: e.target.value })}
            />
          </label>
          <label>
            Nội dung
            <textarea
              aria-label="Nội dung"
              required
              rows={5}
              maxLength={6000}
              value={edit.noi_dung}
              onChange={(e) => setEdit({ ...edit, noi_dung: e.target.value })}
            />
          </label>
          <label className="cb-toggle">
            <input
              type="checkbox"
              checked={edit.xuat_ban}
              onChange={(e) => setEdit({ ...edit, xuat_ban: e.target.checked })}
            />
            Cho phép sử dụng
          </label>
          <footer>
            <button type="button" onClick={() => setEdit(null)}>
              Đóng
            </button>
            <button className="cb-primary" disabled={busy}>
              Lưu thông tin
            </button>
          </footer>
        </form>
      )}
    </section>
  );
}

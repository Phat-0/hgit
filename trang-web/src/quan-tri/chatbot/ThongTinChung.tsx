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
        <h2>Thông tin cần biết</h2>
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
      <p className="cb-note">
        Nội quy, chính sách, dịch vụ và tài liệu dùng chung. Chỉ bật những thông
        tin được phép công khai; tình huống có thể chọn các nguồn này để tham
        khảo.
      </p>
      <div className="cb-info-list">
        {rows.map((x) => (
          <button
            type="button"
            key={x.id}
            className="cb-entry"
            onClick={() => setEdit({ ...x })}
          >
            <strong>{x.tieu_de}</strong>
            <span>{x.xuat_ban ? "Được phép dùng" : "Chưa cho phép"}</span>
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
            } catch {
              /* Parent keeps the error and editor visible. */
            }
          }}
        >
          <label>
            Tiêu đề thông tin
            <input
              required
              maxLength={150}
              value={edit.tieu_de}
              onChange={(e) => setEdit({ ...edit, tieu_de: e.target.value })}
            />
          </label>
          <label>
            Nội dung thông tin
            <textarea
              aria-label="Nội dung thông tin"
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
            Cho phép bot sử dụng nguồn này
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

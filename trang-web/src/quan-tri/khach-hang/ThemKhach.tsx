import { useState } from "react";
import { qlApi } from "./api";
import HopThoaiKhach from "./HopThoaiKhach";
export default function ThemKhach({
  token,
  onClose,
  onSaved,
}: {
  token: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
      ten_khach: "",
      so_dien_thoai: "",
      email: "",
      mat_khau: "",
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <HopThoaiKhach title="Tạo tài khoản khách" onClose={onClose} busy={busy}>
      <form
        className="ql-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setError("");
          try {
            await qlApi(token, "khach-hang/tai-khoan", "POST", form);
            onSaved();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {(
          [
            ["ten_khach", "Tên khách", "text"],
            ["so_dien_thoai", "Điện thoại", "tel"],
            ["email", "Email", "email"],
            ["mat_khau", "Mật khẩu ban đầu", "password"],
          ] as const
        ).map(([key, label, type]) => (
          <label key={key}>
            {label}
            <input
              required
              type={type}
              minLength={key === "mat_khau" ? 12 : undefined}
              maxLength={key === "mat_khau" ? 128 : 254}
              autoComplete={key === "mat_khau" ? "new-password" : "off"}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            />
          </label>
        ))}
        {error && (
          <p role="alert" className="ql-error">
            {error}
          </p>
        )}
        <footer>
          <button disabled={busy} type="submit">
            {busy ? "Đang tạo…" : "Tạo tài khoản"}
          </button>
        </footer>
      </form>
    </HopThoaiKhach>
  );
}

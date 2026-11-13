import { useEffect, useState } from "react";
import { quanTriApi } from "./bao-cao-api";
export const phongGoc = [
  "Trống",
  "Đang sử dụng",
  "Cần dọn",
  "Đang dọn",
  "Chờ kiểm tra",
  "Bảo trì",
  "Bị khóa",
];
export const tienGoc = ["Chưa thanh toán", "Cọc", "Đủ"];
export const tenTrangThai = (s: string) =>
  s === "Đủ"
    ? "Đã thanh toán"
    : s === "Cọc"
      ? "Đã cọc"
      : s === "Đang dọn"
        ? "Đang vệ sinh"
        : s === "Cần dọn"
          ? "Chờ vệ sinh"
          : s;
export type ThietLapLich = {
  mau: Record<string, string>;
  trang_thai: string[];
  mau_phong: Record<string, string>;
  mau_thanh_toan: Record<string, string>;
  trang_thai_phong: string[];
  trang_thai_thanh_toan: string[];
  phien_ban: number;
};
export const hienThiMacDinh: ThietLapLich = {
  mau: {},
  trang_thai: [],
  mau_phong: {
    Trống: "#ffffff",
    "Đang sử dụng": "#78c4df",
    "Đang dọn": "#eac577",
    "Bảo trì": "#e994a2",
    "Bị khóa": "#c0a3e0",
  },
  mau_thanh_toan: {
    "Chưa thanh toán": "#f8d394",
    Cọc: "#b6a3ef",
    Đủ: "#91d4b2",
  },
  trang_thai_phong: phongGoc,
  trang_thai_thanh_toan: tienGoc,
  phien_ban: 0,
};
export default function ThietLapTrangThai({
  token,
  value,
  onSaved,
}: {
  token: string;
  value: ThietLapLich;
  onSaved: (v: ThietLapLich) => void;
}) {
  const [draft, setDraft] = useState(value),
    [group, setGroup] = useState<"phong" | "thanh_toan" | null>(null),
    [name, setName] = useState(""),
    [color, setColor] = useState("#b89ae8"),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [deleting, setDeleting] = useState(false),
    [dirty, setDirty] = useState(false);
  useEffect(() => {
    setDraft(value);
    setDirty(false);
  }, [value.phien_ban]);
  return (
    <div className="lp-state-groups">
      <div className="lp-state-tools">
        <button type="button" onClick={() => setDeleting((v) => !v)}>
          {deleting ? "Xong" : "Xóa trạng thái tự thêm"}
        </button>
        <button
          type="button"
          disabled={!dirty || busy || !value.phien_ban}
          onClick={async () => {
            setBusy(true);
            setMessage("");
            try {
              const x = await quanTriApi<ThietLapLich>(
                token,
                "lich-phong/hien-thi",
                "PATCH",
                draft,
              );
              onSaved(x);
              setDirty(false);
              setMessage("Đã lưu hai nhóm trạng thái dùng chung");
            } catch (e) {
              setMessage((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Lưu màu và trạng thái
        </button>
      </div>
      {(["phong", "thanh_toan"] as const).map((g) => {
        const namesKey =
            g === "phong" ? "trang_thai_phong" : "trang_thai_thanh_toan",
          colorsKey = g === "phong" ? "mau_phong" : "mau_thanh_toan",
          base = g === "phong" ? phongGoc : tienGoc;
        return (
          <section key={g} className="lp-state-group">
            <header>
              <strong>
                {g === "phong"
                  ? "Trạng thái phòng"
                  : "Trạng thái thanh toán trên lịch"}
              </strong>
              <button
                type="button"
                onClick={() => {
                  setGroup(group === g ? null : g);
                  setName("");
                }}
              >
                ＋ Thêm mới
              </button>
            </header>
            {group === g && (
              <div className="lp-new-status">
                <input
                  maxLength={80}
                  aria-label={"Tên trạng thái " + g}
                  placeholder="Tên trạng thái mới"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <input
                  type="color"
                  aria-label={"Màu trạng thái " + g}
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
                <button
                  type="button"
                  disabled={!name.trim()}
                  onClick={() => {
                    const n = name.trim();
                    if (draft[namesKey].includes(n)) {
                      setMessage("Tên trạng thái đã tồn tại");
                      return;
                    }
                    setDraft({
                      ...draft,
                      [namesKey]: [...draft[namesKey], n],
                      [colorsKey]: { ...draft[colorsKey], [n]: color },
                    });
                    setDirty(true);
                    setGroup(null);
                  }}
                >
                  Thêm
                </button>
              </div>
            )}
            <div className="lp-status-summary">
              {draft[namesKey].map((n) => (
                <span className="lp-status-chip" key={n}>
                  <input
                    type="color"
                    aria-label={"Màu " + g + " " + n}
                    value={draft[colorsKey][n] || "#d6c5f4"}
                    onChange={(e) => {
                      setDraft({
                        ...draft,
                        [colorsKey]: {
                          ...draft[colorsKey],
                          [n]: e.target.value,
                        },
                      });
                      setDirty(true);
                    }}
                  />
                  <span>{tenTrangThai(n)}</span>
                  {deleting && !base.includes(n) && (
                    <button
                      type="button"
                      aria-label={"Xóa " + n}
                      onClick={() => {
                        setDraft({
                          ...draft,
                          [namesKey]: draft[namesKey].filter((x) => x !== n),
                        });
                        setDirty(true);
                      }}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
          </section>
        );
      })}
      {message && <p role="status">{message}</p>}
    </div>
  );
}

export function chuTrenMau(hex:string){const n=parseInt(hex.replace("#",""),16);return ((n>>16)*299+((n>>8)&255)*587+(n&255)*114)/1000>150?"#30253d":"#ffffff";}

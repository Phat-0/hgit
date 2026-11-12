import { useState } from "react";
import AnhPhongNoi from "./AnhPhongNoi";
export type TepChat = {
  id: string;
  tin_nhan_id: string;
  ten_tep: string;
  mime: string;
  dung_luong: number;
  la_anh: boolean;
  url: string;
  ngay_tao: string;
};
export const sizeTep = (n: number) =>
  n >= 1048576
    ? (n / 1048576).toFixed(1) + " MB"
    : Math.max(1, Math.ceil(n / 1024)) + " KB";
export function TepDinhKem({ tep }: { tep: TepChat }) {
  const [image, setImage] = useState(false);
  return (
    <div className="chat-attachment">
      {tep.la_anh ? (
        <button
          className="chat-image-button"
          onClick={() => setImage(true)}
          aria-label={"Xem ảnh " + tep.ten_tep}
        >
          <img loading="lazy" src={tep.url} alt={tep.ten_tep} />
        </button>
      ) : (
        <a
          href={tep.url}
          target="_blank"
          rel="noopener noreferrer"
          download={tep.ten_tep}
        >
          <span>▤</span>
          <strong>{tep.ten_tep}</strong>
          <small>{sizeTep(tep.dung_luong)} · Tải xuống</small>
        </a>
      )}
      {image && (
        <AnhPhongNoi
          url={tep.url}
          title={tep.ten_tep}
          label="Ảnh trong cuộc trò chuyện"
          onClose={() => setImage(false)}
        />
      )}
    </div>
  );
}
export async function chatUpload(
  id: string,
  file: File,
  text: string,
  nonce: string,
  token?: string,
  guest?: string,
) {
  const b = new FormData();
  b.append("file", file);
  b.append("noi_dung", text);
  b.append("ma_phia_khach", nonce);
  const r = await fetch("/api/khach/chat/" + id + "/tep", {
    method: "POST",
    headers: {
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(guest ? { "X-Guest-Chat": guest } : {}),
    },
    body: b,
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.message || "Không gửi được tệp");
  return d;
}

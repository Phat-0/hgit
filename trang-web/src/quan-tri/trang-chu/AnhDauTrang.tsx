import { useState } from "react";
import type { Khoi } from "../../dung-chung/du-lieu/trang-chu-noi-dung";
import AnhPhongNoi from "../../dung-chung/giao-dien/AnhPhongNoi";
type Phong = {
  id: string;
  ten_phong: string;
  ten_homestay: string;
  anh_chon?: { id: string; url: string | null }[];
};
export default function AnhDauTrang({
  value,
  phong,
  onChange,
  onUpload,
}: {
  value: Khoi;
  phong: Phong[];
  onChange: (next: Khoi) => void;
  onUpload: (
    file: File | undefined,
    replace: (url: string) => void,
  ) => Promise<void>;
}) {
  const [selected, setSelected] = useState(""),
    [preview, setPreview] = useState("");
  const slides = value.bo_anh ?? [
      ...(value.anh ? [{ url: value.anh }] : []),
      ...(value.album || []).map((url) => ({ url })),
    ],
    room = phong.find((p) => p.id === selected);
  const update = (items: NonNullable<Khoi["bo_anh"]>) =>
    onChange({ ...value, bo_anh: items });
  return (
    <div className="tc-hero-editor">
      <div className="tc-image-tray">
        <details className="tc-add-image">
          <summary>+ Thêm ảnh</summary>
          <div>
            <input
              aria-label="Thêm ảnh đầu trang từ máy"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              disabled={slides.length >= 12}
              onChange={async (e) => {
                const files = Array.from(e.target.files || []).slice(
                  0,
                  12 - slides.length,
                );
                e.target.value = "";
                let items = [...slides];
                for (const file of files)
                  await onUpload(file, (url) => {
                    items = [...items, { url }];
                    update(items);
                  });
              }}
            />
            <select
              aria-label="Chọn ảnh có sẵn của phòng"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Ảnh có sẵn trong phòng</option>
              {phong.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.ten_homestay} · {p.ten_phong}
                </option>
              ))}
            </select>
            {room && (
              <div className="tc-room-photos">
                {room.anh_chon?.map(
                  (p) =>
                    p.url && (
                      <button
                        type="button"
                        key={p.id}
                        disabled={
                          slides.length >= 12 ||
                          slides.some((s) => "anh_id" in s && s.anh_id === p.id)
                        }
                        onClick={() =>
                          update([
                            ...slides,
                            { phong_id: room.id, anh_id: p.id },
                          ])
                        }
                        aria-label={"Thêm ảnh có sẵn " + p.id}
                      >
                        <img src={p.url} alt={room.ten_phong} />
                      </button>
                    ),
                )}
              </div>
            )}
          </div>
        </details>
        {slides.map((slide, i) => {
          const url =
            "url" in slide
              ? slide.url
              : phong
                  .find((p) => p.id === slide.phong_id)
                  ?.anh_chon?.find((a) => a.id === slide.anh_id)?.url;
          return (
            <div className="tc-image-thumb" key={i}>
              {url ? (
                <button
                  type="button"
                  onClick={() => setPreview(url)}
                  aria-label={"Phóng to ảnh đầu trang " + (i + 1)}
                >
                  <img src={url} alt={"Ảnh " + (i + 1)} />
                </button>
              ) : (
                <span>Ảnh không còn khả dụng</span>
              )}
              <button
                type="button"
                className="tc-image-remove"
                aria-label={"Bỏ ảnh đầu trang " + (i + 1)}
                onClick={() => update(slides.filter((_, n) => n !== i))}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
      <small>Tối đa 12 ảnh. Nhấn ảnh để xem lớn.</small>
      {preview && (
        <AnhPhongNoi
          url={preview}
          title="Ảnh đầu trang"
          onClose={() => setPreview("")}
        />
      )}
    </div>
  );
}

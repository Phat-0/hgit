import { useState } from "react";
import type { Khoi } from "../../dung-chung/du-lieu/trang-chu-noi-dung";
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
  const [selected, setSelected] = useState("");
  const slides = value.bo_anh ?? [
    ...(value.anh ? [{ url: value.anh }] : []),
    ...(value.album || []).map((url) => ({ url })),
  ];
  const room = phong.find((p) => p.id === selected),
    update = (next: NonNullable<Khoi["bo_anh"]>) =>
      onChange({ ...value, bo_anh: next });
  return (
    <div className="tc-hero-editor">
      <label>
        Chọn phòng
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Chọn phòng để lấy ảnh</option>
          {phong.map((p) => (
            <option key={p.id} value={p.id}>
              {p.ten_homestay} · {p.ten_phong}
            </option>
          ))}
        </select>
      </label>
      {room && (
        <div className="tc-room-photos">
          {room.anh_chon?.map(
            (photo) =>
              photo.url && (
                <button
                  type="button"
                  key={photo.id}
                  disabled={
                    slides.length >= 12 ||
                    slides.some(
                      (s) =>
                        "phong_id" in s &&
                        s.phong_id === room.id &&
                        s.anh_id === photo.id,
                    )
                  }
                  onClick={() =>
                    update([...slides, { phong_id: room.id, anh_id: photo.id }])
                  }
                  aria-label={"Thêm ảnh " + room.ten_phong + " " + photo.id}
                >
                  <img src={photo.url} alt={room.ten_phong} />
                  <span>Chọn ảnh</span>
                </button>
              ),
          )}
          {!room.anh_chon?.length && <p>Phòng này chưa có ảnh.</p>}
        </div>
      )}
      <label>
        Hoặc tải ảnh từ máy (tối đa 12 ảnh)
        <input
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
            let next = [...slides];
            for (const file of files)
              await onUpload(file, (url) => {
                next = [...next, { url }];
                update(next);
              });
          }}
        />
      </label>
      <div className="tc-hero-album">
        {slides.map((slide, i) => {
          const room =
            "phong_id" in slide
              ? phong.find((p) => p.id === slide.phong_id)
              : undefined;
          const url =
            "url" in slide
              ? slide.url
              : room?.anh_chon?.find((a) => a.id === slide.anh_id)?.url;
          return (
            <div key={i}>
              {url ? (
                <img src={url} alt={"Ảnh đầu trang " + (i + 1)} />
              ) : (
                <span>Ảnh không còn khả dụng</span>
              )}
              <small>{room?.ten_phong || "Ảnh tải lên"}</small>
              <div>
                <button
                  type="button"
                  disabled={i === 0}
                  aria-label={"Đưa ảnh " + (i + 1) + " lên trước"}
                  onClick={() => {
                    const next = [...slides];
                    [next[i - 1], next[i]] = [next[i], next[i - 1]];
                    update(next);
                  }}
                >
                  ←
                </button>
                <button
                  type="button"
                  aria-label={"Xóa ảnh đầu trang " + (i + 1)}
                  onClick={() => update(slides.filter((_, n) => n !== i))}
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <p>
        Ảnh lấy từ phòng có nút xem thông tin phòng. Ảnh tải từ máy chỉ dùng để
        trình bày. Kéo để chuyển ảnh trên cả máy tính và điện thoại.
      </p>
    </div>
  );
}

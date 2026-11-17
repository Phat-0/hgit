import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import ThuVienAnhKhach from "./ThuVienAnhKhach";
type Phong = {
  tien_nghi?: string[];
  ten_phong: string;
  ten_loai: string;
  ten_homestay: string;
  dia_chi: string;
  tinh_thanh: string;
  mo_ta: string | null;
  suc_chua: number;
  dien_tich_m2: string | null;
  tien_phong: number;
  anh: (string | null)[];
};
export default function ChiTietPhongKhach({
  phong,
  nhan,
  tra,
  onDong,
  onDat,
  onMo,
}: {
  phong: Phong;
  nhan: string;
  tra: string;
  onDong: () => void;
  onDat: () => void;
  onMo: (url: string) => void;
}) {
  const ref = useRef<HTMLElement>(null),
    close = useRef(onDong);
  close.current = onDong;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (document.querySelector(".anh-phong-noi")) return;
      if (e.key === "Escape") {
        e.preventDefault();
        close.current();
      }
      if (e.key === "Tab") {
        const items = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),[tabindex="0"],a[href]',
          ) || [],
        );
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, []);
  return createPortal(
    <div
      className="kh-detail-shade"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onDong();
      }}
    >
      <section
        ref={ref}
        className="kh-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kh-detail-title"
      >
        <button
          className="kh-detail-close"
          aria-label="Đóng chi tiết phòng"
          onClick={onDong}
        >
          ×
        </button>
        <div className="kh-detail-photos">
          <ThuVienAnhKhach
            chiTiet
            anh={phong.anh
              .filter((x): x is string => !!x)
              .map((url) => ({ url, ten: phong.ten_phong }))}
            onMo={onMo}
          />
        </div>
        <div className="kh-detail-info">
          <span className="kh-detail-eyebrow">{phong.ten_loai}</span>
          <h2 id="kh-detail-title">{phong.ten_phong}</h2>
          <p>{phong.mo_ta || "Khám phá không gian qua bộ ảnh phòng."}</p>
          <div className="kh-detail-facts">
            <span>{phong.suc_chua} khách</span>
            {phong.dien_tich_m2 && <span>{phong.dien_tich_m2} m²</span>}
          </div>
          <section>
            <h3>Địa điểm lưu trú</h3>
            <strong>{phong.ten_homestay}</strong>
            <p>
              {[phong.dia_chi, phong.tinh_thanh].filter(Boolean).join(", ")}
            </p>
          </section>
          {phong.tien_nghi?.length ? (
            <section>
              <h3>Tiện nghi trong phòng</h3>
              <div className="kh-detail-amenities">
                {phong.tien_nghi.map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
            </section>
          ) : null}
          <section>
            <h3>Thông tin đặt phòng</h3>
            <div className="kh-detail-times">
              <span>
                Nhận phòng<strong>{nhan}</strong>
              </span>
              <span>
                Trả phòng<strong>{tra}</strong>
              </span>
            </div>
            <small>Thời gian và giá theo khoảng bạn đang chọn.</small>
          </section>
          <div className="kh-detail-price">
            <strong>
              {Number(phong.tien_phong).toLocaleString("vi-VN")} ₫
            </strong>
            <small> / khoảng đặt</small>
          </div>
          <button className="kh-detail-book" onClick={onDat}>
            Đặt phòng này <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

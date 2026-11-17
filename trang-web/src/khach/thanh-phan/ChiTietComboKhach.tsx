import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ComboGioiThieu, PhongKhach } from "./GioiThieuLuuTru";
import ThuVienAnhKhach from "./ThuVienAnhKhach";
import BangGiaPhong from "./BangGiaPhong";
export default function ChiTietComboKhach({
  combo,
  phong,
  onDong,
  onChon,
  onMo,
}: {
  combo: ComboGioiThieu;
  phong: PhongKhach[];
  onDong: () => void;
  onChon: () => void;
  onMo: (url: string) => void;
}) {
  const ref = useRef<HTMLElement>(null),
    close = useRef(onDong);
  close.current = onDong;
  const rooms = phong.filter(
    (p) =>
      combo.pham_vi === "toan_he_thong" ||
      (combo.pham_vi === "phong" && combo.phong_ids?.includes(p.id)) ||
      (combo.pham_vi === "chi_nhanh" &&
        !!p.homestay_id &&
        combo.chi_nhanh_ids?.includes(p.homestay_id)),
  );
  const [roomId, setRoomId] = useState(rooms[0]?.id || "");
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (document.querySelector(".anh-phong-noi")) return;
      if (e.key === "Escape") close.current();
      if (e.key === "Tab") {
        const items = Array.from(
            ref.current?.querySelectorAll<HTMLElement>(
              'button,select,[tabindex="0"]',
            ) || [],
          ),
          first = items[0],
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
  const selected = rooms.find((p) => p.id === roomId);
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
        aria-labelledby="kh-combo-title"
      >
        <button
          className="kh-detail-close"
          aria-label="Đóng chi tiết combo"
          onClick={onDong}
        >
          ×
        </button>
        <div className="kh-detail-photos">
          <ThuVienAnhKhach
            chiTiet
            anh={combo.anh
              .filter((x): x is string => !!x)
              .map((url) => ({ url, ten: combo.ten_combo }))}
            onMo={onMo}
          />
        </div>
        <div className="kh-detail-info">
          <span>Combo lưu trú</span>
          <h2 id="kh-combo-title">{combo.ten_combo}</h2>
          <p>{combo.mo_ta}</p>
          <section>
            <h3>Giá combo</h3>
            <strong className="kh-combo-price">
              {Number(combo.gia_combo).toLocaleString("vi-VN")} ₫
            </strong>
            <p>
              {combo.so_gio_bao_gom
                ? "Bao gồm " +
                  combo.so_gio_bao_gom +
                  " giờ lưu trú. Giờ vượt gói tính theo phụ thu của phòng."
                : "Giá dịch vụ cộng vào tiền phòng theo lịch đã chọn."}
            </p>
            {combo.bat_dau && (
              <small>
                Từ {new Date(combo.bat_dau).toLocaleDateString("vi-VN")}
              </small>
            )}
            {combo.ket_thuc && (
              <small>
                {" "}
                đến {new Date(combo.ket_thuc).toLocaleDateString("vi-VN")}
              </small>
            )}
          </section>
          {rooms.length > 0 && (
            <label className="kh-combo-room-price">
              Xem giá & phụ thu theo phòng
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              >
                {rooms.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.ten_homestay} · {p.ten_phong}
                  </option>
                ))}
              </select>
            </label>
          )}
          {selected && <BangGiaPhong phong={selected} />}
          <p>
            Chọn lịch để kiểm tra phòng trống, điều kiện áp dụng và tổng giá.
          </p>
          <button type="button" className="kh-detail-book" onClick={onChon}>
            Chọn lịch áp dụng →
          </button>
        </div>
      </section>
    </div>,
    document.body,
  );
}

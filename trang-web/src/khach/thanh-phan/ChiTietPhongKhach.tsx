import BangGiaPhong from "./BangGiaPhong";
import type { PhongKhach } from "./GioiThieuLuuTru";
import ThuVienAnhKhach from "./ThuVienAnhKhach";
import BieuTuong from "../../dung-chung/giao-dien/BieuTuong";
export default function ChiTietPhongKhach({
  phong,
  onDat,
  onMo,
  dangKiemTra = false,
  phongKhac = [],
  onXem,
}: {
  dangKiemTra?: boolean;
  phongKhac?: PhongKhach[];
  onXem?: (phong: PhongKhach) => void;
  phong: PhongKhach;
  onDat: () => void;
  onMo: (url: string) => void;
}) {
  return (
    <article className="kh-room-page" aria-labelledby="kh-detail-title">
      <a className="kh-room-back" href="/phong-gia">
        ← Phòng & Giá
      </a>
      <div className="kh-room-page-top">
        <div className="kh-room-page-photos">
          <ThuVienAnhKhach
            chiTiet
            anh={phong.anh
              .filter((x): x is string => !!x)
              .map((url) => ({ url, ten: phong.ten_phong }))}
            onMo={onMo}
          />
        </div>
        <div className="kh-room-page-booking">
          <span className="kh-detail-eyebrow">
            {phong.ten_loai} · {phong.ma_phong}
          </span>
          <h1 id="kh-detail-title">{phong.ten_phong}</h1>
          <p className="kh-room-page-address">
            {phong.ten_homestay}
            <br />
            {[phong.dia_chi, phong.tinh_thanh].filter(Boolean).join(", ")}
          </p>
          <div className="kh-room-page-facts">
            <span>
              <BieuTuong ten="users" />
              {phong.suc_chua} khách
            </span>
            {phong.dien_tich_m2 && <span>{phong.dien_tich_m2} m²</span>}
          </div>
          <BangGiaPhong phong={phong} />
          {!phong.gia_tham_khao && (
            <p className="kh-room-search-price">
              Khoảng đã tìm:{" "}
              <strong>
                {Number(phong.tien_phong).toLocaleString("vi-VN")} ₫
              </strong>
            </p>
          )}
          <button
            type="button"
            className="kh-detail-book"
            disabled={dangKiemTra}
            onClick={onDat}
          >
            {dangKiemTra ? "Đang kiểm tra lịch…" : "Đặt phòng này"}{" "}
            <span aria-hidden="true">→</span>
          </button>
          <small>Chọn lịch để kiểm tra phòng trống và tổng tiền.</small>
        </div>
      </div>
      <section className="kh-room-page-description">
        <h2>Thông tin chi tiết</h2>
        <p>{phong.mo_ta?.trim() || "Phòng chưa có mô tả chi tiết."}</p>
        {!!phong.tien_nghi?.length && (
          <div className="kh-room-page-amenities">
            <h3>Tiện nghi trong phòng</h3>
            <ul>
              {phong.tien_nghi.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        )}
      </section>
      {!!phongKhac.length && (
        <section className="kh-room-related">
          <header>
            <h2>Các phòng khác</h2>
            <a href="/phong-gia">Xem tất cả →</a>
          </header>
          <div>
            {phongKhac.map((p) => (
              <article key={p.id}>
                <button
                  type="button"
                  aria-label={"Xem phòng " + p.ten_phong}
                  onClick={() => onXem?.({ ...p, gia_tham_khao: true })}
                >
                  {p.anh.find(Boolean) ? (
                    <img
                      src={p.anh.find(Boolean)!}
                      alt={p.ten_phong}
                      loading="lazy"
                    />
                  ) : (
                    <span className="kh-related-no-photo">
                      Chưa có ảnh phòng
                    </span>
                  )}
                  <span className="kh-related-copy">
                    <small>{p.ten_homestay}</small>
                    <strong>{p.ten_phong}</strong>
                    <span>
                      {Number(p.gia_moi_ngay) > 0
                        ? Number(p.gia_moi_ngay).toLocaleString("vi-VN") +
                          " ₫ / ngày"
                        : "Xem giá phòng"}
                    </span>
                  </span>
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

import type { PhongKhach } from "./GioiThieuLuuTru";
export default function BangGiaPhong({
  phong,
}: {
  phong: Partial<PhongKhach>;
}) {
  const money = (n: number | string) =>
    Number(n).toLocaleString("vi-VN") + " ₫";
  const rows = [
    phong.cho_dat_theo_gio !== false && phong.gia_moi_gio != null
      ? [
          "Theo giờ",
          money(phong.gia_moi_gio) +
            " / " +
            (phong.so_gio_toi_thieu || 1) +
            " giờ đầu",
        ]
      : null,
    phong.cho_dat_theo_ngay !== false && phong.gia_moi_ngay != null
      ? ["Theo ngày", money(phong.gia_moi_ngay) + " / khung ngày"]
      : null,
    phong.cho_dat_theo_dem !== false && phong.gia_moi_dem != null
      ? ["Qua đêm", money(phong.gia_moi_dem) + " / đêm"]
      : null,
    phong.cho_dat_theo_gio !== false && phong.gia_phu_thu_gio != null
      ? ["Phụ thu giờ tiếp theo", money(phong.gia_phu_thu_gio) + " / giờ"]
      : null,
  ].filter((x): x is string[] => !!x);
  return rows.length ? (
    <section className="kh-room-prices">
      <h3>Giá phòng & phụ thu</h3>
      <dl>
        {rows.map(([name, value]) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <small>
        Giá cơ bản tham khảo. Giá theo lịch và tổng thanh toán được tính lại khi
        kiểm tra phòng.
      </small>
    </section>
  ) : null;
}

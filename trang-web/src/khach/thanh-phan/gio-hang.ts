/** Only locally created receipts are kept for anonymous visitors, never phone-based order lookup. */
export type DonGioHang = {
  ma_dat_phong: string;
  trang_thai: string;
  het_han_giu_cho?: string | null;
};
export const khoaGioHang = "homestay_guest_pending_orders";
export function donChuaHoanThanh(d: DonGioHang, now = Date.now()) {
  if (
    ![
      "Chờ thanh toán",
      "Chờ xác nhận",
      "Đã xác nhận",
      "Đã nhận phòng",
    ].includes(d.trang_thai)
  )
    return false;
  return (
    !["Chờ thanh toán", "Chờ xác nhận"].includes(d.trang_thai) ||
    !d.het_han_giu_cho ||
    Date.parse(d.het_han_giu_cho) > now
  );
}
export function docDonCucBo(): DonGioHang[] {
  try {
    const raw: unknown = JSON.parse(
      sessionStorage.getItem(khoaGioHang) || "[]",
    );
    return Array.isArray(raw)
      ? raw
          .filter(
            (d): d is DonGioHang =>
              !!d &&
              typeof d.ma_dat_phong === "string" &&
              typeof d.trang_thai === "string" &&
              (d.het_han_giu_cho == null ||
                typeof d.het_han_giu_cho === "string"),
          )
          .slice(-100)
      : [];
  } catch {
    return [];
  }
}
export function nhoDonCucBo(d: DonGioHang) {
  try {
    sessionStorage.setItem(
      khoaGioHang,
      JSON.stringify([
        ...docDonCucBo().filter(
          (x) => x.ma_dat_phong !== d.ma_dat_phong && donChuaHoanThanh(x),
        ),
        d,
      ]),
    );
  } catch {
    /* Storage may be disabled; the current receipt remains available. */
  }
}

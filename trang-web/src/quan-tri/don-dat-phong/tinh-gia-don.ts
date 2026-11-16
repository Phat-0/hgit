export type GiaPhong = {
  so_gio_toi_thieu: number;
  gia_moi_gio: number | string;
  gia_moi_ngay: number | string;
  gia_moi_dem: number | string;
  gia_phu_thu_gio: number | string;
};
export function tinhGiaDon(
  room: GiaPhong | undefined,
  kind: string,
  start: Date,
  end: Date,
  hours: Record<string, string>,
  combo?: { gia_combo: number | string; so_gio_bao_gom: number | null },
) {
  if (
    !room ||
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    end <= start
  )
    return 0;
  const duration = (end.getTime() - start.getTime()) / 3600000,
    extra = Number(room.gia_phu_thu_gio) || 0;
  if (kind === "gio")
    return combo?.so_gio_bao_gom
      ? Number(combo.gia_combo) +
          Math.max(0, Math.ceil(duration) - combo.so_gio_bao_gom) * extra
      : Number(room.gia_moi_gio) +
          Math.max(
            0,
            Math.ceil(duration) -
              Math.max(1, Number(room.so_gio_toi_thieu) || 1),
          ) *
            extra +
          (Number(combo?.gia_combo) || 0);
  const clock = (v: string) =>
    Number(v?.slice(0, 2) || 0) + Number(v?.slice(3, 5) || 0) / 60;
  const base =
      (clock(hours[kind + "_den"]) - clock(hours[kind + "_tu"]) + 24) % 24 ||
      24,
    blocks = Math.max(1, Math.ceil(duration / 24));
  return (
    blocks * Number(kind === "ngay" ? room.gia_moi_ngay : room.gia_moi_dem) +
    Math.ceil(Math.max(0, duration - (blocks - 1) * 24 - base)) * extra +
    (Number(combo?.gia_combo) || 0)
  );
}

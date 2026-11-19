import type { Client } from 'pg';
export async function docChiTietDon(
  c: Pick<Client, 'query'>,
  d: Record<string, any>,
): Promise<Record<string, any>> {
  const rows = (
    await c.query(
      'SELECT id,loai_muc,phong_id,combo_id,dich_vu_id,ten_muc_chot,so_luong,don_gia_chot,thanh_tien,du_lieu_chot FROM public.chi_tiet_dat_phong WHERE dat_phong_id=$1 ORDER BY thu_tu,id',
      [d.id],
    )
  ).rows;
  const combos = rows
    .filter((r) => r.loai_muc === 'combo')
    .map((r) => ({
      id: r.combo_id,
      ten_combo: r.ten_muc_chot,
      gia_combo: Number(r.don_gia_chot),
      so_gio_bao_gom: r.du_lieu_chot?.so_gio_bao_gom,
      gia_chua_xac_dinh: r.du_lieu_chot?.gia_chua_xac_dinh,
    }));
  return {
    ...d,
    chi_tiet: rows,
    combo_da_chon: combos,
    cau_hinh_gia_chot: {
      ...d.cau_hinh_gia_chot,
      combo_ids: combos.map((c) => c.id),
      combo_da_chon: combos,
    },
  };
}

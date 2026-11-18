import type { KhachDb } from '../khach-hang/ket-noi.service.js';
// Call only while holding the conversation row lock, within the send/mode transaction.
export async function assignStaff(c: KhachDb, id: string, staff: string) {
  await c.query(
    'UPDATE public.phan_cong_tro_chuyen SET ket_thuc_luc=now() WHERE cuoc_tro_chuyen_id=$1 AND ket_thuc_luc IS NULL AND nhan_vien_id<>$2',
    [id, staff],
  );
  await c.query(
    'INSERT INTO public.phan_cong_tro_chuyen(cuoc_tro_chuyen_id,nhan_vien_id) SELECT $1,$2 WHERE NOT EXISTS(SELECT 1 FROM public.phan_cong_tro_chuyen WHERE cuoc_tro_chuyen_id=$1 AND ket_thuc_luc IS NULL AND nhan_vien_id=$2)',
    [id, staff],
  );
}
export async function releaseStaff(c: KhachDb, id: string) {
  await c.query(
    'UPDATE public.phan_cong_tro_chuyen SET ket_thuc_luc=now() WHERE cuoc_tro_chuyen_id=$1 AND ket_thuc_luc IS NULL',
    [id],
  );
}
export async function resumeUnassigned(c: KhachDb, id: string) {
  const result = await c.query(
    `UPDATE public.cuoc_tro_chuyen t SET che_do_xu_ly='AI hỗ trợ' WHERE t.id=$1 AND t.loai='ho_tro' AND t.trang_thai='Đang mở' AND t.che_do_xu_ly='Nhân viên tiếp quản'
    AND EXISTS(SELECT 1 FROM public.chatbot_cau_hinh WHERE id=true AND bat)
    AND NOT EXISTS(SELECT 1 FROM public.phan_cong_tro_chuyen WHERE cuoc_tro_chuyen_id=t.id AND ket_thuc_luc IS NULL)
    AND NOT EXISTS(SELECT 1 FROM public.chatbot_tac_vu WHERE cuoc_tro_chuyen_id=t.id)
    AND NOT EXISTS(SELECT 1 FROM public.tep_tin_chat WHERE cuoc_tro_chuyen_id=t.id)
    AND NOT EXISTS(SELECT 1 FROM public.tin_nhan WHERE cuoc_tro_chuyen_id=t.id AND loai_nguoi_gui='Nhân viên' AND ngay_gui>now()-interval '30 minutes') RETURNING id`,
    [id],
  );
  return !!result.rowCount;
}

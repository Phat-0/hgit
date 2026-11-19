export const KHOA_CHUYEN_DONG='homestay_motion';
export type CheDoChuyenDong='system'|'full'|'off';
export function docCheDoChuyenDong():CheDoChuyenDong{try{const value=localStorage.getItem(KHOA_CHUYEN_DONG);return value==='full'||value==='off'?value:'system';}catch{return 'system';}}
export function giamChuyenDong(){const mode=docCheDoChuyenDong();return mode==='off'||(mode==='system'&&matchMedia('(prefers-reduced-motion: reduce)').matches);}

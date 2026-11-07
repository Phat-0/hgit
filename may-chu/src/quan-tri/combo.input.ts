import { BadRequestException } from '@nestjs/common';
export const UUID_COMBO =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function docCombo(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new BadRequestException('Dữ liệu combo không hợp lệ');
  const x = body as Record<string, unknown>;
  const allowed = [
    'giu_anh',
    'ten_combo',
    'gia_combo',
    'mo_ta',
    'so_gio_bao_gom',
    'bat_dau',
    'ket_thuc',
    'pham_vi',
    'chi_nhanh_ids',
    'phong_ids',
    'trang_thai',
  ];
  if (Object.keys(x).some((k) => !allowed.includes(k)))
    throw new BadRequestException('Trường combo không hợp lệ');
  const name = typeof x.ten_combo === 'string' ? x.ten_combo.trim() : '',
    description = typeof x.mo_ta === 'string' ? x.mo_ta.trim() : '';
  const price = Number(x.gia_combo),
    hours =
      x.so_gio_bao_gom == null || x.so_gio_bao_gom === ''
        ? null
        : Number(x.so_gio_bao_gom);
  if (!name || name.length > 150 || description.length > 5000)
    throw new BadRequestException(
      'Tên tối đa 150 ký tự, chi tiết tối đa 5.000 ký tự',
    );
  if (
    x.gia_combo == null ||
    x.gia_combo === '' ||
    !Number.isSafeInteger(price) ||
    price < 0 ||
    price > 1e12
  )
    throw new BadRequestException('Giá combo không hợp lệ');
  if (hours !== null && (!Number.isInteger(hours) || hours < 1 || hours > 744))
    throw new BadRequestException('Số giờ combo phải từ 1 đến 744');
  const scope = String(x.pham_vi),
    state = String(x.trang_thai);
  if (
    !['toan_he_thong', 'chi_nhanh', 'phong'].includes(scope) ||
    !['Đang bán', 'Tạm ngưng'].includes(state)
  )
    throw new BadRequestException('Phạm vi hoặc trạng thái không hợp lệ');
  const ids = (v: unknown) => {
    if (
      !Array.isArray(v) ||
      v.length > 1000 ||
      v.some((id) => typeof id !== 'string' || !UUID_COMBO.test(id))
    )
      throw new BadRequestException('Danh sách chi nhánh/phòng không hợp lệ');
    return [...new Set(v as string[])];
  };
  const branches = ids(x.chi_nhanh_ids ?? []),
    rooms = ids(x.phong_ids ?? []);
  if (
    (scope === 'chi_nhanh' && !branches.length) ||
    (scope === 'phong' && !rooms.length)
  )
    throw new BadRequestException(
      'Chọn ít nhất một chi nhánh hoặc phòng áp dụng',
    );
  const start = new Date(String(x.bat_dau || '')),
    end = new Date(String(x.ket_thuc || ''));
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    start >= end
  )
    throw new BadRequestException(
      'Thời gian kết thúc phải sau thời gian bắt đầu',
    );
  const keepImages = x.giu_anh === undefined ? undefined : x.giu_anh;
  if (
    keepImages !== undefined &&
    (!Array.isArray(keepImages) ||
      keepImages.length > 8 ||
      keepImages.some((v) => typeof v !== 'string' || v.length > 512))
  )
    throw new BadRequestException('Danh sách ảnh giữ lại không hợp lệ');
  return {
    keepImages: keepImages as string[] | undefined,
    name,
    description,
    price,
    hours,
    scope,
    state,
    branches: scope === 'chi_nhanh' ? branches : [],
    rooms: scope === 'phong' ? rooms : [],
    start: start.toISOString(),
    end: end.toISOString(),
  };
}
// Dùng cùng điều kiện cho danh sách tùy chọn và kiểm tra khi ghi đơn.
export const PHAM_VI_COMBO = `(co.pham_vi='toan_he_thong' OR co.pham_vi='chi_nhanh' AND EXISTS(SELECT 1 FROM public.combo_chi_nhanh cc WHERE cc.combo_id=co.id AND cc.homestay_id=$2) OR co.pham_vi='phong' AND EXISTS(SELECT 1 FROM public.combo_phong cp WHERE cp.combo_id=co.id AND cp.phong_id=$3))`;
export const COMBO_THEO_PHONG = `SELECT co.id FROM public.combo co WHERE co.id=$1 AND ${PHAM_VI_COMBO}`;

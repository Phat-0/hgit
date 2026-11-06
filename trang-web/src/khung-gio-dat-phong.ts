// Dùng chung quy tắc khoảng ngày của trang Lịch và biểu mẫu tạo đơn.
// Ngày cuối được chọn là ngày bắt đầu khung cuối; nếu khung qua nửa đêm,
// giờ kết thúc nằm ở ngày kế tiếp. Lưu timestamp có múi giờ Việt Nam.
export function khoangThoiGianLich(
  kind: 'ngay' | 'gio' | 'qua-dem',
  startDate: string,
  endDate: string,
  startTime: string,
  endTime: string,
) {
  const crossesMidnight = kind !== 'gio' && endTime <= startTime;
  const finalDate = crossesMidnight
    ? new Date(new Date(endDate + 'T12:00:00+07:00').getTime() + 86400000).toISOString().slice(0, 10)
    : endDate;
  return {
    start: new Date(startDate + 'T' + startTime + ':00+07:00'),
    end: new Date(finalDate + 'T' + endTime + ':00+07:00'),
  };
}

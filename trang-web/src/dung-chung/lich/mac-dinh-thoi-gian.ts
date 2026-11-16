// Mốc thời gian Việt Nam không phụ thuộc locale của Windows/trình duyệt.
export function ngayVietNam(now = new Date()) {
  return new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);
}
export function goiYThoiGian(kind: 'gio'|'ngay'|'dem', config: Record<string,string>, now = new Date()) {
  const today = ngayVietNam(now);
  const tomorrow = ngayVietNam(new Date(now.getTime() + 86400000));
  const open = config[kind+'_tu'], close = config[kind+'_den'];
  if (kind !== 'gio') {
    const day = new Date(today+'T'+open+':00+07:00').getTime() < now.getTime() ? tomorrow : today;
    return {day, endDay:day, start:open, end:close};
  }
  // Bắt đầu ở mốc nửa giờ kế tiếp, không mặc định 08:00 đã qua.
  const slot = new Date(Math.ceil(now.getTime()/1800000)*1800000);
  let day = ngayVietNam(slot);
  let start = new Date(slot.getTime()+7*3600000).toISOString().slice(11,16);
  if(open<close){
    if(start<open)start=open;
    const finish=new Date(day+'T'+start+':00+07:00').getTime()+3600000;
    if(finish>new Date(day+'T'+close+':00+07:00').getTime()){day=tomorrow;start=open;}
  }else if(open>close){if(start>=close&&start<open)start=open;else if(start<close&&new Date(day+'T'+start+':00+07:00').getTime()+3600000>new Date(day+'T'+close+':00+07:00').getTime())start=open;}
  const finish = new Date(day+'T'+start+':00+07:00').getTime()+3600000;
  const end = new Date(finish+7*3600000).toISOString().slice(11,16);
  return {day, endDay:ngayVietNam(new Date(finish)), start, end};
}

// Các ô nhập giá nhận đơn vị nghìn đồng; dữ liệu gửi API luôn là VND.
export function docTienNghin(raw:string):number|null{
 const text=raw.trim().replace(/\s/g,'').replace(/(?:₫|đ|vnd)$/i,'');
 if(!text)return null;
 let value:number;
 // Cho phép dán số tiền VND đã định dạng: 250.000 hoặc 1.250.000.
 if(/^\d{1,3}(?:\.\d{3})+$/.test(text))value=Number(text.replace(/\./g,''));
 else if(/^\d+(?:[,.]\d{1,3})?$/.test(text))value=Math.round(Number(text.replace(',','.'))*1000);
 else return null;
 return Number.isSafeInteger(value)&&value>=0&&value<=99999999999999?value:null;
}
export function hienThiTien(value:string|number){
 if(value==='')return '';
 const amount=Number(value);return Number.isFinite(amount)?amount.toLocaleString('vi-VN',{maximumFractionDigits:0}):'';
}
export function nghinDongDeSua(value:string|number){
 if(value==='')return '';
 const amount=Number(value);return Number.isFinite(amount)?String(amount/1000).replace('.',','):'';
}

export function nhanThanhToan(state:string){
 return state==='Đủ'?{text:'Đã thanh toán',tone:'paid'}:state==='Cọc'?{text:'Đã đặt cọc',tone:'deposit'}:{text:'Chưa thanh toán',tone:'unpaid'};
}
export function maDonGon(code:string){return code.length>16?code.slice(0,5)+'…'+code.slice(-6):code;}
export function mauTrangThaiDon(state:string){
 if(state==='Hoàn thành'||state==='Đã trả phòng')return 'complete';
 if(state==='Đã hủy'||state==='Hết hạn')return 'cancelled';
 if(state==='Không nhận phòng'||state==='Chưa nhận phòng')return 'absent';
 if(state==='Chờ xác nhận'||state==='Chờ thanh toán')return 'pending';
 if(state==='Đã nhận phòng')return 'active';
 return 'waiting';
}

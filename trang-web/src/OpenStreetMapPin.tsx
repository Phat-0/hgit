import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Props={address:string;latitude:string;longitude:string;onChange:(lat:number,lng:number)=>void};
const DEFAULT:[number,number]=[16.0471,108.2068];
export default function OpenStreetMapPin({address,latitude,longitude,onChange}:Props){
 const node=useRef<HTMLDivElement>(null);
 const map=useRef<L.Map|null>(null);
 const pin=useRef<L.CircleMarker|null>(null);
 const callback=useRef(onChange);callback.current=onChange;
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const valid=latitude.trim()!==''&&longitude.trim()!==''&&Number.isFinite(Number(latitude))&&Number.isFinite(Number(longitude));
 useEffect(()=>{
  if(!node.current||map.current)return;
  const initial:L.LatLngExpression=valid?[Number(latitude),Number(longitude)]:DEFAULT;
  const instance=L.map(node.current,{zoomControl:true}).setView(initial,valid?16:6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(instance);
  const marker=L.circleMarker(initial,{radius:9,color:'#5039a8',fillColor:'#8c79e9',fillOpacity:0.9,weight:3}).addTo(instance);
  const select=(lat:number,lng:number)=>{marker.setLatLng([lat,lng]);callback.current(Number(lat.toFixed(7)),Number(lng.toFixed(7)));};
  instance.on('click',e=>select(e.latlng.lat,e.latlng.lng));
  marker.on('mousedown',e=>{L.DomEvent.stopPropagation(e);instance.dragging.disable();
   const move=(ev:L.LeafletMouseEvent)=>marker.setLatLng(ev.latlng);
   const end=(ev:L.LeafletMouseEvent)=>{instance.off('mousemove',move);instance.off('mouseup',end);instance.dragging.enable();select(ev.latlng.lat,ev.latlng.lng);};
   instance.on('mousemove',move);instance.once('mouseup',end);
  });
  map.current=instance;pin.current=marker;
  const timer=window.setTimeout(()=>instance.invalidateSize(),100);
  return ()=>{window.clearTimeout(timer);instance.remove();map.current=null;pin.current=null;};
 },[]);
 useEffect(()=>{
  if(!valid||!map.current||!pin.current)return;
  const p:L.LatLngExpression=[Number(latitude),Number(longitude)];
  pin.current.setLatLng(p);map.current.setView(p,Math.max(map.current.getZoom(),14));
 },[latitude,longitude,valid]);
 async function locate(){
  if(!address.trim()){setMessage('Vui lòng nhập địa chỉ trước khi tìm');return;}
  setBusy(true);setMessage('');
  try{
   const url='https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=vn&q='+encodeURIComponent(address);
   const response=await fetch(url,{headers:{'Accept-Language':'vi'}});
   if(!response.ok)throw new Error('Dịch vụ tìm địa chỉ đang bận, hãy thử lại sau');
   const result=await response.json() as {lat:string;lon:string}[];
   if(!result.length){setMessage('Không tìm thấy địa chỉ chính xác. Bạn có thể nhấn trực tiếp trên bản đồ để đặt ghim.');return;}
   const lat=Number(result[0].lat),lng=Number(result[0].lon);
   map.current?.setView([lat,lng],16);pin.current?.setLatLng([lat,lng]);callback.current(lat,lng);
   setMessage('Đã tìm thấy vị trí. Nhấn lên bản đồ để điều chỉnh nếu cần.');
  }catch(e){setMessage(e instanceof Error?e.message:'Không thể tìm địa chỉ');}
  finally{setBusy(false);}
 }
 return <div className="cn-map-section"><div className="cn-map-title"><strong>📍 Vị trí trên bản đồ *</strong><span>Tìm địa chỉ hoặc nhấn lên bản đồ để đặt ghim. Có thể kéo ghim để điều chỉnh.</span></div><div className="cn-map-canvas" ref={node} style={{height:310,zIndex:0}}/><div className="cn-map-toolbar"><button type="button" className="cn-light" disabled={busy} onClick={()=>void locate()}>{busy?'Đang tìm...':'⌖ Tìm địa chỉ và đặt ghim'}</button><span>{valid?'✓ Đã chọn vị trí':'Chưa chọn vị trí'}</span></div>{message&&<p className="cn-map-message" role="status">{message}</p>}<small>© OpenStreetMap contributors · Tìm kiếm bởi Nominatim (dành cho lưu lượng thử nghiệm thấp)</small></div>;
}

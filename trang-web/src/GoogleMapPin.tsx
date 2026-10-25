import { useEffect, useRef, useState } from 'react';

type Props={address:string;latitude:string;longitude:string;onChange:(lat:number,lng:number)=>void};
type Point={lat:number;lng:number};
type GoogleMaps={
 maps:{
  Map:new (node:HTMLElement,options:Record<string,unknown>)=>MapInstance;
  Marker:new (options:Record<string,unknown>)=>MarkerInstance;
  Geocoder:new ()=>{geocode:(req:{address:string},cb:(results:Array<{geometry:{location:{lat:()=>number;lng:()=>number}}}>|null,status:string)=>void)=>void};
 }
};
type MapInstance={setCenter:(p:Point)=>void;setZoom:(n:number)=>void;addListener:(event:string,cb:(e:{latLng?:{lat:()=>number;lng:()=>number}})=>void)=>void};
type MarkerInstance={setPosition:(p:Point)=>void;addListener:(event:string,cb:()=>void)=>void;getPosition:()=>({lat:()=>number;lng:()=>number}|null)};
declare global {interface Window {google?:GoogleMaps}}
let googleLoader:Promise<void>|null=null;
function loadGoogle(key:string){
 if(window.google?.maps)return Promise.resolve();
 if(!googleLoader)googleLoader=new Promise<void>((resolve,reject)=>{
  const script=document.createElement('script');
  script.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(key)+'&v=weekly';
  script.async=true;script.onload=()=>window.google?.maps?resolve():reject(Error('Không tải được Google Maps'));script.onerror=()=>reject(Error('Không thể kết nối Google Maps'));
  document.head.appendChild(script);
 }).catch(e=>{googleLoader=null;throw e;});
 return googleLoader;
}
export default function GoogleMapPin({address,latitude,longitude,onChange}:Props){
 const key=import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string|undefined;
 const container=useRef<HTMLDivElement>(null);
 const map=useRef<MapInstance|null>(null);
 const marker=useRef<MarkerInstance|null>(null);
 const geocoder=useRef<InstanceType<GoogleMaps['maps']['Geocoder']>|null>(null);
 const [ready,setReady]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const selected=latitude!==''&&longitude!==''&&Number.isFinite(Number(latitude))&&Number.isFinite(Number(longitude));
 const mapsUrl='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(address);
 const callback=useRef(onChange);callback.current=onChange;
 useEffect(()=>{
  if(!key||!container.current)return;
  let cancelled=false;
  loadGoogle(key).then(()=>{
   if(cancelled||!container.current||!window.google)return;
   const g=window.google;
   const initial=selected?{lat:Number(latitude),lng:Number(longitude)}:{lat:16.0471,lng:108.2068};
   const instance=new g.maps.Map(container.current,{center:initial,zoom:selected?16:6,mapTypeControl:false,streetViewControl:false,fullscreenControl:true});
   const pin=new g.maps.Marker({map:instance,position:initial,draggable:true,title:'Kéo ghim để chỉnh vị trí'});
   map.current=instance;marker.current=pin;geocoder.current=new g.maps.Geocoder();
   pin.addListener('dragend',()=>{const p=pin.getPosition();if(p)callback.current(p.lat(),p.lng());});
   instance.addListener('click',(e)=>{if(e.latLng){const p={lat:e.latLng.lat(),lng:e.latLng.lng()};pin.setPosition(p);callback.current(p.lat,p.lng);}});
   setReady(true);
  }).catch(e=>{if(!cancelled)setMessage(e instanceof Error?e.message:'Không tải được bản đồ');});
  return ()=>{cancelled=true;map.current=null;marker.current=null;geocoder.current=null;setReady(false);};
 // Only initialize map once per key
 },[key]);
 useEffect(()=>{if(!ready||!selected||!map.current||!marker.current)return;const p={lat:Number(latitude),lng:Number(longitude)};marker.current.setPosition(p);map.current.setCenter(p);},[latitude,longitude,ready]);
 function locate(){
  if(!address.trim()){setMessage('Vui lòng nhập đầy đủ địa chỉ, tỉnh/thành và phường/xã');return;}
  if(!geocoder.current||!map.current||!marker.current){setMessage('Google Maps chưa sẵn sàng');return;}
  setBusy(true);setMessage('');
  geocoder.current.geocode({address},(results,status)=>{
   setBusy(false);
   if(status!=='OK'||!results?.length){setMessage('Không tìm thấy địa chỉ. Hãy kiểm tra lại hoặc chọn điểm thủ công trên bản đồ.');return;}
   const p={lat:results[0].geometry.location.lat(),lng:results[0].geometry.location.lng()};
   map.current?.setCenter(p);map.current?.setZoom(17);marker.current?.setPosition(p);callback.current(p.lat,p.lng);
   setMessage('Đã định vị địa chỉ. Kéo ghim hoặc nhấn lên bản đồ để chỉnh chính xác.');
  });
 }
 return <div className="cn-map-section">
  <div className="cn-map-title"><strong>📍 Vị trí chi nhánh trên Google Maps *</strong><span>Nhập địa chỉ phía trên, nhấn “Tìm địa chỉ” để đặt ghim tự động, sau đó kéo ghim để chỉnh lại.</span></div>
  {key?<><div className="cn-map-canvas" ref={container}/><div className="cn-map-toolbar"><button type="button" className="cn-light" disabled={!ready||busy} onClick={locate}>{busy?'Đang tìm...':'⌖ Tìm địa chỉ và đặt ghim'}</button><span>{selected?'✓ Đã chọn vị trí':'Chưa chọn vị trí'}</span></div></>:<div className="cn-map-unconfigured"><strong>Google Maps chưa được cấu hình</strong><p>Để định vị tự động và kéo ghim trực tiếp, cần cấu hình khóa Google Maps JavaScript API và Geocoding API trong file <code>trang-web/.env.local</code>.</p><a href={mapsUrl} target="_blank" rel="noopener noreferrer">Xem địa chỉ trên Google Maps ↗</a></div>}
  {message&&<p className="cn-map-message" role="status">{message}</p>}
 </div>;
}

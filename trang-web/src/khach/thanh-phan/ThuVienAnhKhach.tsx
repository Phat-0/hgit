import { useEffect, useRef, useState } from 'react';
import BieuTuong from '../../dung-chung/giao-dien/BieuTuong';
export default function ThuVienAnhKhach({anh,onMo}:{anh:{url:string;ten:string}[];onMo:(url:string)=>void}) {
  const [index,setIndex]=useState(0);
  const touch=useRef<{x:number;y:number}|null>(null),swiped=useRef(false);
  const photos=anh.filter((p,i,all)=>p.url&&all.findIndex(x=>x.url===p.url)===i);
  useEffect(()=>setIndex(0),[anh[0]?.url]);
  const activeIndex=Math.min(index,photos.length-1);
  const selected=photos[activeIndex];
  if(!selected)return null;
  return <div className="kh-gallery" aria-label="Không gian lưu trú">
    {photos.length>1&&<div className="kh-gallery-stack" aria-hidden="true"><img src={photos[(activeIndex+1)%photos.length].url} alt=""/><img src={photos[(activeIndex+photos.length-1)%photos.length].url} alt=""/></div>}
    <button onTouchStart={e=>{touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY};swiped.current=false;}} onTouchEnd={e=>{if(touch.current===null)return;const delta=e.changedTouches[0].clientX-touch.current.x;if(Math.abs(delta)>40&&Math.abs(delta)>Math.abs(e.changedTouches[0].clientY-touch.current.y)&&photos.length>1){swiped.current=true;setIndex((activeIndex+(delta<0?1:photos.length-1))%photos.length);}touch.current=null;requestAnimationFrame(()=>{swiped.current=false;});}} className="kh-cms-photo kh-gallery-main" onClick={()=>{if(swiped.current){swiped.current=false;return;}onMo(selected.url);}} aria-label={'Xem ảnh '+selected.ten}>
      <img key={selected.url} src={selected.url} alt={selected.ten} fetchPriority="high" />
      <span className="kh-gallery-caption"><span>{selected.ten}</span><small>{activeIndex+1} / {photos.length}</small></span>
    </button>
    {photos.length>1&&<div className="kh-gallery-controls"><button type="button" aria-label="Ảnh trước" onClick={()=>setIndex((activeIndex+photos.length-1)%photos.length)}><span className="kh-chevron-back"><BieuTuong ten="chevron"/></span></button>
      <div className="kh-gallery-thumbs">{photos.map((p,i)=><button key={p.url} type="button" aria-label={'Chọn ảnh '+p.ten} aria-pressed={i===activeIndex} onClick={()=>setIndex(i)}><img src={p.url} alt="" loading="lazy"/></button>)}</div>
      <button type="button" aria-label="Ảnh tiếp theo" onClick={()=>setIndex((activeIndex+1)%photos.length)}><BieuTuong ten="chevron"/></button>
    </div>}
  </div>;
}

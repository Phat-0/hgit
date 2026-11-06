import {useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import './anh-phong-noi.css';
export default function AnhPhongNoi({url,title,onClose}:{url:string;title:string;onClose:()=>void}){
 const close=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const before=document.activeElement as HTMLElement|null;close.current?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};document.addEventListener('keydown',key);return()=>{document.removeEventListener('keydown',key);before?.focus();};},[onClose]);
 return createPortal(<div className="anh-phong-noi" role="dialog" aria-modal="true" aria-label="Xem ảnh phòng" onClick={e=>{if(e.target===e.currentTarget)onClose();}}><button type="button" ref={close} onClick={onClose} aria-label="Đóng ảnh">×</button><figure><img src={url} alt={title}/><figcaption>{title}</figcaption></figure></div>,document.body);
}

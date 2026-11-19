import{useLayoutEffect,useState}from'react';
import{docCheDoChuyenDong,giamChuyenDong,KHOA_CHUYEN_DONG,type CheDoChuyenDong}from'../dung-chung/giao-dien/chuyen-dong';
export default function useTuyChonChuyenDong(){
 const[mode,setMode]=useState(docCheDoChuyenDong),[reduced,setReduced]=useState(giamChuyenDong);
 useLayoutEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(giamChuyenDong());document.documentElement.dataset.motionMode=mode;update();media.addEventListener('change',update);return()=>{media.removeEventListener('change',update);};},[mode]);
 const change=(value:CheDoChuyenDong)=>{try{localStorage.setItem(KHOA_CHUYEN_DONG,value);}catch{}document.documentElement.dataset.motionMode=value;setMode(value);setReduced(value==='off'||(value==='system'&&matchMedia('(prefers-reduced-motion: reduce)').matches));};
 return{mode,reduced,change};
}

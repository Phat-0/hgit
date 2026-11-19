import{useLayoutEffect}from'react';
export default function useTuyChonChuyenDong(){useLayoutEffect(()=>{document.documentElement.dataset.motionMode='full';},[]);return{mode:'full' as const,reduced:false};}

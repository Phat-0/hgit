export type TenBieuTuong = 'home'|'search'|'image'|'file'|'close'|'chevron'|'menu'|'message'|'calendar'|'building'|'bed'|'grid'|'gift'|'users'|'star'|'chart'|'logout'|'phone'|'mail'|'globe'|'facebook'|'instagram'|'tiktok'|'zalo';
const paths: Record<TenBieuTuong,string[]> = {
  phone:['M7 3H3v4c0 8 6 14 14 14h4v-4l-5-2-2 2c-3-1-6-4-7-7l2-2z'],
  mail:['M3 5h18v14H3z','m3 5 9 8 9-8'],
  globe:['M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0','M3 12h18M12 3c-5 5-5 13 0 18M12 3c5 5 5 13 0 18'],
  facebook:['M14 21v-8h3l1-4h-4V7c0-1 0-2 2-2h2V2h-3c-4 0-5 2-5 5v2H7v4h3v8'],
  instagram:['M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4','M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M17.5 6.5h.01'],
  tiktok:['M14 3v13a5 5 0 1 1-5-5h1v3H9a2 2 0 1 0 2 2V3z','M14 3c0 4 3 6 7 6V6c-2 0-4-1-4-3'],
  zalo:['M5 3h14a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H9l-5 3 1-4a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3','M8 8h8l-8 7h8'],
  home:['m3 10 9-7 9 7','M5 9v12h14V9','M9 21v-8h6v8'],
  search:['M21 21l-5-5','M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15'],
  image:['M3 3h18v18H3z','m3 17 6-6 5 5 3-3 4 4','M8 7h.01'],
  file:['M14 2H5v20h14V7z','M14 2v6h5','M8 12h8M8 16h6'],
  close:['m6 6 12 12M18 6 6 18'], chevron:['m9 5 7 7-7 7'],
  menu:['M4 6h16M4 12h16M4 18h16'], message:['M21 15a4 4 0 0 1-4 4H8l-5 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3z','M7 8h10M7 12h6'],
  calendar:['M4 5h16v16H4z','M8 3v4M16 3v4M4 10h16M8 14h2M14 14h2'],
  building:['M5 21V3h14v18M3 21h18','M9 7h1M14 7h1M9 11h1M14 11h1M10 21v-6h4v6'],
  bed:['M3 18V9M21 18V9M3 14h18M3 10h18M6 10V6h12v4M7 6v4'],
  grid:['M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z'],
  gift:['M3 8h18v4H3zM5 12v9h14v-9M12 8v13','M12 8H8a3 3 0 1 1 3-3zM12 8h4a3 3 0 1 0-3-3z'],
  users:['M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3M17 14a4 4 0 0 1 5 4v3','M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8M17 3a4 4 0 0 1 0 8'],
  star:['m12 3 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z'],
  chart:['M4 3v18h17M8 16v-4M13 16V7M18 16v-7'],
  logout:['M9 3H4v18h5M10 12h11m-4-4 4 4-4 4'],
};
export default function BieuTuong({ten,size=18}:{ten:TenBieuTuong;size?:number}) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{paths[ten].map((d,i)=><path key={i} d={d}/>)}</svg>;
}

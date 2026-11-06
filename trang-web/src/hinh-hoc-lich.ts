// Tọa độ theo cùng bề rộng thực của lưới; không trừ pixel ở giờ kết thúc.
export function viTriDoanLich(start:number,end:number,viewStart:number,viewEnd:number){
 const from=Math.max(start,viewStart),to=Math.min(end,viewEnd),duration=viewEnd-viewStart;
 if(duration<=0||to<=from)return null;
 return {left:(from-viewStart)/duration*100,width:(to-from)/duration*100};
}

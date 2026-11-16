/** Read-only layout checks, using the isolated API fixture (never production data). */
import { duLieuGiaoDien } from './du-lieu-giao-dien.mjs';
export async function kiemTraGiaoDienToanTrang(page) {
  const original=page.viewportSize();
  await page.setViewportSize({width:1440,height:900});
  await duLieuGiaoDien(page);
  await page.goto('http://localhost:5173/quan-tri');
  await page.getByRole('button', {name:'Tổng quan',exact:true}).waitFor();
  const results=[];
  const pages=['Tổng quan','Lịch','Chi nhánh','Phòng','Loại phòng','Combo','Đơn đặt phòng','Trang chủ','Nhân viên','Tin nhắn','Đánh giá','Báo cáo thống kê'];
  try {
    for(const width of [1440,1024,768,390]) {
      await page.setViewportSize({width,height:900});
      for(const name of pages) {
        if(width<=900) await page.getByRole('button',{name:'Mở menu',exact:true}).click();
        await page.getByRole('button',{name,exact:true}).first().click();
        await page.waitForTimeout(100);
        const result=await page.evaluate(({name,width})=>({
          name,width,overflow:document.documentElement.scrollWidth>innerWidth,
          outside:[...document.querySelectorAll('.qt-content input,.qt-content select,.qt-content button')]
            .filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+2||r.left< -2)
              &&!e.closest('table,[class*=scroll],.dt-columns,.lp-range-portal')
              &&!(e.closest('details:not([open])')&&!e.closest('summary'));})
            .map(e=>e.getAttribute('aria-label')||e.className||e.textContent),
        }),{name,width});
        results.push(result);
        if(result.overflow||result.outside.length)throw Error(JSON.stringify(result));
      }
    }
    return results;
  } finally { if(original)await page.setViewportSize(original); }
}

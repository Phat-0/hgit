/** Run with a Page using isolated guest API fixtures. Does not submit a booking. */
export async function kiemTraTrangChuAnhNoi(page) {
  const original=page.viewportSize(),results=[];
  for(const width of [1440,1024,768,390]) {
    await page.setViewportSize({width,height:1000});
    await page.getByRole('button',{name:'Theo giờ',exact:true}).click();
    const result=await page.evaluate(width=>({
      width,overflow:document.documentElement.scrollWidth>innerWidth,
      light:getComputedStyle(document.querySelector('.kh-search')).backgroundColor,
      heights:[...document.querySelectorAll('.kh-search .kh-kinds,.kh-search select,.kh-search .lp-range-button,.kh-search .cg-trigger')].map(e=>Math.round(e.getBoundingClientRect().height)),
    }),width);
    if(result.overflow||result.heights.some(h=>h!==44))throw Error(JSON.stringify(result));
    results.push(result);
  }
  await page.getByRole('button',{name:'Giờ nhận phòng',exact:true}).click();
  await page.getByRole('button',{name:'15 phút',exact:true}).click();
  if(!(await page.getByRole('button',{name:'Giờ nhận phòng',exact:true}).innerText()).includes(':15'))throw Error('Không chọn được phút');
  await page.getByRole('button',{name:'Giờ trả phòng',exact:true}).click();
  await page.locator('h1').click();
  if(await page.locator('.cg-portal').count())throw Error('Bấm ngoài chưa đóng chọn giờ');
  if(original)await page.setViewportSize(original);
  return results;
}

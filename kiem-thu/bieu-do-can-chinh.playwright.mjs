/** Context dùng duLieuGiaoDien(page), tab Thống kê đã mở. */
export async function kiemTraCanChinhBieuDo(page){
 const check=(v,m)=>{if(!v)throw Error(m)};
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('.tk-toolbar .lp-range-button').click();
 const positions=[];
 for(const month of ['T2','T3','T8','T11']){await page.locator('.lp-month-strip').getByRole('button',{name:month,exact:true}).click();positions.push(await page.locator('.lp-range-portal').boundingBox());check(await page.locator('.lp-calendar-month').first().locator('.lp-calendar-days>*').count()===42,'Luôn 42 ô tháng')}
 check(positions.every(r=>Math.abs(r.y-positions[0].y)<1&&Math.abs(r.height-positions[0].height)<1),'Lịch không nhảy khi đổi tháng');
 await page.locator('.lp-range-close').click();
 await page.locator('.tk-toolbar .tk-scope-picker>summary').click();
 const panel=page.locator('[aria-label="Chọn nhiều đối tượng thống kê"]');
 const widths=await panel.locator(':scope>details>summary').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().width));
 check(widths.every(w=>w<=170),'Khung tên nhóm được thu ngắn');
 await panel.locator(':scope>details>summary').first().click();
 check(await panel.locator('label').first().evaluate(e=>e.getBoundingClientRect().width)<=170,'Ô chọn chỉ ôm tên');await page.mouse.click(4,4);
 await page.locator('.tk-value-chip button').first().dblclick();
 const editor=await page.locator('.tk-column-editor').evaluate(e=>({gap:getComputedStyle(e).gap,padding:getComputedStyle(e).padding}));
 check(editor.gap==='4px'&&editor.padding==='6px','Thiết lập gọn');await page.locator('.tk-column-editor').getByRole('button',{name:'Xong',exact:true}).click();
 await page.getByRole('tab',{name:'Thu chi',exact:true}).click();const charts=page.locator('#panel-thu-chi .stc-charts');
 const calendars=await charts.locator('.lp-range-button').evaluateAll(es=>es.map(e=>getComputedStyle(e).backgroundColor));check(calendars[0]!==calendars[1],'Hai lịch có màu tương ứng');
 const chip=charts.locator('.stc-object-chip').first(),button=chip.locator('button').first();
 check(await chip.getAttribute('data-visible')==='true','Ô đang hiện');await button.click();check(await chip.getAttribute('data-visible')==='false','Ẩn cả ô');await button.click();
 const box=await chip.boundingBox(),btn=await button.boundingBox();check(Math.abs(box.width-btn.width)<4,'Vùng bấm phủ hết ô');check(await button.evaluate(e=>getComputedStyle(e).backgroundColor)==='rgba(0, 0, 0, 0)','Màu trải cả khung cha');
 await charts.getByLabel('Tùy chọn biểu đồ',{exact:true}).click();const sort=charts.getByRole('group',{name:'Sắp xếp biểu đồ',exact:true});check(await sort.locator('select').count()===0&&await sort.getByRole('button').count()===5,'Sắp xếp hiện trực tiếp');await sort.getByRole('button',{name:'Lớn → nhỏ',exact:true}).click();check(await sort.getByRole('button',{name:'Lớn → nhỏ',exact:true}).getAttribute('aria-pressed')==='true','Sắp xếp đã áp dụng');
 const exp=charts.getByRole('group',{name:'Xuất biểu đồ',exact:true});check(await exp.getByRole('button').count()===3,'Ba ô xuất đẹp');const download=page.waitForEvent('download');await exp.getByRole('button').filter({hasText:'CSV'}).click();check((await download).suggestedFilename().endsWith('.csv'),'Xuất CSV thực');check(await charts.locator('.stc-chart-menu').evaluate(e=>!e.open),'Xuất xong đóng menu');
 return {calendarStable:true,monthCells:42,compactWidths:widths,editor,calendarColors:calendars,wholeChip:true,directSort:5,exports:3};
}

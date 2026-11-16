/** duLieuGiaoDien(page), mở Thống kê trong context riêng trước khi chạy. */
export async function kiemTraCotVaDoiTuong(page){
 const check=(v,m)=>{if(!v)throw Error(m)};
 const branches=[1,2].map(i=>({id:'b'+i,ten_homestay:'Chi nhánh '+i}));
 const rooms=branches.flatMap((b,i)=>Array.from({length:7},(_,j)=>({id:'r'+i+j,homestay_id:b.id,ma_phong:'P'+(i+1)+'0'+(j+1),ten_phong:'Tên phòng dài không hiển thị'})));
 await page.route('**/api/quan-tri/thu-chi/thong-ke?*',route=>route.fulfill({json:{chi_nhanh:branches,phong:rooms,dong:[],don:[],tien_ton:[],truoc_thang:[]}}));
 await page.getByRole('button',{name:'↻ Cập nhật',exact:true}).click();
 await page.getByLabel('Đối tượng thống kê',{exact:true}).click();const panel=page.locator('.tk-object-layout'),groups=panel.locator(':scope>details');await groups.nth(0).locator(':scope>summary').click();await groups.nth(1).locator(':scope>summary').click();
 const sizes=[];
 for(const width of [1440,1024,768,390]){await page.setViewportSize({width,height:1000});const g=await groups.locator(':scope>summary').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y}}));check(g[0].x<g[1].x&&Math.abs(g[0].y-g[1].y)<2,'Chi nhánh trái và phòng phải '+width);const branch=panel.locator('.tk-room-all').first();const labels=await branch.locator('label').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width}}));check(labels.length===7&&labels.slice(0,5).every(r=>Math.abs(r.y-labels[0].y)<2)&&labels[5].y>labels[0].y,'5 phòng mỗi hàng '+width);const hs=await panel.locator('.tk-room-all h5').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().x));check(hs.every(x=>Math.abs(x-hs[0])<1),'Chi nhánh căn đều');sizes.push(width)}
 await page.mouse.click(4,4);await page.setViewportSize({width:1440,height:1000});
 check(await page.locator('.tk-calc-group').count()===3,'Ba hàng giá trị đã chọn');
 await page.getByLabel('Chọn giá trị thống kê',{exact:true}).click();check(await page.locator('.tk-value-options').count()===3,'Ba nhóm giá trị xổ ngang');check(await page.locator('.tk-value-options details').count()===0,'Không còn menu thêm lồng');await page.mouse.click(4,4);
 const headers=page.locator('.tk-sheet thead th[data-column-id]');const before=await headers.evaluateAll(es=>es.map(e=>e.dataset.columnId));const chip=page.locator('.tk-value-chip').first(),button=chip.locator('button').first();await button.click();check(await chip.getAttribute('data-visible')==='false'&&await headers.count()===before.length-1,'Bấm ẩn cột');await button.click();check(await headers.count()===before.length,'Bấm hiện cột');const box=await chip.boundingBox(),btn=await button.boundingBox();check(Math.abs(box.width-btn.width)<3,'Ô chọn tô kín khung');
 await headers.first().dragTo(headers.last());const after=await headers.evaluateAll(es=>es.map(e=>e.dataset.columnId));check(after.at(-1)===before[0]&&after.length===before.length,'Kéo chuyển cả cột xuống cuối');
 const chips=page.locator('.tk-value-chip');const moved=await chips.last().locator('button').first().getAttribute('title');check(moved.includes('Thu'),'Thứ tự ô theo cột đã kéo');
 await page.getByRole('tab',{name:'Thu chi',exact:true}).click();const papers=await page.locator('#panel-thu-chi .stc-chart-grid>figure').evaluateAll(es=>es.map(e=>getComputedStyle(e).backgroundColor));check(papers.length===2&&papers[0]!==papers[1],'Hai trang giấy khác màu');
 return{widths:sizes,roomColumns:5,selectedRows:3,toggleColumn:true,dragColumn:true,papers};
}

import {duLieuGiaoDien} from './du-lieu-giao-dien.mjs';
/** All API calls are intercepted in an isolated context. No customer data or provider calls. */
export async function kiemTraChatbotUi(page){
 await duLieuGiaoDien(page);
 const state={co_khoa:true,model:'gemini-3.5-flash-lite',cau_hinh:{bat:false,ten_bot:'Trợ lý HomeStay',huong_dan:'Hỏi rõ nhu cầu.',loi_chuyen:'Đã chuyển nhân viên.',gioi_han_ngay:300,phien_ban:1},kien_thuc:[],nhat_ky:[],hoi_thoai:[]};const previews=[];let writes=0,mode='AI hỗ trợ',toggles=0,proposalCalls=0,approvals=0;
 await page.route(url=>url.pathname.startsWith('/api/quan-tri/chatbot'),async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;let data=state;
  if(req.method()!=='GET'){writes++;const b=req.postDataJSON();
   if(path.endsWith('/kien-thuc')){const old=state.kien_thuc.findIndex(k=>k.id===b.id);const item={...b,id:b.id||`11111111-1111-4111-8111-${String(state.kien_thuc.length+1).padStart(12,'0')}`,phien_ban:(b.phien_ban||0)+1};if(old>=0)state.kien_thuc[old]=item;else state.kien_thuc.push(item);data={ok:true,id:item.id};}
   else if(path.endsWith('/de-xuat')){proposalCalls++;const source=state.kien_thuc.find(x=>!x.tieu_de.startsWith('Tình huống: '));data={id:b.id,phien_ban:b.phien_ban,cau_hoi_mau:[b.cau_hoi],tu_khoa:[],tra_loi:'Bản nháp chỉ từ nội quy đã cho phép.',nguon:[{id:source.id,tieu_de:source.tieu_de,phien_ban:source.phien_ban}]};}
   else if(path.endsWith('/chap-thuan')){approvals++;const row=state.kien_thuc.find(x=>x.id===b.id);row.dieu_kien.cac_tra_loi.push({cau_hoi_mau:b.cau_hoi_mau,tu_khoa:b.tu_khoa,tra_loi:b.tra_loi,nguon_ids:b.nguon.map(x=>x.id)});row.phien_ban++;data={ok:true,id:row.id};}
   else if(path.endsWith('/thu')){previews.push(b);data={text:'Câu trả lời thử theo tình huống đã bật.',tools:['tra_kien_thuc'],handoff:false,tinh_huong_khop:[{ten:'Báo giá',ly_do:'Từ khóa: giá phòng'}]};}
   else{state.cau_hinh={...b,phien_ban:b.phien_ban+1};data={ok:true};}}
  await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
 });
 const support='77777777-7777-4777-8777-777777777777',direct='88888888-8888-4888-8888-888888888888';
 await page.route(url=>url.pathname.startsWith('/api/khach/chat'),async route=>{const req=route.request(),path=new URL(req.url()).pathname;let data={ok:true};
  if(path.endsWith('/chat'))data={hoi_thoai:[{id:support,ten_hien_thi:'Khách kiểm thử',loai:'ho_tro',chua_doc:0},{id:direct,ten_hien_thi:'Tin riêng kiểm thử',loai:'truc_tiep',chua_doc:0}],tong_so:2,tong_chua_doc:0};
  else if(path.endsWith('/tin-nhan'))data={toi:'staff',tin_nhan:[],co_tin_cu:false,duoc_dung_mau:path.includes(support),che_do_ai:path.includes(support)?mode:undefined,co_the_bat_ai:path.includes(support)};
  else if(path.endsWith('/ai')){toggles++;mode=req.postDataJSON().che_do;data={che_do_ai:mode};}
  await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.setViewportSize({width:1440,height:960});await page.goto('http://localhost:5173/quan-tri');await page.getByRole('button',{name:'Chatbot AI',exact:true}).click();
 await page.getByLabel('Tên hiển thị (tùy chọn)',{exact:true}).fill('');await page.getByLabel('Bật trả lời tự động',{exact:true}).check();await page.getByRole('button',{name:'Lưu thiết lập',exact:true}).click();await page.waitForResponse(r=>r.url().endsWith('/api/quan-tri/chatbot') && r.request().method()==='GET');
 await page.getByRole('button',{name:'+ Thêm thông tin',exact:true}).click();await page.getByLabel('Tiêu đề',{exact:true}).fill('Nội quy kiểm thử');await page.getByLabel('Nội dung',{exact:true}).fill('Đối chiếu khung giờ nhận phòng và phụ thu trước khi tư vấn.');await page.getByLabel('Cho phép sử dụng',{exact:true}).check();await page.getByRole('button',{name:'Lưu thông tin',exact:true}).click();await page.locator('.cb-info-editor').waitFor({state:'hidden'});

 await page.locator('.cb-info-item>.cb-entry').click();await page.locator('.cb-info-item .cb-info-editor').waitFor();await page.locator('.cb-info-editor').getByRole('button',{name:'Đóng',exact:true}).click();
 const ruleHeight=await page.getByLabel('Quy tắc chung',{exact:true}).evaluate(e=>e.getBoundingClientRect().height);if(ruleHeight<220)throw new Error('Quy tắc chung chưa phóng to');
 await page.getByRole('button',{name:'Tình huống',exact:true}).click();if(await page.locator('.cb-situation-editor').count())throw new Error('Editor bị mở sẵn');if(await page.locator('.cb-entries').getByText('Nội quy kiểm thử',{exact:true}).count())throw new Error('Thông tin chung lẫn vào tình huống');

 await page.getByRole('button',{name:'+ Thêm',exact:true}).click();await page.getByLabel('Tên tình huống',{exact:true}).fill('Báo giá');await page.getByLabel('Khách hỏi chính',{exact:true}).fill('Cho mình hỏi giá phòng');await page.getByLabel('Bot trả lời chính',{exact:true}).fill('Tra giá trong hệ thống');await page.getByLabel('Từ khóa liên quan',{exact:true}).fill('giá phòng, phụ thu');await page.getByLabel('Bật tình huống',{exact:true}).check();
 await page.getByRole('button',{name:'+ Thêm đối đáp',exact:true}).click();await page.getByLabel('Câu hỏi mục 1',{exact:true}).fill('Nhận phòng lúc nào?');await page.getByLabel('Trả lời mục 1',{exact:true}).fill('Tra khung giờ đã thiết lập.');
 if(await page.locator('.cb-answer-item textarea').count()!==2||await page.locator('.cb-answer-item input,.cb-answer-item select,.cb-answer-item details').count())throw new Error('Đối đáp phải chỉ có hai ô');
 for(const label of ['Mẫu tình huống','Cách khớp từ khóa','Ưu tiên','Suy nghĩ sâu'])if(await page.getByLabel(label,{exact:true}).count())throw new Error('Còn thiết lập thừa '+label);
 await page.getByRole('button',{name:'Lưu',exact:true}).click();await page.locator('.cb-case .cb-situation-editor').waitFor();
 const row=state.kien_thuc.find(x=>x.tieu_de.startsWith('Tình huống: '));if(row.dieu_kien.suy_nghi_sau||row.dieu_kien.uu_tien!==0||row.dieu_kien.kieu_khop!=='bat_ky')throw new Error('Thiết lập mặc định sai');
 await page.locator('.cb-entry').filter({hasText:'Báo giá'}).click();if(await page.locator('.cb-situation-editor').count())throw new Error('Chưa thu gọn tình huống');
 await page.getByRole('button',{name:'+ Thêm',exact:true}).click();await page.getByLabel('Tên tình huống',{exact:true}).fill('Tiện nghi');await page.getByLabel('Khách hỏi chính',{exact:true}).fill('Có máy chiếu không?');await page.getByLabel('Bot trả lời chính',{exact:true}).fill('Tra tiện nghi phòng');await page.getByRole('button',{name:'Lưu',exact:true}).click();await page.locator('.cb-case .cb-situation-editor').waitFor();await page.locator('.cb-entry').filter({hasText:'Tiện nghi'}).click();
 const tiles=await page.locator('.cb-case>.cb-entry').evaluateAll(es=>es.map(e=>({x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y,w:e.getBoundingClientRect().width})));if(tiles.length!==2||Math.abs(tiles[0].y-tiles[1].y)>1)throw new Error('Tình huống không xếp ngang');
 await page.locator('.cb-entry').filter({hasText:'Báo giá'}).click();await page.locator('.cb-situation-editor').waitFor();
 if(!state.cau_hinh.ten_bot)throw new Error('Thiếu tên mặc định');
 if(await page.locator('.cb-tabs').getByRole('button').count()!==4)throw new Error('Thiếu tab');
 const edit=page.locator('.cb-case').filter({has:page.locator('.cb-situation-editor')});if(await edit.count()!==1)throw new Error('Editor không nằm ngay dưới tình huống');
 if(!await edit.locator('.cb-entry').getAttribute('class').then(x=>x.includes('is-enabled')))throw new Error('Thiếu màu bật tình huống');
 await page.getByRole('textbox',{name:'Tin nhắn thử',exact:true}).fill('Mình cần phòng cho 2 người');await page.getByRole('button',{name:'Gửi tin nhắn thử',exact:true}).click();await page.locator('.cb-chat-message.model').waitFor();
 await page.getByRole('textbox',{name:'Tin nhắn thử',exact:true}).fill('Tối mai nhé');await page.getByRole('button',{name:'Gửi tin nhắn thử',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.cb-chat-message.model').length===2);
 if(previews.length!==2||previews[1].lich_su.length!==2||previews[1].lich_su[0].text!=='Mình cần phòng cho 2 người')throw new Error('Chat thử không gửi ngữ cảnh');
 await page.locator('.cb-test').getByRole('button',{name:'Làm mới',exact:true}).click();if(await page.locator('.cb-chat-message').count())throw new Error('Chat thử không xóa');
 const layouts=[];for(const width of [1440,768,390,360]){await page.setViewportSize({width,height:900});for(const tab of ['Thiết lập','Tình huống']){await page.locator('.cb-tabs').getByRole('button',{name:tab,exact:true}).click();const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);if(overflow)throw new Error('Tràn ngang '+width+' '+tab);layouts.push({width,tab,overflow});}}
 await page.setViewportSize({width:1440,height:960});await page.locator('.qt-nav-item[aria-label="Tin nhắn"]').click();await page.locator('.chat-thread').filter({hasText:'Khách kiểm thử'}).click();await page.getByRole('button',{name:'Tắt AI trả lời',exact:true}).click();await page.getByRole('button',{name:'Bật AI trả lời',exact:true}).waitFor();await page.getByRole('button',{name:'Bật AI trả lời',exact:true}).click();await page.getByRole('button',{name:'Tắt AI trả lời',exact:true}).waitFor();await page.locator('.chat-thread').filter({hasText:'Tin riêng kiểm thử'}).click();await page.waitForTimeout(150);if(await page.locator('.chat-ai-toggle:visible').count())throw new Error('Nút AI hiện trong tin riêng');
 return {writes,toggles,layouts,compactPairs:true,inlineEdit:true};
}

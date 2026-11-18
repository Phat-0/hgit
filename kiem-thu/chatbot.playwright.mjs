import {duLieuGiaoDien} from './du-lieu-giao-dien.mjs';
/** Isolated fixture: every API request is intercepted; never writes real data. */
export async function kiemTraChatbotUi(page){
 await duLieuGiaoDien(page);
 const state={co_khoa:true,model:'gemini-3.5-flash-lite',cau_hinh:{bat:false,ten_bot:'Trợ lý HomeStay',huong_dan:'Ngắn gọn, hỏi rõ nhu cầu.',loi_chuyen:'Mình đã chuyển yêu cầu đến nhân viên.',gioi_han_ngay:300,phien_ban:1},kien_thuc:[],nhat_ky:[],hoi_thoai:[]};let writes=0,mode='AI hỗ trợ',toggles=0;
 await page.route(url=>url.pathname.startsWith('/api/quan-tri/chatbot'),async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;let data=state;
  if(req.method()!=='GET'){writes++;const b=req.postDataJSON();
   if(path.endsWith('/kien-thuc')){const old=state.kien_thuc.findIndex(k=>k.id===b.id);const item={...b,id:b.id||'fixture-kb',phien_ban:(b.phien_ban||0)+1};if(old>=0)state.kien_thuc[old]=item;else state.kien_thuc.push(item);data={ok:true};}
   else if(path.endsWith('/thu'))data={text:'Câu trả lời thử theo tình huống đã bật.',tools:['tra_kien_thuc'],handoff:false,tinh_huong_khop:[{ten:'Báo giá',ly_do:'Từ khóa: giá phòng'}]};
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
 await page.getByLabel('Bật trả lời tự động',{exact:true}).check();await page.getByRole('button',{name:'Lưu thiết lập',exact:true}).click();await page.getByText('Đã lưu thiết lập.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Tình huống trả lời',exact:true}).click();await page.getByRole('button',{name:'+ Thêm tình huống',exact:true}).click();
 await page.getByLabel('Mẫu tình huống',{exact:true}).selectOption('Báo giá');await page.getByLabel('Khách thường hỏi như thế nào?',{exact:true}).fill('Cho mình hỏi giá phòng\nPhòng này bao nhiêu tiền?');await page.getByLabel('Từ khóa liên quan',{exact:true}).fill('giá phòng\nphụ thu');await page.getByLabel('Bật tình huống này',{exact:true}).check();await page.getByRole('button',{name:'Lưu tình huống',exact:true}).click();await page.getByText('Đã lưu tình huống.',{exact:true}).waitFor();if(state.kien_thuc[0].dieu_kien?.tu_khoa?.length!==2)throw new Error('Chưa lưu điều kiện khớp');
 await page.getByText('Thử tình huống đã lưu',{exact:true}).click();await page.getByLabel('Câu hỏi của khách',{exact:true}).fill('Cho mình hỏi giá phòng');await page.getByRole('button',{name:'Thử trả lời',exact:true}).click();await page.getByText('Câu trả lời thử theo tình huống đã bật.',{exact:true}).waitFor();
 const layouts=[];for(const width of [1440,768,390,360]){await page.setViewportSize({width,height:900});for(const tab of ['Thiết lập','Tình huống trả lời']){await page.locator('.cb-tabs').getByRole('button',{name:tab,exact:true}).click();const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);if(overflow)throw new Error('Tràn ngang '+width+' '+tab);layouts.push({width,tab,overflow});}}
 await page.setViewportSize({width:1440,height:960});await page.locator('.qt-nav-item[aria-label="Tin nhắn"]').click();await page.locator('.chat-thread').filter({hasText:'Khách kiểm thử'}).click();await page.getByRole('button',{name:'Tắt AI trả lời',exact:true}).click();await page.getByRole('button',{name:'Bật AI trả lời',exact:true}).waitFor();await page.getByRole('button',{name:'Bật AI trả lời',exact:true}).click();await page.getByRole('button',{name:'Tắt AI trả lời',exact:true}).waitFor();
 await page.locator('.chat-thread').filter({hasText:'Tin riêng kiểm thử'}).click();await page.waitForTimeout(150);if(await page.locator('.chat-ai-toggle:visible').count())throw new Error('Nút AI bị hiện trong tin riêng');
 return {writes,toggles,layouts,directHasNoAi:true};
}

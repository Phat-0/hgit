import {duLieuGiaoDien} from './du-lieu-giao-dien.mjs';
/** Isolated UI fixture, no writes reach the real API. */
export async function kiemTraChatbotUi(page){
 await duLieuGiaoDien(page);
 const state={co_khoa:true,model:'gemini-2.5-flash',cau_hinh:{bat:false,ten_bot:'Trợ lý HomeStay',huong_dan:'Tư vấn ngắn gọn, hỏi rõ nhu cầu.',loi_chuyen:'Mình đã chuyển yêu cầu đến nhân viên.',gioi_han_ngay:300,phien_ban:1},kien_thuc:[],nhat_ky:[{id:'fixture-log',trang_thai:'xong',cong_cu:['tra_kien_thuc'],thoi_gian_ms:1250,ngay_tao:new Date().toISOString(),nhu_cau:{tom_tat:'Hai người cần phòng yên tĩnh',so_khach:2}}],hoi_thoai:[{id:'fixture-thread',ma_khach_chat:18,che_do_xu_ly:'Nhân viên tiếp quản',ngay_cap_nhat:new Date().toISOString()}]};let writes=0;
 await page.route(url=>url.pathname.startsWith('/api/quan-tri/chatbot'),async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;let data=state;
  if(req.method()!=='GET'){
   writes++;const b=req.postDataJSON();
   if(path.endsWith('/kien-thuc')){state.kien_thuc.push({...b,id:'fixture-kb',phien_ban:1});data={ok:true};}
   else if(path.endsWith('/thu'))data={text:'Thông tin này được lấy từ kiến thức đã xuất bản.',tools:['tra_kien_thuc'],handoff:false};
   else if(path.includes('/hoi-thoai/')){state.hoi_thoai[0].che_do_xu_ly=b.che_do;data={ok:true};}
   else {state.cau_hinh={...b,phien_ban:b.phien_ban+1};data={ok:true};}
  }
  await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
 });
 await page.setViewportSize({width:1440,height:960});await page.goto('http://localhost:5173/quan-tri');
 await page.getByRole('button',{name:'Chatbot AI',exact:true}).click();await page.getByRole('heading',{name:'Chatbot AI',exact:true}).waitFor();
 await page.getByLabel('Bật trả lời tự động',{exact:true}).check();
 await page.getByLabel('Tên trợ lý',{exact:true}).fill('Trợ lý HomeStay kiểm thử');await page.getByRole('button',{name:'Lưu thiết lập',exact:true}).click();await page.getByText('Đã lưu thiết lập.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Kho kiến thức',exact:true}).click();await page.getByRole('button',{name:'+ Thêm bài',exact:true}).click();
 await page.getByLabel('Tiêu đề',{exact:true}).fill('Quy định nhận phòng');await page.getByLabel('Nội dung',{exact:true}).fill('Thông tin minh họa để kiểm thử, không phải chính sách đang áp dụng.');await page.getByLabel('Xuất bản cho bot sử dụng',{exact:true}).check();await page.getByRole('button',{name:'Lưu bài',exact:true}).click();await page.getByText('Đã lưu bài kiến thức.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Thử trả lời',exact:true}).click();await page.getByLabel('Câu hỏi của khách',{exact:true}).fill('Quy định nhận phòng thế nào?');await page.getByRole('button',{name:'Thử trả lời',exact:true}).last().click();await page.getByText('Thông tin này được lấy từ kiến thức đã xuất bản.',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Hội thoại',exact:true}).click();await page.getByRole('combobox').selectOption('AI hỗ trợ');
 await page.getByRole('button',{name:'Nhật ký',exact:true}).click();await page.getByText('Bản nháp nhu cầu',{exact:true}).click();await page.getByText('Hai người cần phòng yên tĩnh',{exact:true}).waitFor();
 const layouts=[];
 for(const width of [1440,768,390,360]){
  await page.setViewportSize({width,height:900});
  for(const tab of ['Thiết lập','Kho kiến thức','Thử trả lời','Hội thoại','Nhật ký']){
   await page.locator('.cb-tabs').getByRole('button',{name:tab,exact:true}).click();
   const m=await page.locator('.cb-page').evaluate(el=>({pageWidth:document.documentElement.scrollWidth,viewport:innerWidth,content:Math.round(el.getBoundingClientRect().width)}));
   if(m.pageWidth>width+1)throw new Error('Tràn ngang '+width+' '+tab+': '+JSON.stringify(m));layouts.push({width,tab,...m});
  }
 }
 state.co_khoa=false;await page.locator('.cb-tabs').getByRole('button',{name:'Nhật ký',exact:true}).click();await page.getByRole('button',{name:'Làm mới',exact:true}).click();await page.locator('.cb-tabs').getByRole('button',{name:'Thiết lập',exact:true}).click();if(!await page.getByLabel('Bật trả lời tự động',{exact:true}).isDisabled())throw new Error('Cho bật bot khi chưa có khóa');
 return {writes,layouts,noKeyDisabled:true};
}

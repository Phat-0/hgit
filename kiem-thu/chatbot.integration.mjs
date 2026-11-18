import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
/** Called by isolated PGlite suite. Does not contact Gemini or the user's database. */
export async function kiemTraChatbot({db,conn,chat,root,admin,direct}){
 const {ChatbotService}=await import(root+'/may-chu/dist/chatbot/chatbot.service.js');
 const keyBefore=process.env.GEMINI_API_KEY;
 process.env.GEMINI_API_KEY='isolated-test-key';
 const forbidden={kiemTraQuanTri:async()=>{throw new Error('Không có quyền');}};
 await assert.rejects(()=>new ChatbotService(conn,forbidden,{}).read(admin),/Không có quyền/);
 const adminAccess={kiemTraQuanTri:async()=>({duoc_phep:true})};
 const bot=new ChatbotService(conn,adminAccess,{});
 const configBefore=(await db.query('SELECT * FROM public.chatbot_cau_hinh')).rows[0];
 await bot.knowledge(admin,{tieu_de:'Thử FAQ',nhom:'Câu hỏi thường gặp',noi_dung:'Nội dung chính xác để thử',xuat_ban:false});
 let kb=(await db.query("SELECT * FROM public.chatbot_kien_thuc WHERE tieu_de='Thử FAQ'")).rows[0];
 await bot.knowledge(admin,{...kb,xuat_ban:true});
 await assert.rejects(()=>bot.knowledge(admin,{...kb,noi_dung:'Ghi đè'}),/đã thay đổi/);
 await bot.knowledge(admin,{tieu_de:'Tình huống: Chào hỏi',nhom:'Hướng dẫn đặt phòng',noi_dung:'CHAO_KHACH_DUNG_TRONG_TAM',xuat_ban:true});
 await bot.knowledge(admin,{tieu_de:'Tình huống: Nháp',nhom:'Hướng dẫn đặt phòng',noi_dung:'KHONG_DUOC_GUI_BAN_NHAP',xuat_ban:false});
 await assert.rejects(()=>bot.knowledge(admin,{tieu_de:'Tình huống: Dài',nhom:'Hướng dẫn đặt phòng',noi_dung:'a'.repeat(1001),xuat_ban:true}));
 const relatedRule={cau_hoi_mau:['Có chỗ gửi xe không?'],tu_khoa:['gửi xe','bãi xe'],kieu_khop:'bat_ky',uu_tien:10,cac_tra_loi:[{cau_hoi_mau:['Xe máy gửi ở đâu?'],tu_khoa:['xe máy'],tra_loi:'CHI_TRA_LOI_XE_MAY'},{cau_hoi_mau:['Ô tô gửi ở đâu?'],tu_khoa:['ô tô'],tra_loi:'CHI_TRA_LOI_O_TO'}]};
 await bot.knowledge(admin,{tieu_de:'Tình huống: Gửi xe',nhom:'Dịch vụ',noi_dung:'CHI_HUONG_DAN_GUI_XE',xuat_ban:true,dieu_kien:relatedRule});
 const related=(await db.query("SELECT * FROM public.chatbot_kien_thuc WHERE tieu_de='Tình huống: Gửi xe'")).rows[0];assert.deepEqual(related.dieu_kien,relatedRule);
 await bot.knowledge(admin,{id:related.id,phien_ban:related.phien_ban,tieu_de:related.tieu_de,nhom:related.nhom,noi_dung:related.noi_dung,xuat_ban:true});assert.deepEqual((await db.query('SELECT dieu_kien FROM public.chatbot_kien_thuc WHERE id=$1',[related.id])).rows[0].dieu_kien,relatedRule);
 const originalFetch=globalThis.fetch;let capturedPrompt='',providerRound=0;
 try{
   globalThis.fetch=async(url,init)=>{capturedPrompt=JSON.parse(init.body).systemInstruction.parts[0].text;return new Response(JSON.stringify({candidates:[{content:{role:'model',parts:providerRound++===0?[{functionCall:{name:'tra_kien_thuc',args:{tu_khoa:'chào'}}}]:[{text:'Chào bạn, mình có thể giúp gì?'}]},finishReason:'STOP'}]}));};
   const previewBot=new ChatbotService(conn,adminAccess,{run:async()=>({noi_dung:'Chào bạn'})});
   await previewBot.preview(admin,{cau_hoi:'Xin chào'});
   assert.ok(capturedPrompt.includes('CHAO_KHACH_DUNG_TRONG_TAM'));assert.ok(!capturedPrompt.includes('KHONG_DUOC_GUI_BAN_NHAP'));assert.ok(!capturedPrompt.includes('CHI_HUONG_DAN_GUI_XE'));providerRound=0;const matchedReply=await previewBot.preview(admin,{cau_hoi:'Cho minh hoi bai xe o dau'});assert.ok(capturedPrompt.includes('CHI_HUONG_DAN_GUI_XE'));assert.ok(!capturedPrompt.includes('CHAO_KHACH_DUNG_TRONG_TAM'));assert.equal(matchedReply.tinh_huong_khop[0].ten,'Gửi xe');providerRound=0;const childReply=await previewBot.preview(admin,{cau_hoi:'Xe máy gửi ở đâu?'});assert.ok(capturedPrompt.includes('CHI_TRA_LOI_XE_MAY'));assert.ok(!capturedPrompt.includes('CHI_TRA_LOI_O_TO'));assert.equal(childReply.tinh_huong_khop[0].ten,'Gửi xe / Cách trả lời 1');
 }finally{globalThis.fetch=originalFetch;}
 // Deep proposals never save themselves. Approval is explicit and checks both versions and allowed sources.
 const {ChatbotDeXuatService}=await import(root+'/may-chu/dist/chatbot/de-xuat.service.js');
 const drafts=new ChatbotDeXuatService(conn,adminAccess);
 const sourceDoc=(await db.query("SELECT * FROM public.chatbot_kien_thuc WHERE tieu_de='Thử FAQ'")).rows[0];
 const deepCase=await bot.knowledge(admin,{tieu_de:'Tình huống: Hướng dẫn có nguồn',nhom:'Hướng dẫn đặt phòng',noi_dung:'Chỉ dựa trên nguồn đã cho phép',xuat_ban:false,dieu_kien:{suy_nghi_sau:true,nguon_ids:[sourceDoc.id]}});
 let deepRow=(await db.query('SELECT * FROM public.chatbot_kien_thuc WHERE id=$1',[deepCase.id])).rows[0];
 const fetchBeforeDraft=globalThis.fetch;let draftRound=0;
 try{globalThis.fetch=async(_url,init)=>{const body=JSON.parse(init.body);assert.equal(body.generationConfig.maxOutputTokens,4096);if(draftRound===0)assert.ok(!JSON.stringify(body).includes('KHONG_DUOC_GUI_BAN_NHAP'));return new Response(JSON.stringify({candidates:[{content:{role:'model',parts:draftRound++===0?[{functionCall:{name:'doc_tai_lieu',args:{}}}]:[{text:'Câu trả lời đề xuất từ nguồn được duyệt'}]},finishReason:'STOP'}]}));};
  const draft=await drafts.generate(admin,{id:deepCase.id,phien_ban:deepRow.phien_ban,cau_hoi:'Xin hướng dẫn'});
  assert.equal((await db.query('SELECT dieu_kien FROM public.chatbot_kien_thuc WHERE id=$1',[deepCase.id])).rows[0].dieu_kien.cac_tra_loi,undefined);
  await drafts.approve(admin,{...draft,tra_loi:'Nội dung đã được nhân viên kiểm tra'});
  deepRow=(await db.query('SELECT * FROM public.chatbot_kien_thuc WHERE id=$1',[deepCase.id])).rows[0];assert.equal(deepRow.dieu_kien.cac_tra_loi[0].tra_loi,'Nội dung đã được nhân viên kiểm tra');assert.deepEqual(deepRow.dieu_kien.cac_tra_loi[0].nguon_ids,[sourceDoc.id]);assert.equal(deepRow.xuat_ban,false);
  await assert.rejects(()=>drafts.approve(admin,draft),/đã thay đổi/);
  const stale={...draft,phien_ban:deepRow.phien_ban};await db.query('UPDATE public.chatbot_kien_thuc SET phien_ban=phien_ban+1 WHERE id=$1',[sourceDoc.id]);await assert.rejects(()=>drafts.approve(admin,stale),/Tài liệu đã thay đổi/);
  await db.query('UPDATE public.chatbot_kien_thuc SET xuat_ban=false WHERE id=$1',[sourceDoc.id]);await assert.rejects(()=>drafts.approve(admin,stale),/Tài liệu đã thay đổi/);await assert.rejects(()=>drafts.generate(admin,{id:deepCase.id,phien_ban:deepRow.phien_ban,cau_hoi:'Hỏi lại'}),/Có nguồn đã tắt/);await assert.rejects(()=>drafts.approve(admin,{...stale,nguon:[{id:related.id,phien_ban:related.phien_ban}]}),/không thuộc phạm vi/);
 }finally{globalThis.fetch=fetchBeforeDraft;}
 await db.query('UPDATE public.chatbot_cau_hinh SET bat=true');
 const support=await chat.start({});
 const send=async(text='Tìm phòng')=>chat.send(support.id,{noi_dung:text,ma_phia_khach:randomUUID()},undefined,support.guest_token);
 const countAI=async()=>Number((await db.query("SELECT count(*) n FROM public.tin_nhan WHERE cuoc_tro_chuyen_id=$1 AND loai_nguoi_gui='AI'",[support.id])).rows[0].n);
 const source={noi_dung:'Phòng yên tĩnh cho hai người',ma_phia_khach:randomUUID()};
 await chat.send(support.id,source,undefined,support.guest_token);await chat.send(support.id,source,undefined,support.guest_token);
 assert.equal((await db.query('SELECT count(*)::int n FROM public.chatbot_tac_vu WHERE cuoc_tro_chuyen_id=$1',[support.id])).rows[0].n,1);
 bot.answer=async()=>({text:'Thông tin đã kiểm tra.',tools:['xem_danh_muc'],tokens:20,handoff:false,needs:{tom_tat:'Hai người',so_khach:2}});
 await bot.tick();await bot.tick();assert.equal(await countAI(),1);
 assert.equal((await db.query('SELECT nhu_cau FROM public.chatbot_tac_vu WHERE cuoc_tro_chuyen_id=$1',[support.id])).rows[0].nhu_cau.so_khach,2);
 assert.match((await chat.messages(support.id,undefined,support.guest_token)).tin_nhan.at(-1).ten_nguoi_gui,/AI/);
 // Two guest messages: discard stale job, answer only newest.
 await send('Tin cũ');await send('Tin mới');await bot.tick();assert.equal(await countAI(),1);await bot.tick();assert.equal(await countAI(),2);
 // Human sends while provider is in-flight. Final row lock/check suppresses reply.
 await send('Cần nhân viên');bot.answer=async()=>{await chat.send(support.id,{noi_dung:'Nhân viên đã tiếp nhận',ma_phia_khach:randomUUID()},'admin');return {text:'Không được gửi câu này',tools:[],tokens:0,handoff:false};};
 await bot.tick();assert.equal(await countAI(),2);assert.equal((await db.query('SELECT che_do_xu_ly FROM public.cuoc_tro_chuyen WHERE id=$1',[support.id])).rows[0].che_do_xu_ly,'Nhân viên tiếp quản');
 const jobsBefore=Number((await db.query('SELECT count(*) n FROM public.chatbot_tac_vu')).rows[0].n);
 await send('Nhắn thêm khi có nhân viên');await chat.send(direct.id,{noi_dung:'Tin riêng không gửi AI',ma_phia_khach:randomUUID()},'a');
 assert.equal(Number((await db.query('SELECT count(*) n FROM public.chatbot_tac_vu')).rows[0].n),jobsBefore);
 // Rate cap is per minute; age test jobs to permit independent error tests.
 await db.query("UPDATE public.chatbot_tac_vu SET ngay_tao=now()-interval '2 minutes'");
 await bot.mode(admin,support.id,'AI hỗ trợ');await send('Lỗi provider');bot.answer=async()=>{throw new Error('PRIVATE PROVIDER DETAILS');};await bot.tick();assert.equal(await countAI(),3);
 const fallback=(await chat.messages(support.id,undefined,support.guest_token)).tin_nhan.at(-1).noi_dung;assert.equal(fallback,configBefore.loi_chuyen);assert.ok(!fallback.includes('PRIVATE'));
 // Configuration changed during network request: discard answer.
 await bot.mode(admin,support.id,'AI hỗ trợ');await send('Thiết lập thay đổi');bot.answer=async()=>{await db.query('UPDATE public.chatbot_cau_hinh SET phien_ban=phien_ban+1');return {text:'Cũ',handoff:false,tools:[],tokens:0};};await bot.tick();assert.equal(await countAI(),3);
 // A dead worker's expired lease is reclaimable, with a single final reply.
 await send('Khôi phục tác vụ');const pending=(await db.query("SELECT id FROM public.chatbot_tac_vu WHERE cuoc_tro_chuyen_id=$1 AND trang_thai='cho' ORDER BY ngay_tao DESC LIMIT 1",[support.id])).rows[0];
 await db.query("UPDATE public.chatbot_tac_vu SET trang_thai='dang_chay',khoa=$2,han_khoa=now()-interval '1 second' WHERE id=$1",[pending.id,randomUUID()]);bot.answer=async()=>({text:'Đã khôi phục.',handoff:false,tools:['xem_danh_muc'],tokens:5});await bot.tick();assert.equal(await countAI(),4);
 // Staff toggle cancels both pending/in-flight jobs; customers and DMs cannot change it.
 await assert.rejects(()=>chat.aiMode(support.id,'Nhân viên tiếp quản',undefined,support.guest_token));
 await assert.rejects(()=>chat.aiMode(direct.id,'Nhân viên tiếp quản','admin'));
 await chat.aiMode(support.id,'AI hỗ trợ','admin');await send('Tắt AI đang chờ');
 await chat.aiMode(support.id,'Nhân viên tiếp quản','admin');
 assert.equal((await db.query("SELECT count(*)::int n FROM public.chatbot_tac_vu WHERE cuoc_tro_chuyen_id=$1 AND trang_thai IN ('cho','dang_chay')",[support.id])).rows[0].n,0);
 let metadata=await chat.messages(support.id,'admin');assert.equal(metadata.che_do_ai,'Nhân viên tiếp quản');assert.equal(metadata.co_the_bat_ai,true);
 assert.equal((await chat.messages(support.id,undefined,support.guest_token)).che_do_ai,undefined);
 await db.query("UPDATE public.chatbot_tac_vu SET ngay_tao=now()-interval '2 minutes'");
 await chat.aiMode(support.id,'AI hỗ trợ','admin');await send('Tắt trong lúc đang tạo câu trả lời');
 bot.answer=async()=>{await chat.aiMode(support.id,'Nhân viên tiếp quản','admin');await chat.aiMode(support.id,'AI hỗ trợ','admin');return {text:'Không được gửi',tools:[],tokens:0,handoff:false};};
 await bot.tick();assert.equal(await countAI(),4);
 await db.query('UPDATE public.chatbot_cau_hinh SET bat=false');await send('Bot đã tắt');await bot.tick();assert.equal(await countAI(),4);
 assert.equal((await db.query("SELECT count(*)::int n FROM pg_policies WHERE schemaname='public' AND tablename LIKE 'chatbot_%'")).rows[0].n,0);
 for(const role of ['anon','authenticated'])for(const table of ['chatbot_cau_hinh','chatbot_kien_thuc','chatbot_tac_vu'])assert.equal((await db.query('SELECT has_table_privilege($1,$2,\'SELECT\') allowed',[role,'public.'+table])).rows[0].allowed,false);
 if(keyBefore===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=keyBefore;
 console.log('PASS Chatbot: config/FAQ phiên bản, quyền backend/RLS, hàng đợi chống lặp, tin mới thay cũ, human takeover khi đang gọi AI, lỗi an toàn, đổi cấu hình, khôi phục lease và bản nháp nhu cầu.');
}

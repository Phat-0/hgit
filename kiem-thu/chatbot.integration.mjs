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
 await db.query('UPDATE public.chatbot_cau_hinh SET bat=false');await send('Bot đã tắt');await bot.tick();assert.equal(await countAI(),4);
 assert.equal((await db.query("SELECT count(*)::int n FROM pg_policies WHERE schemaname='public' AND tablename LIKE 'chatbot_%'")).rows[0].n,0);
 for(const role of ['anon','authenticated'])for(const table of ['chatbot_cau_hinh','chatbot_kien_thuc','chatbot_tac_vu'])assert.equal((await db.query('SELECT has_table_privilege($1,$2,\'SELECT\') allowed',[role,'public.'+table])).rows[0].allowed,false);
 if(keyBefore===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=keyBefore;
 console.log('PASS Chatbot: config/FAQ phiên bản, quyền backend/RLS, hàng đợi chống lặp, tin mới thay cũ, human takeover khi đang gọi AI, lỗi an toàn, đổi cấu hình, khôi phục lease và bản nháp nhu cầu.');
}

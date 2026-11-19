import assert from'node:assert/strict';import{randomUUID}from'node:crypto';
export async function kiemTraTomTatKhach({db,root,connection,admin,uid,other}){
 const{TomTatKhachService}=await import(root+'/may-chu/dist/quan-tri/tom-tat-khach.service.js');
 const api=new TomTatKhachService({kiemTraQuanTri:async id=>{if(id!==admin)throw Error('Không có quyền')}});api.db=connection;api.model=()=> 'fixture-model';let calls=0;
 const thread=randomUUID(),otherThread=randomUUID(),directThread=randomUUID(),message=randomUUID();
 for(const[id,owner,kind]of[[thread,uid,'ho_tro'],[otherThread,other,'ho_tro'],[directThread,uid,'truc_tiep']])await db.query("INSERT INTO public.cuoc_tro_chuyen(id,khach_hang_id,loai,trang_thai) VALUES($1,$2,$3,'Đã đóng')",[id,owner,kind]);
 for(const[id,t,sender,kind,text]of[[message,thread,uid,'Khách hàng','Tôi muốn phòng có máy chiếu. Liên hệ 0901234567 hoặc guest@example.invalid'],[randomUUID(),thread,admin,'Nhân viên','STAFF_SECRET'],[randomUUID(),otherThread,other,'Khách hàng','OTHER_SECRET'],[randomUUID(),directThread,uid,'Khách hàng','DIRECT_SECRET']])await db.query('INSERT INTO public.tin_nhan(id,cuoc_tro_chuyen_id,nguoi_gui_id,loai_nguoi_gui,noi_dung) VALUES($1,$2,$3,$4,$5)',[id,t,sender,kind,text]);
 await db.query("INSERT INTO public.ho_so_khach_hang(khach_khoa,nguoi_dung_id,dong_y_phan_tich_ai,thong_tin_bo_sung) VALUES($1,$2,false,'{}') ON CONFLICT(nguoi_dung_id) DO UPDATE SET dong_y_phan_tich_ai=false",['u:'+uid,uid]);
 const oldKey=process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY='fixture-key';
 try{
  await assert.rejects(()=>api.read(other,'u:'+uid),/Không có quyền/);
  await assert.rejects(()=>api.summarize(other,'u:'+uid),/Không có quyền/);
  await assert.rejects(()=>api.summarize(admin,'p:0901234567'),/tài khoản/);
  await assert.rejects(()=>api.summarize(admin,'u:'+uid),/đồng ý/);assert.equal(calls,0);
  await db.query("UPDATE public.ho_so_khach_hang SET dong_y_phan_tich_ai=true,thong_tin_bo_sung=thong_tin_bo_sung||'{\"bang_chung_dong_y\":\"Khách đã xác nhận\"}' WHERE nguoi_dung_id=$1",[uid]);
  const preferencesBefore=(await db.query('SELECT count(*)::int n FROM public.so_thich_khach_hang')).rows[0].n;
  api.generate=async messages=>{calls++;const text=JSON.stringify(messages);for(const secret of['STAFF_SECRET','OTHER_SECRET','DIRECT_SECRET','0901234567','guest@example.invalid'])assert.ok(!text.includes(secret),secret);assert.ok(messages.some(m=>m.id===message));return {cau_hoi:[],yeu_cau:[{noi_dung:'Muốn phòng có máy chiếu',nguon:[{id:message,trich_dan:'Tôi muốn phòng có máy chiếu.'}]}]};};
  await api.consent(admin,'u:'+uid,{dong_y:true,nguon:'Khách xác nhận trực tiếp'});
  await assert.rejects(()=>api.consent(other,'u:'+uid,{dong_y:true,nguon:'Giả'}),/Không có quyền/);
  await db.query('UPDATE public.ho_so_khach_hang SET ngan_sach_du_kien=550000 WHERE nguoi_dung_id=$1',[uid]);
  const result=await api.summarize(admin,'u:'+uid);assert.equal(calls,1);assert.equal(Number(result.ngan_sach),550000);assert.ok(Array.isArray(result.loai_dat)&&Array.isArray(result.thoi_gian)&&Array.isArray(result.ghi_chu));assert.equal(result.tom_tat.yeu_cau[0].nguon[0].id,message);assert.ok(result.tom_tat.so_tin>0);
  const cached=await api.read(admin,'u:'+uid);assert.deepEqual(cached.tom_tat,result.tom_tat);assert.equal(calls,1);
  assert.equal((await db.query('SELECT count(*)::int n FROM public.so_thich_khach_hang')).rows[0].n,preferencesBefore);
  await assert.rejects(()=>api.summarize(admin,'u:'+uid),/một phút/);assert.equal(calls,1);
  await db.query("UPDATE public.phan_tich_ai SET ngay_tao=now()-interval '2 minutes' WHERE ket_qua->>'khach_id'=$1",[uid]);
  api.generate=async()=>{await db.query('UPDATE public.ho_so_khach_hang SET dong_y_phan_tich_ai=false WHERE nguoi_dung_id=$1',[uid]);return {cau_hoi:[],yeu_cau:[]}};
  await assert.rejects(()=>api.summarize(admin,'u:'+uid),/tắt đồng ý/);
  const rows=(await db.query("SELECT ket_qua->>'trang_thai' state FROM public.phan_tich_ai WHERE ket_qua->>'khach_id'=$1 ORDER BY ngay_tao DESC",[uid])).rows;assert.equal(rows[0].state,'loi');assert.ok(rows.some(x=>x.state==='xong'));
  console.log('PASS tóm tắt khách: phân quyền/đồng ý, chỉ chat hỗ trợ đúng chủ, không nhân viên/chat riêng/khách khác, che email-SĐT, lưu nguồn/cache/chặn lặp/không tự sửa sở thích và hủy khi rút đồng ý.');
 }finally{if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;}
}

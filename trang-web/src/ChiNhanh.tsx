import { useCallback, useEffect, useState } from 'react';
import diaGioi from './du-lieu/don-vi-hanh-chinh.json';
import OpenStreetMapPin from './OpenStreetMapPin.js';

type ChiNhanh={id:string;ten_homestay:string;mo_ta:string|null;dia_chi:string;tinh_thanh:string;phuong_xa:string|null;so_dien_tho:string|null;vi_do:string|null;kinh_do:string|null;trang_thai:string;so_phong:number;ngay_tao:string;ngay_cap_nhat:string};
type Input={ten_homestay:string;mo_ta:string;dia_chi:string;tinh_thanh:string;phuong_xa:string;so_dien_tho:string;vi_do:string;kinh_do:string;trang_thai:string};
type Page={du_lieu:ChiNhanh[];tong_so:number;trang:number;gioi_han:number};
type DonVi={code:string;name:string};
const provinces=diaGioi.map(p=>({code:p.code,name:p.name}));
const states=['Chờ duyệt','Đang hoạt động','Tạm ngưng','Ngừng kinh doanh'];
const blank:Input={ten_homestay:'',mo_ta:'',dia_chi:'',tinh_thanh:'',phuong_xa:'',so_dien_tho:'',vi_do:'',kinh_do:'',trang_thai:'Chờ duyệt'};
async function request<T>(token:string,url:string,method='GET',body?:unknown):Promise<T>{
 const response=await fetch('/api/quan-tri/chi-nhanh'+url,{method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 const result=await response.json().catch(()=>({})) as {message?:string|string[]};
 if(!response.ok)throw new Error(Array.isArray(result.message)?result.message.join(', '):result.message||'Yêu cầu thất bại (HTTP '+response.status+')');
 return result as T;
}
function mapInput(x:ChiNhanh):Input{return {ten_homestay:x.ten_homestay,mo_ta:x.mo_ta||'',dia_chi:x.dia_chi,tinh_thanh:x.tinh_thanh,phuong_xa:x.phuong_xa||'',so_dien_tho:x.so_dien_tho||'',vi_do:x.vi_do??'',kinh_do:x.kinh_do??'',trang_thai:x.trang_thai};}
export default function ChiNhanhPage({token}:{token:string}){
 const [wards,setWards]=useState<DonVi[]>([]);
 const [data,setData]=useState<Page|null>(null);const [page,setPage]=useState(1);
 const [filter,setFilter]=useState('');const [query,setQuery]=useState('');const [status,setStatus]=useState('');
 const [loading,setLoading]=useState(true);const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');const [success,setSuccess]=useState('');
 const [modal,setModal]=useState<'create'|'edit'|'view'|'delete'|null>(null);
 const [menuId,setMenuId]=useState<string|null>(null);
 const [selected,setSelected]=useState<ChiNhanh|null>(null);const [form,setForm]=useState<Input>(blank);
 const load=useCallback(async()=>{
  setLoading(true);setError('');
  try{
   const params=new URLSearchParams({tim:query,trang_thai:status,trang:String(page),gioi_han:'10'});
   const result=await request<Page>(token,'?'+params);
   setData(result);
  }catch(e){setError(e instanceof Error?e.message:'Không tải được dữ liệu');}
  finally{setLoading(false);}
 },[token,query,status,page]);
 useEffect(()=>{void load();},[load]);
 useEffect(()=>{const p=diaGioi.find(x=>x.name===form.tinh_thanh);setWards(p?.wards??[]);},[form.tinh_thanh]);

 function open(mode:'create'|'edit'|'view'|'delete',item?:ChiNhanh){
  setError('');setSuccess('');setSelected(item??null);setForm(item?mapInput(item):{...blank});setModal(mode);setMenuId(null);
 }
 function close(){if(!busy)setModal(null);}
 async function submit(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError('');setSuccess('');
  try{
   const payload={...form,ten_homestay:form.ten_homestay.trim(),dia_chi:form.dia_chi.trim(),tinh_thanh:form.tinh_thanh.trim(),mo_ta:form.mo_ta.trim()||null,phuong_xa:form.phuong_xa.trim()||null,so_dien_tho:form.so_dien_tho.trim()||null,vi_do:form.vi_do.trim()===''?null:Number(form.vi_do),kinh_do:form.kinh_do.trim()===''?null:Number(form.kinh_do)};
   if(form.vi_do.trim()!==''&&!Number.isFinite(payload.vi_do)||form.kinh_do.trim()!==''&&!Number.isFinite(payload.kinh_do))throw new Error('Tọa độ không hợp lệ');
   if(!provinces.some(p=>p.name===form.tinh_thanh))throw new Error('Vui lòng chọn tỉnh/thành từ danh sách mới');
   if(!form.phuong_xa||!wards.some(w=>w.name===form.phuong_xa))throw new Error('Vui lòng chọn phường/xã từ danh sách mới');
   if(!form.vi_do||!form.kinh_do)throw new Error('Hãy chọn vị trí trên bản đồ trước khi lưu');
   if(modal==='edit'&&selected)await request(token,'/'+selected.id,'PUT',payload);
   else await request(token,'','POST',payload);
   setSuccess(modal==='edit'?'Đã cập nhật chi nhánh':'Đã thêm chi nhánh mới');setModal(null);setPage(1);await load();
  }catch(e){setError(e instanceof Error?e.message:'Không thể lưu chi nhánh');}
  finally{setBusy(false);}
 }
 async function remove(){
  if(!selected)return;setBusy(true);setError('');setSuccess('');
  try{await request(token,'/'+selected.id,'DELETE');setModal(null);setSuccess('Đã xóa chi nhánh');if(data?.du_lieu.length===1&&page>1)setPage(page-1);else await load();}
  catch(e){setError(e instanceof Error?e.message:'Không thể xóa chi nhánh');}
  finally{setBusy(false);}
 }
 const totalPages=Math.max(1,Math.ceil((data?.tong_so??0)/10));
 return <section className="cn-page">
  <div className="cn-heading"><button className="cn-primary" onClick={()=>open('create')}>＋ Thêm chi nhánh</button></div>
  <div className="cn-panel"><form className="cn-filters cn-filters-compact" onSubmit={e=>{e.preventDefault();setPage(1);setQuery(filter);}}>
   <input aria-label="Tìm kiếm chi nhánh" placeholder="Tìm tên, địa chỉ, tỉnh/thành..." value={filter} onChange={e=>setFilter(e.target.value)} maxLength={150}/>
   <select aria-label="Lọc trạng thái" value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}><option value="">Tất cả trạng thái</option>{states.map(s=><option key={s}>{s}</option>)}</select>
   <button type="submit">Tìm kiếm</button><button type="button" className="cn-light" onClick={()=>{setFilter('');setQuery('');setStatus('');setPage(1);}}>Đặt lại</button>
  </form>
  {success&&<p className="cn-success" role="status">{success}</p>}
  {error&&!modal&&<p className="cn-error" role="alert">{error}</p>}
  <div className="cn-table-wrap" onClick={e=>{if(menuId&&!(e.target as HTMLElement).closest('.cn-menu-wrap'))setMenuId(null);}}>{!loading&&!error&&data?.tong_so===0?<div className="cn-empty-state"><span>⌂</span><h3>Chưa có chi nhánh nào</h3><p>Nhấn “Thêm chi nhánh” để tạo cơ sở đầu tiên.</p><button className="cn-primary" onClick={()=>open('create')}>＋ Thêm chi nhánh</button></div>:<table className="cn-table"><thead><tr><th>Tên cơ sở</th><th>Địa chỉ</th><th>Số phòng</th><th>Trạng thái</th><th aria-label="Tùy chọn"></th></tr></thead><tbody>
   {loading?<tr><td colSpan={5} className="cn-empty">Đang tải dữ liệu...</td></tr>:data?.du_lieu.length?data.du_lieu.map(item=><tr key={item.id}>
    <td><div className="cn-name"><span className="cn-branch-icon">⌂</span><div><strong>{item.ten_homestay}</strong><small>{item.tinh_thanh}</small></div></div></td>
    <td className="cn-address">{item.dia_chi}</td><td>{item.so_phong}</td>
    <td><span className={'cn-status '+(item.trang_thai==='Đang hoạt động'?'cn-active':item.trang_thai==='Chờ duyệt'?'cn-pending':'cn-inactive')}>{item.trang_thai}</span></td>
    <td className="cn-menu-cell"><div className="cn-menu-wrap"><button type="button" className="cn-menu-trigger" aria-label={'Tùy chọn '+item.ten_homestay} aria-expanded={menuId===item.id} onClick={()=>setMenuId(menuId===item.id?null:item.id)}>⋮</button>{menuId===item.id&&<div className="cn-menu" role="menu"><button type="button" role="menuitem" onClick={()=>open('view',item)}>Xem chi tiết</button><button type="button" role="menuitem" onClick={()=>open('edit',item)}>Chỉnh sửa</button><button type="button" role="menuitem" className="cn-danger-text" onClick={()=>open('delete',item)}>Xóa</button></div>}</div></td>
   </tr>):<tr><td colSpan={5} className="cn-empty">Không tìm thấy chi nhánh phù hợp.</td></tr>}
  </tbody></table>}</div>
  <div className="cn-pagination"><span>{data?.tong_so??0} kết quả</span><div><button disabled={page===1||loading} onClick={()=>setPage(page-1)}>‹ Trước</button><span>Trang {page} / {totalPages}</span><button disabled={page>=totalPages||loading} onClick={()=>setPage(page+1)}>Sau ›</button></div></div>
  </div>
  {modal&&<div className="cn-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)close();}}><div className="cn-dialog" role="dialog" aria-modal="true" aria-label={modal==='create'?'Thêm chi nhánh':modal==='edit'?'Sửa chi nhánh':modal==='delete'?'Xóa chi nhánh':'Chi tiết chi nhánh'}>
   <div className="cn-dialog-header"><div><h3>{modal==='create'?'Thêm chi nhánh mới':modal==='edit'?'Chỉnh sửa chi nhánh':modal==='delete'?'Xác nhận xóa chi nhánh':'Thông tin chi nhánh'}</h3></div><button className="cn-close" onClick={close} aria-label="Đóng">×</button></div>
   {error&&<p className="cn-error" role="alert">{error}</p>}
   {modal==='delete'?<div className="cn-confirm"><p>Bạn có chắc chắn muốn xóa <strong>{selected?.ten_homestay}</strong>?</p><p>Thao tác không thể hoàn tác. Nếu chi nhánh đã có phòng, đơn đặt hoặc dữ liệu liên quan, hệ thống sẽ từ chối xóa để bảo vệ dữ liệu.</p><div className="cn-form-actions"><button className="cn-light" onClick={close}>Hủy</button><button className="cn-danger" disabled={busy} onClick={()=>void remove()}>{busy?'Đang xóa...':'Xóa chi nhánh'}</button></div></div>:
   modal==='view'&&selected?<div className="cn-details">{([['Tên chi nhánh',selected.ten_homestay],['Địa chỉ',selected.dia_chi],['Tỉnh / thành',selected.tinh_thanh],['Phường / xã',selected.phuong_xa],['Mô tả',selected.mo_ta],['Vị trí trên bản đồ',selected.vi_do&&selected.kinh_do?'Đã ghim':'Chưa có ghim'],['Trạng thái',selected.trang_thai],['Số phòng',String(selected.so_phong)],] as [string,string|null][]).map(([k,v])=><div key={k}><span>{k}</span><strong>{v||'—'}</strong></div>)}<div className="cn-form-actions"><button className="cn-light" onClick={close}>Đóng</button><button className="cn-primary" onClick={()=>open('edit',selected)}>Chỉnh sửa</button></div></div>:
   <form className="cn-form" onSubmit={e=>void submit(e)}>
    <div className="cn-field"><label htmlFor="cn-ten">Tên chi nhánh *</label><input id="cn-ten" required minLength={2} maxLength={200} value={form.ten_homestay} onChange={e=>setForm({...form,ten_homestay:e.target.value})}/></div>
    <div className="cn-field"><label htmlFor="cn-dia-chi">Địa chỉ *</label><input id="cn-dia-chi" required minLength={3} maxLength={500} value={form.dia_chi} onChange={e=>setForm({...form,dia_chi:e.target.value})}/></div>
    <div className="cn-form-grid"><div className="cn-field"><label htmlFor="cn-tinh">Tỉnh / thành phố *</label><select id="cn-tinh" required value={form.tinh_thanh} onChange={e=>setForm({...form,tinh_thanh:e.target.value,phuong_xa:'',vi_do:'',kinh_do:''})}><option value="">Chọn tỉnh / thành phố</option>{form.tinh_thanh&&!provinces.some(p=>p.name===form.tinh_thanh)&&<option value={form.tinh_thanh}>{form.tinh_thanh} (địa chỉ cũ)</option>}{provinces.map(p=><option key={p.code} value={p.name}>{p.name}</option>)}</select></div><div className="cn-field"><label htmlFor="cn-phuong">Phường / xã *</label><select id="cn-phuong" required disabled={!form.tinh_thanh} value={form.phuong_xa} onChange={e=>setForm({...form,phuong_xa:e.target.value,vi_do:'',kinh_do:''})}><option value="">Chọn phường / xã</option>{form.phuong_xa&&!wards.some(w=>w.name===form.phuong_xa)&&<option value={form.phuong_xa}>{form.phuong_xa} (cần cập nhật)</option>}{wards.map(w=><option key={w.code} value={w.name}>{w.name}</option>)}</select></div></div>
    <div className="cn-field"><label htmlFor="cn-state">Trạng thái *</label><select id="cn-state" value={form.trang_thai} onChange={e=>setForm({...form,trang_thai:e.target.value})}>{states.map(s=><option key={s}>{s}</option>)}</select></div>
    <OpenStreetMapPin address={[form.dia_chi,form.phuong_xa,form.tinh_thanh,'Việt Nam'].filter(Boolean).join(', ')} latitude={form.vi_do} longitude={form.kinh_do} onChange={(lat,lng)=>setForm(current=>({...current,vi_do:String(lat),kinh_do:String(lng)}))}/>
    <div className="cn-field"><label htmlFor="cn-desc">Mô tả</label><textarea id="cn-desc" maxLength={5000} rows={3} value={form.mo_ta} onChange={e=>setForm({...form,mo_ta:e.target.value})}/></div>
    <div className="cn-form-actions"><button type="button" className="cn-light" onClick={close}>Hủy</button><button type="submit" className="cn-primary" disabled={busy}>{busy?'Đang lưu...':modal==='edit'?'Lưu thay đổi':'Tạo chi nhánh'}</button></div>
   </form>}
  </div></div>}
 </section>;
}

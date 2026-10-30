import { useEffect, useState } from 'react';
import PhongPage from './Phong.js';
import LichPhong from './LichPhong.js';
import LoaiPhongPage from './LoaiPhong.js';
import ChiNhanhPage from './ChiNhanh.js';

type ThongKe = { tong_homestay: number; cho_duyet: number; tong_phong: number; tong_dat_phong: number; tong_nguoi_dung: number };
type Login = { access_token: string; refresh_token:string; expires_in:number; nguoi_dung: { id: string; email: string } };
type SavedSession={refresh_token:string;email:string;remember:boolean};
const SESSION_KEY='homestay_admin_session';
function stored():SavedSession|null{try{const raw=localStorage.getItem(SESSION_KEY)||sessionStorage.getItem(SESSION_KEY);return raw?JSON.parse(raw) as SavedSession:null;}catch{return null;}}
function persist(x:SavedSession){sessionStorage.removeItem(SESSION_KEY);localStorage.removeItem(SESSION_KEY);(x.remember?localStorage:sessionStorage).setItem(SESSION_KEY,JSON.stringify(x));}
function clearSaved(){sessionStorage.removeItem(SESSION_KEY);localStorage.removeItem(SESSION_KEY);}

type Muc = 'tong-quan'|'lich'|'chi-nhanh'|'phong'|'loai-phong'|'dat-phong'|'trang-chu'|'nhan-vien'|'thong-bao'|'cai-dat'|'bao-cao'|'thong-tin';
const danhMuc: {id:Muc; nhan:string; icon:string}[] = [
  {id:'tong-quan',nhan:'Tổng quan',icon:'▦'},
  {id:'lich',nhan:'Lịch',icon:'▣'},
  {id:'chi-nhanh',nhan:'Chi nhánh',icon:'▥'},
  {id:'phong',nhan:'Phòng',icon:'▤'},
  {id:'loai-phong',nhan:'Loại phòng',icon:'▥'},
  {id:'dat-phong',nhan:'Đơn đặt phòng',icon:'▣'},
  {id:'trang-chu',nhan:'Trang chủ',icon:'⌂'},
  {id:'nhan-vien',nhan:'Nhân viên',icon:'♙'},
  {id:'thong-bao',nhan:'Thông báo',icon:'♧'},
  {id:'cai-dat',nhan:'Cài đặt',icon:'⚙'},
  {id:'bao-cao',nhan:'Báo cáo thống kê',icon:'▥'},
  {id:'thong-tin',nhan:'Thông tin cá nhân',icon:'♙'}
];
async function api<T>(url:string, method='GET', body?:unknown, token?:string):Promise<T>{
  const response=await fetch('/api'+url,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});
  const data=await response.json().catch(()=>({})) as {message?:string|string[]};
  if(!response.ok) throw new Error(Array.isArray(data.message)?data.message.join(', '):data.message||'Yêu cầu thất bại (HTTP '+response.status+')');
  return data as T;
}
function BieuDo({thongKe}:{thongKe:ThongKe}){
  const bars=[36,55,42,69,48,75,57,66,52,80,60,72];
  const max=Math.max(1,thongKe.tong_homestay,thongKe.tong_phong,thongKe.tong_dat_phong);
  const series=[thongKe.tong_homestay,thongKe.tong_phong,thongKe.tong_dat_phong,thongKe.tong_nguoi_dung,thongKe.cho_duyet];
  return <div className="qt-chart">
    <div className="qt-chart-grid">{[0,1,2,3,4].map(i=><div key={i}/>)}</div>
    <div className="qt-chart-bars">{bars.map((n,i)=><div className="qt-chart-column" key={i}><div className="qt-chart-bar" style={{height:(20+n*.65)+'%'}}/><span>{['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12'][i]}</span></div>)}</div>
    <svg className="qt-chart-line" viewBox="0 0 600 210" preserveAspectRatio="none" aria-hidden="true"><path d="M0 155 C28 151 32 90 65 105 S115 160 150 110 S203 60 235 111 S292 160 330 100 S387 55 416 110 S475 160 510 95 S560 110 600 85" fill="none" stroke="#50cbb1" strokeWidth="3" strokeLinecap="round"/></svg>
    <div className="qt-chart-caption">Minh họa giao diện, chưa có API dữ liệu theo tháng. Tỷ lệ các chỉ số tổng quan: {series.map(n=>Math.round(n/max*100)).join(' · ')}%</div>
  </div>;
}
export default function QuanTri(){
  const [remember,setRemember]=useState(false);
  const [restoring,setRestoring]=useState(!!stored());
  const [cheDo,setCheDo]=useState<'dang-nhap'|'dang-ky'>('dang-nhap');
  const [email,setEmail]=useState(''); const [matKhau,setMatKhau]=useState('');
  const [token,setToken]=useState(''); const [taiKhoan,setTaiKhoan]=useState('');
  const [thongKe,setThongKe]=useState<ThongKe|null>(null);
  const [thongBao,setThongBao]=useState(''); const [dangXuLy,setDangXuLy]=useState(false);
  const [sidebarHidden,setSidebarHidden]=useState(false);
  const [muc,setMuc]=useState<Muc>('tong-quan'); const [menuMo,setMenuMo]=useState(false);
  const [hoSoMo,setHoSoMo]=useState(false); const [timMo,setTimMo]=useState(false); const [tim,setTim]=useState(''); const [ky,setKy]=useState<'hom-nay'|'tuan'|'thang'>('thang');
  useEffect(()=>{
    let active=true;
    const saved=stored();
    if(!saved){setRestoring(false);return;}
    setRemember(saved.remember);
    async function restore(){
      try{
        const login=await api<Login>('/xac-thuc/lam-moi','POST',{refresh_token:saved!.refresh_token});
        await api('/quan-tri/toi','GET',undefined,login.access_token);
        const stats=await api<ThongKe>('/quan-tri/tong-quan','GET',undefined,login.access_token);
        if(!active)return;
        persist({refresh_token:login.refresh_token,email:login.nguoi_dung.email,remember:saved!.remember});
        setToken(login.access_token);setTaiKhoan(login.nguoi_dung.email);setThongKe(stats);
      }catch{if(active){clearSaved();setThongBao('Phiên đăng nhập đã hết hạn hoặc không thể kết nối. Vui lòng đăng nhập lại.');}}
      finally{if(active)setRestoring(false);}
    }
    void restore();return()=>{active=false;};
  },[]);
  useEffect(()=>{
    if(!token)return;
    let active=true;
    const timer=window.setInterval(async()=>{
      const saved=stored();
      if(!saved)return;
      try{
        const next=await api<Login>('/xac-thuc/lam-moi','POST',{refresh_token:saved.refresh_token});
        if(!active)return;
        persist({refresh_token:next.refresh_token,email:next.nguoi_dung.email,remember:saved.remember});
        setToken(next.access_token);
      }catch{ /* Loi mang tam thoi: giu phien, kiem tra lai khi nguoi dung thao tac. */ }
    },40*60*1000);
    return()=>{active=false;window.clearInterval(timer);};
  },[token]);
  async function xuLy(e:React.FormEvent){
    e.preventDefault();setDangXuLy(true);setThongBao('');
    try{
      if(cheDo==='dang-ky'){
        await api('/xac-thuc/dang-ky','POST',{email,matKhau});
        setThongBao('Đã gửi yêu cầu đăng ký. Hãy xác nhận email. Tài khoản mới không tự động có quyền quản trị.');setCheDo('dang-nhap');
      }else{
        const login=await api<Login>('/xac-thuc/dang-nhap','POST',{email,matKhau});
        await api('/quan-tri/toi','GET',undefined,login.access_token);
        const data=await api<ThongKe>('/quan-tri/tong-quan','GET',undefined,login.access_token);
        persist({refresh_token:login.refresh_token,email:login.nguoi_dung.email,remember});setToken(login.access_token);setTaiKhoan(login.nguoi_dung.email);setThongKe(data);setMatKhau('');
      }
    }catch(e){setThongBao(e instanceof Error?e.message:'Có lỗi xảy ra');}
    finally{setDangXuLy(false);}
  }
  async function taiLai(){
    setDangXuLy(true);setThongBao('');
    try{setThongKe(await api<ThongKe>('/quan-tri/tong-quan','GET',undefined,token));setThongBao('Đã cập nhật số liệu từ cơ sở dữ liệu');}
    catch(e){setThongBao(e instanceof Error?e.message:'Không thể tải dữ liệu');}
    finally{setDangXuLy(false);}
  }
  function thoat(){clearSaved();setToken('');setThongKe(null);setTaiKhoan('');setThongBao('');setMuc('tong-quan');}
  const stats=thongKe?[{ten:'Tổng Homestay',so:thongKe.tong_homestay,icon:'⌂',tone:'violet'},{ten:'Tổng phòng',so:thongKe.tong_phong,icon:'▤',tone:'blue'},{ten:'Đơn đặt phòng',so:thongKe.tong_dat_phong,icon:'▣',tone:'pink'},{ten:'Người dùng',so:thongKe.tong_nguoi_dung,icon:'♙',tone:'green'},{ten:'Chờ duyệt',so:thongKe.cho_duyet,icon:'◷',tone:'orange'}]:[];
  return restoring?<main className="admin-shell"><div className="admin-auth"><p>Đang khôi phục phiên đăng nhập...</p></div></main>:!token?<main className="admin-shell"><header className="admin-header"><a href="/" className="brand">HOMESTAY <b>•</b> ADMIN</a><span className="tag">Quản trị hệ thống</span></header>
    <section className="admin-auth"><div className="admin-intro"><p className="eyebrow">HỆ THỐNG QUẢN TRỊ</p><h1>Quản lý Homestay<br/><em>trong một nơi.</em></h1><p>Đăng nhập bằng tài khoản đã được cấp vai trò Quản trị hệ thống. Tài khoản mới đăng ký không tự động có quyền quản trị.</p></div>
    <form className="panel admin-form" onSubmit={xuLy}><h2>{cheDo==='dang-nhap'?'Đăng nhập quản trị':'Đăng ký tài khoản'}</h2><p className="sub">Xác thực bằng Supabase Auth</p>
    <label>Email<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
    <label>Mật khẩu<input type="password" required minLength={8} maxLength={128} autoComplete={cheDo==='dang-ky'?'new-password':'current-password'} value={matKhau} onChange={e=>setMatKhau(e.target.value)}/></label>
    <label className="qt-remember"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/> Ghi nhớ đăng nhập trên thiết bị này</label>
    <button className="full" disabled={dangXuLy}>{dangXuLy?'Đang xử lý...':cheDo==='dang-nhap'?'Đăng nhập':'Đăng ký'}</button>
    <button className="admin-switch" type="button" onClick={()=>{setCheDo(cheDo==='dang-nhap'?'dang-ky':'dang-nhap');setThongBao('');}}>{cheDo==='dang-nhap'?'Chưa có tài khoản? Đăng ký':'Đã có tài khoản? Đăng nhập'}</button>
    {thongBao&&<p role="status" className="admin-message">{thongBao}</p>}</form></section></main>:
    <div className={"qt-layout "+(sidebarHidden?"qt-sidebar-hidden":"")}>\n      {sidebarHidden&&<button type="button" className="qt-sidebar-edge" title="Mở sidebar" aria-label="Mở sidebar" onClick={()=>setSidebarHidden(false)}>❯</button>}
      <aside className={'qt-sidebar '+(menuMo?'qt-sidebar-open':'')}>
        <div className="qt-logo"><span className="qt-logo-mark">H</span><span>Home<span>Stay</span></span><button type="button" className="qt-sidebar-inside-toggle" title="Thu gọn thanh bên" aria-label="Thu gọn thanh bên" onClick={()=>setSidebarHidden(true)}>❮</button></div>
        <div className="qt-menu-scroll">
          {danhMuc.filter(item=>item.id!=='thong-tin').map(item=><button type="button" key={item.id} className={'qt-nav-item '+(muc===item.id?'qt-nav-active':'')} onClick={()=>{setMuc(item.id);setMenuMo(false);setThongBao('');}}>
            <span className="qt-nav-icon">{item.icon}</span><span>{item.nhan}</span><span className="qt-nav-arrow">›</span>
          </button>)}
        </div>
      </aside>
      {menuMo&&<button className="qt-overlay" aria-label="Đóng menu" onClick={()=>setMenuMo(false)}/>}
      <div className="qt-workspace">
        <div className="qt-topbar"><div className="qt-header-search-row"><button className="qt-mobile-menu" onClick={()=>setMenuMo(!menuMo)} aria-label="Mở menu">☰</button>
          <div className={'qt-header-search-group '+(timMo?'qt-search-expanded':'')} role="search">
            <button type="button" className="qt-search-toggle" aria-label={timMo?'Thu gọn tìm kiếm':'Mở tìm kiếm'} aria-expanded={timMo} onClick={()=>{setTimMo(!timMo);if(timMo)setTim('');}}>⌕</button>
            {timMo&&<div className="qt-search"><input autoFocus aria-label="Tìm menu" value={tim} onChange={e=>setTim(e.target.value)} placeholder="Tìm chức năng..." onKeyDown={e=>{if(e.key==='Escape'){setTimMo(false);setTim('');}if(e.key==='Enter'){const x=danhMuc.find(x=>x.nhan.toLowerCase().includes(tim.trim().toLowerCase()));if(x&&tim.trim()){setMuc(x.id);setTimMo(false);setTim('');}}}}/></div>}
          </div></div>
          <div className="qt-top-actions"><button title="Thông báo" aria-label="Thông báo" onClick={()=>setMuc('thong-bao')} className="qt-icon-button">♧<i/></button><button title="Người dùng" aria-label="Người dùng" onClick={()=>setMuc('nhan-vien')} className="qt-icon-button">✉</button><div className="qt-profile-wrap"><button type="button" className="qt-profile-button" aria-haspopup="menu" aria-expanded={hoSoMo} onClick={()=>setHoSoMo(!hoSoMo)}><span className="qt-avatar">{taiKhoan.slice(0,1).toUpperCase()}</span><span className="qt-profile-name">Quản trị viên</span><span className="qt-profile-chevron">{hoSoMo?'⌃':'⌄'}</span></button>{hoSoMo&&<><button className="qt-profile-dismiss" aria-label="Đóng menu tài khoản" onClick={()=>setHoSoMo(false)}/><div className="qt-profile-dropdown" role="menu"><div className="qt-profile-email" title={taiKhoan}>{taiKhoan}</div><button role="menuitem" onClick={()=>{setMuc('thong-tin');setHoSoMo(false);}}>♙ <span>Thông tin cá nhân</span></button><button role="menuitem" onClick={()=>{setMuc('cai-dat');setHoSoMo(false);}}>⚙ <span>Cài đặt</span></button><div className="qt-profile-divider"/><button role="menuitem" className="qt-profile-logout" onClick={()=>{setHoSoMo(false);thoat();}}>↪ <span>Đăng xuất</span></button></div></>}</div></div>
        </div>
        <main className="qt-content">{muc!=='chi-nhanh'&&muc!=='phong'&&muc!=='loai-phong'&&muc!=='lich'&&<div className="qt-page-head"><div><h1>{muc==='tong-quan'?'Bảng điều khiển':danhMuc.find(x=>x.id===muc)?.nhan}</h1></div></div>}
        {thongBao&&<div className="qt-alert" role="status">{thongBao}</div>}
        {muc==='chi-nhanh'?<ChiNhanhPage token={token}/>:muc==='phong'?<PhongPage token={token}/>:muc==='lich'?<LichPhong token={token}/>:muc==='loai-phong'?<LoaiPhongPage token={token}/>:muc==='tong-quan'?<><div className="qt-stats">{stats.map((s,i)=><article className={'qt-stat qt-tone-'+s.tone} key={s.ten} style={{animationDelay:(i*80)+'ms'}}><div className="qt-stat-icon">{s.icon}</div><p>{s.ten}</p><strong>{s.so.toLocaleString('vi-VN')}</strong><span className="qt-stat-foot">Dữ liệu thực tế</span></article>)}</div>
          <div className="qt-main-grid">
            <section className="qt-chart-card"><div className="qt-card-head"><div><h2><span className="qt-heading-icon">▣</span> Thống kê đặt phòng</h2><p>Biểu đồ minh họa — dữ liệu theo thời gian đang được phát triển</p></div><div className="qt-period">{(['hom-nay','tuan','thang'] as const).map((k,i)=><button key={k} onClick={()=>setKy(k)} className={ky===k?'selected':''}>{['Ngày','Tuần','Tháng'][i]}</button>)}</div></div><div className="qt-chart-legend"><span><i className="qt-dot purple"/>Đơn đặt phòng</span><span><i className="qt-dot pink"/>Doanh thu</span></div><BieuDo thongKe={thongKe!}/></section>
            <section className="qt-side-card qt-status-card"><div className="qt-card-head"><h2><span className="qt-heading-icon">◉</span> Trạng thái Homestay</h2></div><div className="qt-donut-area"><div className="qt-donut" style={{background:thongKe!.tong_homestay>0?`conic-gradient(#24c4ad 0 ${Math.max(0,100-thongKe!.cho_duyet/thongKe!.tong_homestay*100)}%,#ffaf4c 0 100%)`:'#e9e5f6'}}><div><strong>{thongKe!.tong_homestay}</strong><small>Tổng</small></div></div><div className="qt-donut-legend"><p><i className="qt-dot teal"/>Trạng thái khác <strong>{Math.max(0,thongKe!.tong_homestay-thongKe!.cho_duyet)}</strong></p><p><i className="qt-dot orange"/>Chờ duyệt <strong>{thongKe!.cho_duyet}</strong></p><small>Chưa phân tách trạng thái hoạt động và tạm ngừng.</small></div></div></section>
          </div>
          <div className="qt-bottom-grid"><section className="qt-recent-card"><div className="qt-recent-title"><h2><span className="qt-heading-icon orange-icon">⌂</span> Homestay mới đăng ký</h2><button onClick={()=>setMuc('chi-nhanh')}>Xem tất cả →</button></div><div className="qt-recent-empty"><span>⌂</span><p>Danh sách Homestay gần đây sẽ hiển thị khi có API tương ứng.</p></div></section><section className="qt-recent-card"><div className="qt-recent-title"><h2><span className="qt-heading-icon">▣</span> Đơn đặt phòng gần đây</h2><button onClick={()=>setMuc('dat-phong')}>Xem tất cả →</button></div><div className="qt-recent-empty"><span>▣</span><p>Đơn đặt phòng gần đây sẽ hiển thị khi có API tương ứng.</p></div></section></div>
        </>:<section className="qt-placeholder"><div className="qt-placeholder-icon">{danhMuc.find(x=>x.id===muc)?.icon}</div><h2>{danhMuc.find(x=>x.id===muc)?.nhan}</h2>{muc==='thong-tin'?<p>Tài khoản đăng nhập: <strong>{taiKhoan}</strong>. Các chức năng cập nhật hồ sơ sẽ được triển khai sau.</p>:<p>Giao diện chức năng đã được bố trí trong menu. Các thao tác quản lý dữ liệu của mục này chưa được triển khai; sẽ kết nối API bảo vệ quyền quản trị ở bước tiếp theo.</p>}<button onClick={()=>setMuc('tong-quan')}>← Trở về tổng quan</button></section>}
        </main>
      </div>
    </div>;
}

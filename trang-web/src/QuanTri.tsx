import { useState } from 'react';

type ThongKe = { tong_homestay: number; cho_duyet: number; tong_phong: number; tong_dat_phong: number; tong_nguoi_dung: number };
type Login = { access_token: string; nguoi_dung: { id: string; email: string } };
async function api<T>(url: string, method = 'GET', body?: unknown, token?: string): Promise<T> {
  const response = await fetch('/api' + url, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json().catch(() => ({})) as { message?: string };
  if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Yêu cầu thất bại (HTTP ' + response.status + ')');
  return data as T;
}
export default function QuanTri() {
  const [cheDo, setCheDo] = useState<'dang-nhap'|'dang-ky'>('dang-nhap');
  const [email, setEmail] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [token, setToken] = useState('');
  const [taiKhoan, setTaiKhoan] = useState('');
  const [thongKe, setThongKe] = useState<ThongKe | null>(null);
  const [thongBao, setThongBao] = useState('');
  const [dangXuLy, setDangXuLy] = useState(false);
  async function xuLy(e: React.FormEvent) {
    e.preventDefault(); setDangXuLy(true); setThongBao('');
    try {
      if (cheDo === 'dang-ky') {
        await api('/xac-thuc/dang-ky','POST',{ email, matKhau });
        setThongBao('Đã gửi yêu cầu đăng ký. Hãy xác nhận email. Tài khoản mới chưa có quyền quản trị; quản trị viên phải cấp quyền riêng.');
        setCheDo('dang-nhap');
      } else {
        const login = await api<Login>('/xac-thuc/dang-nhap','POST',{ email, matKhau });
        await api('/quan-tri/toi','GET',undefined,login.access_token);
        const data = await api<ThongKe>('/quan-tri/tong-quan','GET',undefined,login.access_token);
        setToken(login.access_token); setTaiKhoan(login.nguoi_dung.email); setThongKe(data); setMatKhau('');
      }
    } catch (e) { setThongBao(e instanceof Error ? e.message : 'Có lỗi xảy ra'); }
    finally { setDangXuLy(false); }
  }
  async function taiLai() {
    setDangXuLy(true);
    try { setThongKe(await api<ThongKe>('/quan-tri/tong-quan','GET',undefined,token)); setThongBao('Đã cập nhật thống kê'); }
    catch (e) { setThongBao(e instanceof Error ? e.message : 'Không thể tải dữ liệu'); }
    finally { setDangXuLy(false); }
  }
  function thoat() { setToken(''); setThongKe(null); setTaiKhoan(''); setThongBao('Đã rời phiên trên trang này.'); }
  return <main className="admin-shell">
    <header className="admin-header"><a href="/" className="brand">HOMESTAY <b>•</b> ADMIN</a><span className="tag">Quản trị hệ thống</span></header>
    {!token ? <section className="admin-auth"><div className="admin-intro"><p className="eyebrow">HỆ THỐNG QUẢN TRỊ</p><h1>Quản lý Homestay<br/><em>trong một nơi.</em></h1><p>Đăng nhập bằng tài khoản đã được cấp vai trò Quản trị hệ thống. Tài khoản mới đăng ký không tự động có quyền quản trị.</p></div>
      <form className="panel admin-form" onSubmit={xuLy}><h2>{cheDo === 'dang-nhap' ? 'Đăng nhập quản trị' : 'Đăng ký tài khoản'}</h2><p className="sub">Xác thực bằng Supabase Auth</p>
        <label>Email<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
        <label>Mật khẩu<input type="password" required minLength={8} maxLength={128} autoComplete={cheDo === 'dang-ky'?'new-password':'current-password'} value={matKhau} onChange={e=>setMatKhau(e.target.value)}/></label>
        <button className="full" disabled={dangXuLy}>{dangXuLy?'Đang xử lý...':cheDo === 'dang-nhap'?'Đăng nhập':'Đăng ký'}</button>
        <button className="admin-switch" type="button" onClick={()=>{setCheDo(cheDo==='dang-nhap'?'dang-ky':'dang-nhap');setThongBao('');}}>{cheDo==='dang-nhap'?'Chưa có tài khoản? Đăng ký':'Đã có tài khoản? Đăng nhập'}</button>
        {thongBao && <p role="status" className="admin-message">{thongBao}</p>}
      </form></section> : <section className="admin-dashboard"><div className="admin-dashboard-top"><div><p className="eyebrow">BẢNG ĐIỀU KHIỂN</p><h1>Tổng quan hệ thống</h1><p>Đã đăng nhập: {taiKhoan}</p></div><div className="buttons"><button disabled={dangXuLy} onClick={()=>void taiLai()}>Làm mới</button><button className="secondary" onClick={thoat}>Thoát</button></div></div>
      {thongBao && <p role="status" className="admin-message">{thongBao}</p>}
      <div className="admin-stats">{([{key:'tong_homestay',name:'Tổng Homestay'},{key:'cho_duyet',name:'Homestay chờ duyệt'},{key:'tong_phong',name:'Tổng phòng'},{key:'tong_dat_phong',name:'Đơn đặt phòng'},{key:'tong_nguoi_dung',name:'Người dùng'}] as const).map(x=><div className="admin-stat" key={x.key}><span>{x.name}</span><strong>{thongKe?.[x.key] ?? '—'}</strong></div>)}</div>
      <div className="panel"><h2>Quản lý hệ thống</h2><p className="sub">Đã có xác thực và phân quyền phía máy chủ. Các thao tác duyệt Homestay, quản lý người dùng và chỉnh sửa dữ liệu sẽ được bổ sung ở giai đoạn tiếp theo.</p></div>
    </section>}
  </main>;
}

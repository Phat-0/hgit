import { useState } from 'react';

type LoginResponse = { access_token: string; refresh_token: string; nguoi_dung: { id: string; email: string } };
type Check = { ten: string; ket_qua: 'Đạt' | 'Không đạt'; chi_tiet: string };
async function request(path: string, init: RequestInit = {}) {
  const response = await fetch('/api' + path, init);
  const data: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (data as { message?: string }).message;
    throw new Error(Array.isArray(message) ? message.join(', ') : message || 'HTTP ' + response.status);
  }
  return data;
}
export default function App() {
  const [email, setEmail] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [token, setToken] = useState('');
  const [nguoiDung, setNguoiDung] = useState<{ id: string; email: string } | null>(null);
  const [ketQua, setKetQua] = useState<Check[]>([]);
  const [dangChay, setDangChay] = useState(false);
  const [thongBao, setThongBao] = useState('Sẵn sàng kiểm thử');
  const payload = () => ({ headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, matKhau }), method: 'POST' });
  const bao = (e: unknown) => setThongBao(e instanceof Error ? e.message : 'Có lỗi xảy ra');
  async function dangKy() {
    setDangChay(true);
    try {
      const result = await request('/xac-thuc/dang-ky', payload()) as { thong_bao: string };
      setThongBao(result.thong_bao + '. Hãy xác minh email trước khi đăng nhập.');
    } catch (e) { bao(e); } finally { setDangChay(false); }
  }
  async function dangNhap() {
    setDangChay(true);
    try {
      const data = await request('/xac-thuc/dang-nhap', payload()) as LoginResponse;
      setToken(data.access_token);
      setNguoiDung(data.nguoi_dung);
      setThongBao('Đăng nhập thành công. Token chỉ được giữ trong bộ nhớ trang.');
    } catch (e) { bao(e); } finally { setDangChay(false); }
  }
  async function kiemThu() {
    setDangChay(true);
    setKetQua([]);
    const checks: Check[] = [];
    async function test(ten: string, action: () => Promise<boolean>) {
      try { const ok = await action(); checks.push({ ten, ket_qua: ok ? 'Đạt' : 'Không đạt', chi_tiet: ok ? 'Hoạt động đúng' : 'Phản hồi không đúng kỳ vọng' }); }
      catch (e) { checks.push({ ten, ket_qua: 'Không đạt', chi_tiet: e instanceof Error ? e.message : 'Lỗi không xác định' }); }
    }
    try {
      await test('Máy chủ NestJS', async () => Boolean(await request('/suc-khoe')));
      await test('Kết nối PostgreSQL', async () => {
        const r = await request('/suc-khoe/co-so-du-lieu') as { tong_bang?: number };
        return typeof r.tong_bang === 'number' && r.tong_bang > 0;
      });
      await test('API bảo vệ từ chối khi không có token', async () => {
        const response = await fetch('/api/xac-thuc/toi');
        return response.status === 401;
      });
      if (token) {
        await test('Access token hợp lệ', async () => {
          const r = await request('/xac-thuc/toi', { headers: { Authorization: 'Bearer ' + token } }) as { nguoi_dung?: { id: string } };
          return Boolean(r.nguoi_dung?.id && r.nguoi_dung.id === nguoiDung?.id);
        });
      } else {
        checks.push({ ten: 'Access token hợp lệ', ket_qua: 'Không đạt', chi_tiet: 'Chưa đăng nhập; hãy đăng nhập rồi kiểm thử lại' });
      }
      setKetQua(checks);
      setThongBao('Đã chạy ' + checks.length + ' bài kiểm thử. Không thực hiện thay đổi cơ sở dữ liệu.');
    } finally { setDangChay(false); }
  }
  function dangXuat() {
    setToken(''); setNguoiDung(null); setKetQua([]);
    setThongBao('Đã xóa token khỏi trang này. Phiên trên Supabase chưa bị thu hồi.');
  }
  return <main className="layout">
    <header><span className="brand">HOMESTAY <b>•</b> ĐỒ ÁN TỐT NGHIỆP</span><span className="tag">Môi trường phát triển</span></header>
    <section className="hero"><p className="eyebrow">TRUNG TÂM KIỂM THỬ</p><h1>Kiểm thử xác thực<br/><em>trên một giao diện.</em></h1><p>Đăng ký, đăng nhập và kiểm tra kết nối hệ thống trong trình duyệt. Không cần sao chép token vào PowerShell.</p></section>
    <div className="columns"><section className="panel"><h2>01. Tài khoản</h2><p className="sub">Sử dụng tài khoản Supabase Auth của bạn</p>
      <label>Email<input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="ten@example.com"/></label>
      <label>Mật khẩu<input type="password" autoComplete="current-password" value={matKhau} onChange={e=>setMatKhau(e.target.value)} placeholder="Tối thiểu 8 ký tự"/></label>
      <div className="buttons"><button disabled={dangChay || !email || !matKhau} onClick={dangNhap}>Đăng nhập</button><button className="secondary" disabled={dangChay || !email || !matKhau} onClick={dangKy}>Đăng ký</button></div>
      <div className="identity"><span className={'dot '+(nguoiDung?'active':'')}/>{nguoiDung ? 'Đã đăng nhập: '+nguoiDung.email : 'Chưa đăng nhập'}{nguoiDung && <button className="link" onClick={dangXuat}>Xóa phiên cục bộ</button>}</div>
    </section><section className="panel"><h2>02. Kiểm thử tổng hợp</h2><p className="sub">Chạy tất cả bài kiểm thử hiện có chỉ bằng một nút</p>
      <div className="tests"><div>Máy chủ NestJS</div><div>Kết nối Supabase PostgreSQL</div><div>API từ chối yêu cầu thiếu token</div><div>Xác minh token người dùng</div></div>
      <button className="full" disabled={dangChay} onClick={kiemThu}>{dangChay?'Đang xử lý...':'Chạy toàn bộ kiểm thử'}</button>
      {ketQua.length>0 && <div className="results">{ketQua.map((item,i)=><div className="result" key={i}><span className={item.ket_qua==='Đạt'?'pass':'fail'}>{item.ket_qua}</span><div><strong>{item.ten}</strong><small>{item.chi_tiet}</small></div></div>)}</div>}
    </section></div>
    <aside role="status">{thongBao}</aside><footer>Trang dành cho môi trường phát triển • Không hiển thị access token hoặc refresh token</footer>
  </main>;
}

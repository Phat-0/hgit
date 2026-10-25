import { useEffect, useState } from 'react';

type Homestay = { id: string; ten_homestay: string; mo_ta: string | null; dia_chi: string; tinh_thanh: string; so_phong: number; anh_dai_dien: string | null };
type Phong = { id: string; ma_phong: string; ten_phong: string; ten_loai: string; suc_chua: number; dien_tich_m2: string | null; trang_thai_van_hanh: string; anh_dai_dien: string | null; gia_tu_gio: string | null; gia_tu_dem: string | null };
type CheDo = 'gio' | 'ngay';

async function layDuLieu<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Không thể tải dữ liệu (HTTP ' + res.status + ')');
  return res.json() as Promise<T>;
}
function gia(value: string | null) {
  return value === null ? 'Chưa có gói giá' : Number(value).toLocaleString('vi-VN') + ' ₫';
}
export default function App() {
  const [cheDo, setCheDo] = useState<CheDo>('ngay');
  const [timKiem, setTimKiem] = useState('');
  const [boLoc, setBoLoc] = useState('');
  const [homestays, setHomestays] = useState<Homestay[]>([]);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState('');
  const [chon, setChon] = useState<Homestay | null>(null);
  const [phongs, setPhongs] = useState<Phong[]>([]);
  const [dangTaiPhong, setDangTaiPhong] = useState(false);
  useEffect(() => {
    let active = true;
    layDuLieu<Homestay[]>('/api/homestay' + (boLoc ? '?tinh_thanh=' + encodeURIComponent(boLoc) : ''))
      .then(data => { if (active) { setHomestays(data); setLoi(''); } })
      .catch(err => { if (active) setLoi(err instanceof Error ? err.message : 'Không thể tải danh sách'); })
      .finally(() => { if (active) setDangTai(false); });
    return () => { active = false; };
  }, [boLoc]);
  async function xemPhong(h: Homestay) {
    setChon(h); setPhongs([]); setDangTaiPhong(true); setLoi('');
    try { setPhongs(await layDuLieu<Phong[]>('/api/homestay/' + encodeURIComponent(h.id) + '/phong')); }
    catch (err) { setLoi(err instanceof Error ? err.message : 'Không thể tải phòng'); }
    finally { setDangTaiPhong(false); }
  }
  function loc(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setDangTai(true); setChon(null); setBoLoc(timKiem.trim());
  }
  return <main className="layout">
    <header><span className="brand">HOMESTAY <b>•</b> VIỆT NAM</span><nav><a href="#danh-sach">Khám phá</a><a href="#tim-kiem">Tìm phòng</a></nav><span className="tag">Khám phá nơi lưu trú</span></header>
    <section className="hero"><p className="eyebrow">KHÁM PHÁ HOMESTAY VIỆT NAM</p><h1>Chuyến đi đẹp bắt đầu<br/><em>từ nơi lưu trú phù hợp.</em></h1><p>Tìm Homestay theo tỉnh thành, khám phá các loại phòng và tham khảo giá theo giờ hoặc theo đêm.</p></section>
    <section className="panel" id="tim-kiem">
      <h2>Tìm nơi lưu trú</h2><p className="sub">Thông tin được lấy trực tiếp từ hệ thống Homestay</p>
      <div className="buttons"><button className={cheDo === 'ngay' ? '' : 'secondary'} onClick={() => setCheDo('ngay')}>Theo ngày / đêm</button><button className={cheDo === 'gio' ? '' : 'secondary'} onClick={() => setCheDo('gio')}>Theo giờ</button></div>
      <form onSubmit={loc} className="search-form"><label>Tỉnh / thành phố<input value={timKiem} onChange={e=>setTimKiem(e.target.value)} maxLength={100} placeholder="Ví dụ: Hồ Chí Minh (để trống để xem tất cả)"/></label><button type="submit">Tìm kiếm</button></form>
    </section>
    <section className="list-section" id="danh-sach"><div className="section-heading"><div><p className="eyebrow">ĐIỂM ĐẾN</p><h2>Homestay đang hoạt động</h2></div><span>{dangTai ? 'Đang tải...' : homestays.length + ' cơ sở'}</span></div>
      {loi && <p className="error" role="alert">{loi}. Hãy kiểm tra backend và kết nối cơ sở dữ liệu.</p>}
      {!dangTai && homestays.length === 0 && !loi && <div className="empty">Chưa có Homestay đang hoạt động phù hợp. Các cơ sở ở trạng thái “Chờ duyệt” sẽ không hiển thị.</div>}
      <div className="cards">{homestays.map(h=><article className="stay-card" key={h.id}>
        <div className="photo">{h.anh_dai_dien ? <img src={h.anh_dai_dien} alt={h.ten_homestay}/> : <span>HOMESTAY</span>}</div>
        <div className="stay-body"><span className="location">⌖ {h.tinh_thanh}</span><h3>{h.ten_homestay}</h3><p>{h.dia_chi}</p><div className="stay-bottom"><span>{h.so_phong} phòng</span><button onClick={()=>void xemPhong(h)}>Xem phòng</button></div></div>
      </article>)}</div>
    </section>
    {chon && <section className="panel rooms" id="phong"><div className="section-heading"><div><p className="eyebrow">DANH SÁCH PHÒNG</p><h2>{chon.ten_homestay}</h2></div><button className="secondary" onClick={()=>setChon(null)}>Đóng</button></div>
      {dangTaiPhong ? <p>Đang tải phòng...</p> : phongs.length === 0 ? <p>Chưa có phòng phù hợp.</p> : <div className="room-grid">{phongs.map(p=><article className="room" key={p.id}>
        <div className="room-photo">{p.anh_dai_dien ? <img src={p.anh_dai_dien} alt={p.ten_phong}/> : <span>PHÒNG HOMESTAY</span>}</div>
        <div className="room-info"><span className="location">{p.ten_loai} • {p.suc_chua} khách</span><h3>{p.ten_phong}</h3><p>Mã phòng: {p.ma_phong} • {p.trang_thai_van_hanh}</p><div className="price">{gia(cheDo === 'gio' ? p.gia_tu_gio : p.gia_tu_dem)} <small>{cheDo === 'gio' ? '/ gói theo giờ' : '/ gói theo đêm'}</small></div></div>
      </article>)}</div>}
      <p className="notice">Giá hiển thị là giá cơ bản tham khảo, không phải báo giá cuối cùng. Chức năng kiểm tra lịch trống và xác nhận đặt phòng đang được xây dựng.</p>
    </section>}
    <footer>Hệ thống quản lý và đặt phòng Homestay • Đồ án tốt nghiệp</footer>
  </main>;
}

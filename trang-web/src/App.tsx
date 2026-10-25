import { useState } from 'react';

const muc = ['Trang chủ', 'Tìm homestay', 'Đặt theo giờ', 'Đặt theo ngày', 'Đơn đặt phòng'];
export default function App() {
  const [cheDo, setCheDo] = useState<'gio' | 'ngay'>('ngay');
  return <main className="layout">
    <header><span className="brand">HOMESTAY <b>•</b> VIỆT NAM</span><nav>{muc.map(m => <a key={m} href="#tim-kiem">{m}</a>)}</nav><span className="tag">Khám phá nơi lưu trú</span></header>
    <section className="hero">
      <p className="eyebrow">ĐẶT PHÒNG HOMESTAY TRỰC TUYẾN</p>
      <h1>Tìm chốn nghỉ ngơi<br/><em>theo cách của bạn.</em></h1>
      <p>Khám phá homestay và lựa chọn đặt phòng theo giờ hoặc theo ngày/đêm. Thông tin phòng và lịch trống sẽ được kết nối với hệ thống quản lý.</p>
    </section>
    <section className="panel" id="tim-kiem">
      <h2>Tìm phòng phù hợp</h2><p className="sub">Chọn hình thức lưu trú để bắt đầu</p>
      <div className="buttons">
        <button className={cheDo === 'ngay' ? '' : 'secondary'} onClick={() => setCheDo('ngay')}>Theo ngày / đêm</button>
        <button className={cheDo === 'gio' ? '' : 'secondary'} onClick={() => setCheDo('gio')}>Theo giờ</button>
      </div>
      <div className="search-placeholder">
        <strong>{cheDo === 'gio' ? 'Đặt phòng theo giờ' : 'Đặt phòng theo ngày / đêm'}</strong>
        <p>Đang xây dựng chức năng tìm kiếm và kiểm tra lịch phòng thực tế. Chưa nhận đặt phòng hoặc thanh toán ở giai đoạn này.</p>
      </div>
    </section>
    <footer>Hệ thống quản lý và đặt phòng Homestay • Đồ án tốt nghiệp</footer>
  </main>;
}

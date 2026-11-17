import {useEffect,useState} from 'react';
import {khachApi} from '../../dung-chung/api/khach-api';
type Phong={id:string;homestay_id?:string;ten_phong:string};
type Combo={id:string;ten_combo:string;mo_ta:string|null;gia_combo:number|string;so_gio_bao_gom:number|null;pham_vi:string;chi_nhanh_ids:string[];phong_ids:string[];anh:(string|null)[]};
export default function DanhSachComboKhach({query,phong,tieuDe,onChon}:{query:string;phong:Phong[];tieuDe:string;onChon:(phongId:string,comboId:string)=>void}) {
  const [combos,setCombos]=useState<Combo[]>([]),[loading,setLoading]=useState(false),[error,setError]=useState(''),[choices,setChoices]=useState<Record<string,string>>({});
  useEffect(()=>{let active=true;setCombos([]);setError('');setLoading(!!query);if(query)void khachApi<Combo[]>('/combo-noi-bat?'+query).then(r=>{if(active)setCombos(r);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[query]);
  return <section id="combo-khach" className="kh-combo-section" aria-label="Combo lưu trú">
    <div className="kh-section-title"><div><span>Trọn vẹn hơn cho chuyến đi</span><h2>{tieuDe}</h2></div><small>Ưu đãi theo thời gian bạn chọn</small></div>
    {loading&&<p role="status">Đang tìm combo…</p>}{error&&<p role="alert" className="kh-error">{error}</p>}
    {!query&&<p className="kh-empty">Chọn thời gian để xem combo áp dụng.</p>}
    {!!query&&!loading&&!error&&!combos.length&&<p className="kh-empty">Chưa có combo phù hợp thời gian này.</p>}
    <div className="kh-combo-grid">{combos.map(c=>{
      const rooms=phong.filter(p=>c.pham_vi==='toan_he_thong'||c.pham_vi==='phong'&&c.phong_ids.includes(p.id)||c.pham_vi==='chi_nhanh'&&!!p.homestay_id&&c.chi_nhanh_ids.includes(p.homestay_id));
      const selected=rooms.find(p=>p.id===choices[c.id])?.id||rooms[0]?.id;
      return <article className="kh-combo-card" key={c.id}>
        {c.anh.find(Boolean)?<img src={c.anh.find(Boolean)!} alt={c.ten_combo} loading="lazy"/>:<div className="kh-combo-no-photo">Chưa có ảnh combo</div>}
        <div className="kh-combo-info"><small>{c.so_gio_bao_gom?`Combo ${c.so_gio_bao_gom} giờ`:'Combo dịch vụ'}</small><h3>{c.ten_combo}</h3><p>{c.mo_ta}</p>
          <strong>{Number(c.gia_combo).toLocaleString('vi-VN')} ₫<small> · giá combo</small></strong>
          {rooms.length>0?<label>Phòng áp dụng<select aria-label={'Phòng áp dụng '+c.ten_combo} value={selected} onChange={e=>setChoices({...choices,[c.id]:e.target.value})}>{rooms.map(p=><option key={p.id} value={p.id}>{p.ten_phong}</option>)}</select></label>:<small>Chưa có phòng trống phù hợp. Thử đổi lịch hoặc chi nhánh.</small>}
          <button type="button" disabled={!selected} onClick={()=>onChon(selected,c.id)}>Đặt combo <span aria-hidden="true">→</span></button><small>Tổng tiền phòng và combo được tính lại khi chọn.</small>
        </div>
      </article>;
    })}</div>
  </section>;
}

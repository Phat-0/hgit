import {afterEach,describe,it,expect,vi} from 'vitest';
import {TrangChuService,MAC_DINH_TRANG_CHU} from './trang-chu.service.js';
describe('Cấu hình hình ảnh Trang chủ',()=>{
  afterEach(()=>vi.unstubAllEnvs());
  const validate=(data:unknown)=>new TrangChuService({} as any)['validate'](data);
  const image=(name:string)=>'https://home.supabase.co/storage/v1/object/public/anh-trang-chu/'+name+'.webp';
  it('đọc cấu hình cũ và giữ ảnh nền, album, liên hệ trong cấu hình mới',()=>{
    vi.stubEnv('SUPABASE_URL','https://home.supabase.co');
    expect(validate(structuredClone(MAC_DINH_TRANG_CHU)).hero.anh).toBe('');
    const data={...structuredClone(MAC_DINH_TRANG_CHU),hien_combo:true,hero:{...MAC_DINH_TRANG_CHU.hero,anh_nen:image('nen'),album:[image('mot'),image('hai'),image('mot')]},chan_trang:{...MAC_DINH_TRANG_CHU.chan_trang,dia_chi:'Địa chỉ thực tế',dien_thoai:'+84 901 234 567',email:'home@example.com'}};
    const result=validate(data);expect(result.hero.album).toEqual([image('mot'),image('hai')]);expect(result.hero.anh_nen).toBe(image('nen'));expect(result.chan_trang.email).toBe('home@example.com');expect(result.hien_combo).toBe(true);
  });
  it('không nhận ảnh ngoài kho, URL giả, nhiều hơn 8 ảnh hoặc sai kiểu',()=>{
    vi.stubEnv('SUPABASE_URL','https://home.supabase.co');
    for(const extra of [{anh_nen:'https://evil.test/a.webp'},{album:[image('mot')+'?x=1']},{album:Array(9).fill(image('mot'))},{album:'anh'}])expect(()=>validate({...MAC_DINH_TRANG_CHU,hero:{...MAC_DINH_TRANG_CHU.hero,...extra}})).toThrow();
    expect(()=>validate({...MAC_DINH_TRANG_CHU,hien_combo:'yes'})).toThrow();
  });
  it('lưu nền chung trong JSON hiện có và từ chối ảnh ngoài kho',()=>{
    vi.stubEnv('SUPABASE_URL','https://home.supabase.co');
    const ui={ten_web:'HomeStay',khau_hieu:'Nghỉ ngơi',tieu_de_phong:'Phòng',mau_nen:'#18352f',mau_nhan:'#e9bd80',so_cot:3,anh_ben_trai:false,anh_nen_chung:image('nen-chung')};
    expect(validate({...MAC_DINH_TRANG_CHU,giao_dien:ui}).giao_dien?.anh_nen_chung).toBe(image('nen-chung'));
    expect(()=>validate({...MAC_DINH_TRANG_CHU,giao_dien:{...ui,anh_nen_chung:'https://evil.test/a.webp'}})).toThrow();
    expect(()=>validate({...MAC_DINH_TRANG_CHU,giao_dien:{...ui,mau_nen:'url(evil)'}})).toThrow();
  });
  it('giới hạn font, ID nổi bật và các lựa chọn hiển thị',()=>{
    const ui={ten_web:'HomeStay',khau_hieu:'Nghỉ ngơi',tieu_de_phong:'Phòng',mau_nen:'#18352f',mau_nhan:'#e9bd80',so_cot:3,anh_ben_trai:false,font_chu:'palatino',phong_noi_bat:['11111111-1111-4111-8111-111111111111'],combo_noi_bat:[],hien_ban_do:true,hien_danh_gia:false};
    expect(new TrangChuService({} as any)['validate']({...MAC_DINH_TRANG_CHU,giao_dien:ui}).giao_dien?.font_chu).toBe('palatino');
    for(const extra of [{font_chu:'url(evil)'},{phong_noi_bat:['bad-id']},{combo_noi_bat:Array(21).fill('11111111-1111-4111-8111-111111111111')},{hien_ban_do:'yes'}])expect(()=>new TrangChuService({} as any)['validate']({...MAC_DINH_TRANG_CHU,giao_dien:{...ui,...extra}})).toThrow();
  });
  it('lưu tham chiếu ảnh phòng ổn định và ảnh tải lên, từ chối URL/ID giả',()=>{
    vi.stubEnv('SUPABASE_URL','https://home.supabase.co');const room={phong_id:'11111111-1111-4111-8111-111111111111',anh_id:'22222222-2222-4222-8222-222222222222'};
    const data={...MAC_DINH_TRANG_CHU,hero:{...MAC_DINH_TRANG_CHU.hero,bo_anh:[room,{url:image('nen')}]}};
    expect(validate(data).hero.bo_anh).toEqual([room,{url:image('nen')}]);
    for(const bo_anh of [[{phong_id:'bad',anh_id:room.anh_id}],[{url:'https://evil.test/a.webp'}],[{...room,url:image('nen')}],Array(13).fill(room)])expect(()=>validate({...data,hero:{...data.hero,bo_anh}})).toThrow();
  });
  it('kiểm tra liên hệ và không cho cấy thuộc tính lạ vào khối',()=>{
    expect(()=>validate({...MAC_DINH_TRANG_CHU,chan_trang:{...MAC_DINH_TRANG_CHU.chan_trang,email:'a@x.com\nBcc:evil'}})).toThrow();
    expect(()=>validate({...MAC_DINH_TRANG_CHU,hero:{...MAC_DINH_TRANG_CHU.hero,html:'<script>'}})).toThrow();
  });
});

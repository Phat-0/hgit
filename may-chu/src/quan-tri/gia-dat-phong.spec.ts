import { describe, it, expect } from 'vitest';
import {
  GIO_MAC_DINH,
  kiemTraGio,
  tinhGia,
  type GiaPhong,
  type GiaLich,
} from './gia-dat-phong.js';
const room: GiaPhong = {
  gia_moi_gio: 200000,
  gia_moi_ngay: 800000,
  gia_moi_dem: 500000,
  gia_phu_thu_gio: 50000,
  so_gio_toi_thieu: 2,
  mo_ban_theo_gio: true,
  mo_ban_theo_ngay: true,
  mo_ban_theo_dem: true,
  trang_thai_van_hanh: 'Trống',
};
const d = (s: string) => new Date(s + ':00+07:00');
describe('Gia dat phong sau gop goi gia', () => {
  it('gia tron 2 gio dau va lam tron gio phu thu', () =>
    expect(
      tinhGia(
        room,
        'Theo giờ',
        d('2030-01-04T09:00'),
        d('2030-01-04T11:30'),
        GIO_MAC_DINH,
        [],
      ).gia_goc,
    ).toBe(250000));
  it('chan duoi so gio toi thieu va hinh thuc ngung ban', () => {
    expect(() =>
      tinhGia(
        room,
        'Theo giờ',
        d('2030-01-04T09:00'),
        d('2030-01-04T10:00'),
        GIO_MAC_DINH,
        [],
      ),
    ).toThrow('tối thiểu');
    expect(() =>
      tinhGia(
        { ...room, mo_ban_theo_gio: false },
        'Theo giờ',
        d('2030-01-04T09:00'),
        d('2030-01-04T11:00'),
        GIO_MAC_DINH,
        [],
      ),
    ).toThrow('mở bán');
  });
  it('khong vuot khoang dong cua du ca hai dau gio hop le', () =>
    expect(() =>
      tinhGia(
        room,
        'Theo giờ',
        d('2030-01-04T21:00'),
        d('2030-01-05T09:00'),
        GIO_MAC_DINH,
        [],
      ),
    ).toThrow('vượt khung'));
  it('chap nhan khung gio qua nua dem va tra dung gio dong cua', () =>
    expect(
      tinhGia(
        room,
        'Theo giờ',
        d('2030-01-04T23:00'),
        d('2030-01-05T02:00'),
        { ...GIO_MAC_DINH, gio_tu: '20:00', gio_den: '02:00' },
        [],
      ).gia_goc,
    ).toBe(250000));
  it('ap dung gia theo thu trong mui gio Viet Nam, thu tu quy tac da sap', () => {
    const rule: GiaLich = {
      id: 'rule',
      loai_gia: 'gio',
      bat_dau: d('2030-01-01T00:00'),
      ket_thuc: d('2030-02-01T00:00'),
      gia: 300000,
      phu_thu_gio: 70000,
      thu_trong_tuan: [5],
    };
    expect(
      tinhGia(
        room,
        'Theo giờ',
        d('2030-01-04T09:00'),
        d('2030-01-04T12:00'),
        GIO_MAC_DINH,
        [rule],
      ).gia_goc,
    ).toBe(370000);
    expect(
      tinhGia(
        room,
        'Theo giờ',
        d('2030-01-05T09:00'),
        d('2030-01-05T12:00'),
        GIO_MAC_DINH,
        [rule],
      ).gia_goc,
    ).toBe(250000);
  });
  it('tinh tung ngay voi gia lich thay doi, khong doi thanh dem', () => {
    const rules: GiaLich[] = [
      {
        id: 'saturday',
        loai_gia: 'ngay',
        bat_dau: d('2030-01-05T00:00'),
        ket_thuc: d('2030-01-06T00:00'),
        gia: 900000,
        phu_thu_gio: null,
        thu_trong_tuan: null,
      },
    ];
    const q = tinhGia(
      room,
      'Theo ngày',
      d('2030-01-04T14:00'),
      d('2030-01-06T12:00'),
      GIO_MAC_DINH,
      rules,
    );
    expect(q.gia_goc).toBe(1700000);
    expect(q.snapshot.hinh_thuc_dat).toBe('Theo ngày');
  });
  it('qua dem dung gio cau hinh va khong chap nhan gio tu client khac', () => {
    expect(
      tinhGia(
        room,
        'Theo đêm',
        d('2030-01-04T20:00'),
        d('2030-01-05T08:00'),
        GIO_MAC_DINH,
        [],
      ).gia_goc,
    ).toBe(500000);
    expect(() =>
      tinhGia(
        room,
        'Theo đêm',
        d('2030-01-04T19:00'),
        d('2030-01-05T08:00'),
        GIO_MAC_DINH,
        [],
      ),
    ).toThrow('thiết lập');
  });
  it('combo gio thay gia gio dau, combo dich vu cong them', () => {
    const q = tinhGia(
      room,
      'Theo giờ',
      d('2030-01-04T09:00'),
      d('2030-01-04T13:00'),
      GIO_MAC_DINH,
      [],
      { id: 'c', gia_combo: 250000, so_gio_bao_gom: 3 },
    );
    expect(q.gia_goc).toBe(300000);
    expect(
      tinhGia(
        room,
        'Theo đêm',
        d('2030-01-04T20:00'),
        d('2030-01-05T08:00'),
        GIO_MAC_DINH,
        [],
        { id: 'c', gia_combo: 100000, so_gio_bao_gom: null },
      ).gia_goc,
    ).toBe(600000);
  });
  it('chan phong bao tri va combo gio cho dat ngay', () => {
    expect(() =>
      tinhGia(
        { ...room, trang_thai_van_hanh: 'Bảo trì' },
        'Theo giờ',
        d('2030-01-04T09:00'),
        d('2030-01-04T11:00'),
        GIO_MAC_DINH,
        [],
      ),
    ).toThrow('bảo trì');
    expect(() =>
      tinhGia(
        room,
        'Theo ngày',
        d('2030-01-04T14:00'),
        d('2030-01-05T12:00'),
        GIO_MAC_DINH,
        [],
        { id: 'c', gia_combo: 10, so_gio_bao_gom: 2 },
      ),
    ).toThrow('chỉ áp dụng');
  });
  it('thiet lap chi nhan du moc gio 30 phut', () => {
    expect(kiemTraGio({ ...GIO_MAC_DINH })).toEqual(GIO_MAC_DINH);
    expect(() => kiemTraGio({ ...GIO_MAC_DINH, gio_tu: '25:00' })).toThrow();
    expect(() => kiemTraGio({ ...GIO_MAC_DINH, gio_tu: '08:15' })).toThrow();
  });
});

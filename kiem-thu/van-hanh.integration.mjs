import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
export async function kiemTraVanHanh({
  db,
  conn,
  service,
  root,
  admin,
  uid,
  branch,
  type,
  room2,
}) {
  const adapter = { query: (...a) => db.query(...a), end: async () => {} };
  const allow = {
    kiemTraQuanTri: async () => ({}),
    kiemTraTrang: async () => ({}),
  };
  const { VoucherService } = await import(
    root + "/may-chu/dist/quan-tri/voucher.service.js"
  );
  const vouchers = new VoucherService(allow);
  vouchers.db = async () => adapter;
  const now = Date.now(),
    code = "TEST_" + randomUUID().slice(0, 8).toUpperCase();
  const v = await vouchers.save(admin, undefined, {
    ma_khuyen_mai: code,
    ten_khuyen_mai: "Giảm thử",
    loai_giam: "Phần trăm",
    gia_tri: 10,
    don_toi_thieu: 0,
    giam_toi_da: 100000,
    gioi_han_su_dung: 1,
    bat_dau: new Date(now - 86400000).toISOString(),
    ket_thuc: new Date(now + 86400000).toISOString(),
    trang_thai: "Đang hoạt động",
  });
  const day = new Date(now + 100 * 86400000).toISOString().slice(0, 10),
    query = {
      phong_id: room2,
      hinh_thuc_dat: "Theo giờ",
      bat_dau: day + "T08:00:00+07:00",
      ket_thuc: day + "T10:00:00+07:00",
      ma_voucher: code,
    };
  const gross = await service.quote({ ...query, ma_voucher: "" }),
    quote = await service.quote(query);
  assert.equal(
    quote.tien_giam,
    Math.min(100000, Math.floor(gross.tien_phong * 0.1)),
  );
  assert.equal(quote.tong_tien, gross.tien_phong - quote.tien_giam);
  const req = {
    ...query,
    ten_khach: "Khách voucher",
    so_dien_thoai: "0901234567",
    so_khach: 1,
    khoa_yeu_cau: randomUUID(),
    tien_giam: 999999999,
  };
  const order = await service.create(req);
  assert.equal(Number(order.tong_tien), quote.tong_tien);
  assert.equal((await service.create(req)).ma_dat_phong, order.ma_dat_phong);
  await assert.rejects(
    () =>
      service.quote({
        ...query,
        bat_dau: day + "T12:00:00+07:00",
        ket_thuc: day + "T14:00:00+07:00",
      }),
    /hết lượt/,
  );
  await db.query(
    "UPDATE public.dat_phong SET trang_thai='Đã hủy' WHERE ma_dat_phong=$1",
    [order.ma_dat_phong],
  );
  assert.ok((await service.quote(query)).tien_giam > 0);
  await db.query(
    "UPDATE public.nguoi_dung SET trang_thai='Đang hoạt động' WHERE id=$1",
    [uid],
  );
  await vouchers.send(admin, v.id, { khach_ids: [uid] });
  await vouchers.send(admin, v.id, { khach_ids: [uid] });
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int n FROM public.thong_bao WHERE nguoi_dung_id=$1 AND loai='Voucher' AND du_lieu->>'voucher_id'=$2",
        [uid, v.id],
      )
    ).rows[0].n,
    1,
  );

  await db.query(
    "UPDATE public.phong SET trang_thai_van_hanh='Trống',trang_thai_cap_nhat_luc=now() WHERE id=$1",
    [room2],
  );
  const { LichPhongService } = await import(
    root + "/may-chu/dist/quan-tri/lich-phong.service.js"
  );
  const calendar = new LichPhongService(allow);
  calendar.db = async () => adapter;
  const adminBody = {
    ten_khach: "Khách quản trị voucher",
    so_dien_thoai: "0905555555",
    phong_id: room2,
    hinh_thuc_dat: "Theo giờ",
    nhan_phong_luc: day + "T14:00:00+07:00",
    tra_phong_luc: day + "T16:00:00+07:00",
    so_khach: 1,
    tien_phong: 200000,
    ma_voucher: code,
  };
  const made = await calendar.createBooking(admin, adminBody);
  assert.equal(
    Number(
      (
        await db.query("SELECT tong_tien FROM public.dat_phong WHERE id=$1", [
          made.id,
        ])
      ).rows[0].tong_tien,
    ),
    180000,
  );
  const { DonLichService } = await import(
    root + "/may-chu/dist/quan-tri/don-lich.service.js"
  );
  const orders = new DonLichService(allow);
  orders.db = async () => adapter;
  await orders.edit(admin, made.id, { ...adminBody, tien_phong: 300000 });
  assert.equal(
    Number(
      (
        await db.query("SELECT tong_tien FROM public.dat_phong WHERE id=$1", [
          made.id,
        ])
      ).rows[0].tong_tien,
    ),
    270000,
  );
  await orders.edit(admin, made.id, {
    ...adminBody,
    tien_phong: 300000,
    ma_voucher: "",
  });
  assert.equal(
    Number(
      (
        await db.query("SELECT tong_tien FROM public.dat_phong WHERE id=$1", [
          made.id,
        ])
      ).rows[0].tong_tien,
    ),
    300000,
  );
  const { KhachHangQuanTriService } = await import(
    root + "/may-chu/dist/quan-tri/khach-hang.service.js"
  );
  const customers = new KhachHangQuanTriService(allow);
  customers.db = async () => adapter;
  await customers.save(admin, {
    khach_khoa: "p:0909999999",
    ten_khach: "Khách mới",
    so_dien_thoai: "0909999999",
    ghi_chu: "Khách cung cấp",
    so_thich: [{ ten: "Tiện nghi", gia_tri: "Bồn tắm" }],
  });
  let list = await customers.list(admin, { so_thich: "Bồn tắm" });
  assert.ok(list.khach.some((x) => x.khach_khoa === "p:0909999999"));
  assert.ok(list.diem_chung.some((x) => x.gia_tri === "Bồn tắm"));
  assert.equal(
    (await customers.detail(admin, "p:0909999999")).so_thich.length,
    1,
  );
  const forbidden = new KhachHangQuanTriService({
    kiemTraQuanTri: async () => {
      throw Error("Cấm");
    },
  });
  await assert.rejects(() => forbidden.list(uid, {}), /Cấm/);
  const { LichSuService } = await import(
    root + "/may-chu/dist/quan-tri/lich-su.service.js"
  );
  const logs = new LichSuService(allow);
  logs.db = async () => adapter;
  assert.ok((await logs.list(admin, { nhom: "Hệ thống" })).dong.length > 0);
  const cleaner = randomUUID(),
    outsider = randomUUID();
  await db.query("INSERT INTO auth.users(id) VALUES($1),($2)", [
    cleaner,
    outsider,
  ]);
  await db.query(
    "INSERT INTO public.nguoi_dung(id,ho_ten) VALUES($1,'Vệ sinh thử'),($2,'Chi nhánh khác')",
    [cleaner, outsider],
  );
  const role = (
    await db.query(
      "SELECT id FROM public.vai_tro WHERE ma_vai_tro='Nhân viên vệ sinh'",
    )
  ).rows[0].id;
  await db.query(
    "INSERT INTO public.nguoi_dung_vai_tro(nguoi_dung_id,vai_tro_id,homestay_id) VALUES($1,$2,$3)",
    [cleaner, role, branch],
  );
  const fresh = (
    await db.query(
      "INSERT INTO public.phong(homestay_id,loai_phong_id,ma_phong,ten_phong,gia_moi_gio) VALUES($1,$2,'VS_TEST','Phòng vệ sinh',100000) RETURNING id",
      [branch, type],
    )
  ).rows[0].id;
  const end = new Date(now + 10 * 60000),
    start = new Date(now - 2 * 3600000);
  const d = (
    await db.query(
      "INSERT INTO public.dat_phong(ma_dat_phong,ten_don,homestay_id,phong_id,hinh_thuc_dat,nhan_phong_luc,tra_phong_luc,so_khach,trang_thai,tien_phong) VALUES($1,'Nhắc vệ sinh',$2,$3,'Theo giờ',$4,$5,1,'Đã nhận phòng',200000) RETURNING id",
      [
        "TESTVS" + randomUUID(),
        branch,
        fresh,
        start.toISOString(),
        end.toISOString(),
      ],
    )
  ).rows[0];
  const { nhacVeSinh, VeSinhService } = await import(
    root + "/may-chu/dist/quan-tri/ve-sinh.service.js"
  );
  await nhacVeSinh(adapter);
  await nhacVeSinh(adapter);
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int n FROM public.cong_viec_ve_sinh WHERE dat_phong_id=$1",
        [d.id],
      )
    ).rows[0].n,
    1,
  );
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int n FROM public.thong_bao WHERE nguoi_dung_id=$1 AND loai='Sắp trả phòng'",
        [cleaner],
      )
    ).rows[0].n,
    1,
  );
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int n FROM public.thong_bao WHERE nguoi_dung_id=$1 AND loai='Sắp trả phòng'",
        [outsider],
      )
    ).rows[0].n,
    0,
  );
  const clean = new VeSinhService(allow);
  clean.db = async () => adapter;
  const job = (await clean.list(cleaner)).find((x) => x.dat_phong_id === d.id);
  assert.ok(job);
  await assert.rejects(
    () => clean.update(outsider, job.id, { hanh_dong: "nhan" }),
    /chi nhánh/,
  );
  await assert.rejects(()=>clean.update(outsider,job.id,{hanh_dong:'hoan-thanh'}),/chi nhánh/);
  assert.equal(job.nhan_vien,undefined);
  await assert.rejects(
    () => clean.update(cleaner, job.id, { hanh_dong: "hoan-thanh" }),
    /trả phòng/,
  );
  await db.query(
    "UPDATE public.dat_phong SET trang_thai='Đã trả phòng' WHERE id=$1",
    [d.id],
  );
  await clean.update(cleaner, job.id, {
    hanh_dong: "hoan-thanh",
    noi_dung: "Đã vệ sinh sạch",
  });
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int n FROM public.bao_cao_ve_sinh WHERE cong_viec_id=$1",
        [job.id],
      )
    ).rows[0].n,
    1,
  );

  await clean.update(cleaner,job.id,{hanh_dong:'hoan-thanh'});
  assert.equal((await db.query('SELECT count(*)::int n FROM public.bao_cao_ve_sinh WHERE cong_viec_id=$1',[job.id])).rows[0].n,1);
  const {ThietBiController}=await import(root+'/may-chu/dist/quan-tri/van-hanh.controller.js');const devices=new ThietBiController();devices.db=async()=>adapter;const push='test-push-token-'+randomUUID();await devices.register({nguoiDung:{id:uid}},{ma_thiet_bi:push,nen_tang:'Android'});await devices.remove({nguoiDung:{id:cleaner}},{ma_thiet_bi:push});assert.equal((await db.query('SELECT count(*)::int n FROM public.thiet_bi_thong_bao WHERE ma_thiet_bi=$1',[push])).rows[0].n,1);await devices.remove({nguoiDung:{id:uid}},{ma_thiet_bi:push});assert.equal((await db.query('SELECT count(*)::int n FROM public.thiet_bi_thong_bao WHERE ma_thiet_bi=$1',[push])).rows[0].n,0);const ownNotices=await devices.notices({nguoiDung:{id:uid}});assert.ok(ownNotices.some(x=>x.loai==='Voucher'));const notice=ownNotices.find(x=>x.loai==='Voucher');await devices.read({nguoiDung:{id:cleaner}},notice.id);assert.equal((await db.query('SELECT da_doc_luc FROM public.thong_bao WHERE id=$1',[notice.id])).rows[0].da_doc_luc,null);
  console.log(
    "PASS vận hành: voucher server/tổng tiền/idempotency/hết lượt/hủy/gửi không lặp, hồ sơ khách/điểm chung/quyền, lịch sử, nhắc vệ sinh 15 phút/đúng chi nhánh/không lặp/không làm sớm/hoàn tất.",
  );
}

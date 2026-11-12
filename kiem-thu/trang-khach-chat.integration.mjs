import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import fs from "node:fs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const root = fileURLToPath(new URL("../", import.meta.url)).replace(
    /[\\/]$/,
    "",
  ),
  db = new PGlite({ extensions: { btree_gist, pgcrypto } });
await db.exec(
  "CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA storage;CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);",
);
for (const f of [
  "homestay.sql",
  "lich-phong-quan-tri.sql",
  "them-ghi-chu-khoa-phong.sql",
  "thong-tin-khach-lich-khoa.sql",
  "dat-phong-khach-chua-co-tai-khoan.sql",
  "dong-bo-combo-va-chung-tu.sql",
  "20261106-dong-bo-kieu-dat-va-ten-don.sql",
  "20261106-quan-ly-combo.sql",
  "20261107-nhieu-anh-combo.sql",
])
  await db.exec(
    fs.readFileSync(root + "/co-so-du-lieu/migrations/" + f, "utf8"),
  );
const uid = randomUUID(),
  other = randomUUID(),
  admin = randomUUID(),
  branch = randomUUID(),
  type = randomUUID(),
  room = randomUUID(),
  room2 = randomUUID();
await db.query("INSERT INTO auth.users VALUES($1),($2),($3)", [
  uid,
  other,
  admin,
]);
for (const id of [uid, other, admin])
  await db.query("INSERT INTO public.nguoi_dung(id,ho_ten) VALUES($1,$2)", [
    id,
    "Khách thử",
  ]);
await db.query(
  "INSERT INTO public.homestay(id,ten_homestay,dia_chi,tinh_thanh,trang_thai) VALUES($1,'Chi nhánh A','Địa chỉ','TP HCM','Đang hoạt động')",
  [branch],
);
await db.query(
  "INSERT INTO public.loai_phong(id,homestay_id,ten_loai,suc_chua) VALUES($1,$2,'Cao cấp',2)",
  [type, branch],
);
for (const id of [room, room2])
  await db.query(
    "INSERT INTO public.phong(id,homestay_id,loai_phong_id,ma_phong,ten_phong,gia_moi_gio,gia_phu_thu_gio,so_gio_toi_thieu) VALUES($1,$2,$3,$4,'Phòng thử',200000,50000,2)",
    [id, branch, type, id.slice(0, 5)],
  );
const legacyThread = (
  await db.query(
    "INSERT INTO public.cuoc_tro_chuyen(khach_hang_id) VALUES($1) RETURNING id",
    [uid],
  )
).rows[0].id;
await db.query(
  "INSERT INTO public.tin_nhan(cuoc_tro_chuyen_id,nguoi_gui_id,loai_nguoi_gui,noi_dung) VALUES($1,$2,'Khách hàng','Tin trước migration')",
  [legacyThread, uid],
);
const beforeKeys = (
  await db.query(
    "SELECT oid,conname,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace ORDER BY oid",
  )
).rows;
await db.exec(
  fs.readFileSync(
    root + "/co-so-du-lieu/migrations/20261108-trang-khach-va-chat.sql",
    "utf8",
  ),
);
assert.deepEqual(
  (
    await db.query(
      "SELECT oid,conname,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE oid=ANY($1::oid[]) ORDER BY oid",
      [beforeKeys.map((r) => r.oid)],
    )
  ).rows,
  beforeKeys,
);
assert.equal(
  (
    await db.query(
      "SELECT noi_dung FROM public.tin_nhan WHERE cuoc_tro_chuyen_id=$1",
      [legacyThread],
    )
  ).rows[0].noi_dung,
  "Tin trước migration",
);
assert.equal(
  (
    await db.query(
      "SELECT nguoi_dung_id FROM public.thanh_vien_tro_chuyen WHERE cuoc_tro_chuyen_id=$1",
      [legacyThread],
    )
  ).rows[0].nguoi_dung_id,
  uid,
);
await db.query(
  "INSERT INTO public.nguoi_dung_vai_tro(nguoi_dung_id,vai_tro_id) SELECT $1,id FROM public.vai_tro WHERE ma_vai_tro='Quản trị hệ thống'",
  [admin],
);
const connection = async () => ({
  query: async (sql, args) => {
    const r = await db.query(sql, args);
    return { ...r, rowCount: r.rows.length || r.affectedRows || 0 };
  },
  end: async () => {},
});
const users = {
  a: { id: uid, phone: "+84901234567", phone_verified: true },
  b: { id: other, phone: "+84901234567", phone_verified: false },
  admin: { id: admin, phone_verified: false },
};
const conn = {
  db: connection,
  identity: async (token) => (token ? users[token] : null),
  id: (value) => {
    if (!/^[a-f0-9-]{36}$/.test(value)) throw Error("ID");
    return value;
  },
  staff: async (c, id) => id === admin,
};
const { KetNoiKhachService } = await import(
  root + "/may-chu/dist/khach-hang/ket-noi.service.js"
);
conn.staff = (c, id, branch) =>
  KetNoiKhachService.prototype.staff.call(conn, c, id, branch);
const { TrangKhachService } = await import(
  root + "/may-chu/dist/khach-hang/trang-khach.service.js"
);
const { ChatService } = await import(
  root + "/may-chu/dist/khach-hang/chat.service.js"
);
const service = new TrangKhachService(conn),
  chat = new ChatService(conn);
const day = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
  q = {
    bat_dau: day + "T08:00:00+07:00",
    ket_thuc: day + "T11:00:00+07:00",
    hinh_thuc_dat: "Theo giờ",
  };
assert.equal((await service.rooms(q)).length, 2);
const combo = (
  await db.query(
    "INSERT INTO public.combo(homestay_id,ten_combo,gia_combo,so_gio_bao_gom,pham_vi) VALUES($1,'Combo thử',150000,2,'toan_he_thong') RETURNING id",
    [branch],
  )
).rows[0].id;
assert.equal(
  (await service.combos({ ...q, phong_id: room }))[0].tong_gia,
  200000,
);
const body = {
  ...q,
  phong_id: room,
  ten_khach: "Khách vãng lai",
  so_dien_thoai: "0901234567",
  so_khach: 1,
  tien_phong: 1,
  trang_thai: "Đã xác nhận",
  khoa_yeu_cau: randomUUID(),
};
const booking = await service.create(body);
assert.equal(Number(booking.tong_tien), 250000);
assert.equal(booking.trang_thai, "Chờ xác nhận");
assert.equal((await service.create(body)).ma_dat_phong, booking.ma_dat_phong);
await assert.rejects(
  () => service.create({ ...body, khoa_yeu_cau: randomUUID() }),
  /vừa được đặt/,
);
assert.equal((await service.rooms(q)).length, 1);
assert.equal((await service.history("b")).length, 0);
const history = await service.history("a");
assert.equal(history.length, 1);
assert.equal(history[0].ma_dat_phong, booking.ma_dat_phong);
assert.equal((await service.history("b")).length, 0);
await db.query(
  "UPDATE public.dat_phong SET het_han_giu_cho=now()-interval '1 minute' WHERE ma_dat_phong=$1",
  [booking.ma_dat_phong],
);
assert.equal((await service.rooms(q)).length, 2);
assert.equal(
  (
    await db.query(
      "SELECT trang_thai FROM public.dat_phong WHERE ma_dat_phong=$1",
      [booking.ma_dat_phong],
    )
  ).rows[0].trang_thai,
  "Hết hạn",
);
const guest = await chat.start({ chi_nhanh_id: branch });
assert.ok(guest.guest_token);
const nonce = randomUUID();
await chat.send(
  guest.id,
  { noi_dung: "Chào nhân viên", ma_phia_khach: nonce },
  undefined,
  guest.guest_token,
);
await chat.send(
  guest.id,
  { noi_dung: "Chào nhân viên", ma_phia_khach: nonce },
  undefined,
  guest.guest_token,
);
assert.equal(
  (await chat.messages(guest.id, undefined, guest.guest_token)).tin_nhan.length,
  1,
);
await assert.rejects(
  () => chat.messages(guest.id, undefined, "a".repeat(64)),
  /Không có quyền/,
);
await chat.send(
  guest.id,
  { noi_dung: "Chào bạn", ma_phia_khach: randomUUID() },
  "admin",
);
assert.equal(
  (await chat.messages(guest.id, undefined, guest.guest_token)).tin_nhan.length,
  2,
);
const direct = await chat.start({ nguoi_nhan_id: other }, "a");
await chat.send(
  direct.id,
  { noi_dung: "Tin riêng", ma_phia_khach: randomUUID() },
  "a",
);
assert.equal((await chat.messages(direct.id, "b")).tin_nhan.length, 1);
await assert.rejects(() => chat.messages(direct.id, "admin"), /Không có quyền/);
const reverse = await chat.start({ nguoi_nhan_id: uid }, "b");
assert.equal(reverse.id, direct.id);
const linked = await chat.start(
  { chi_nhanh_id: branch },
  "a",
  guest.guest_token,
);
assert.equal(linked.id, guest.id);
await assert.rejects(
  () => chat.start({ chi_nhanh_id: branch }, "b", guest.guest_token),
  /tài khoản khác/,
);
await assert.rejects(
  () => chat.messages(guest.id, undefined, guest.guest_token),
  /Không có quyền/,
);
const { GioiHanTruyCapService } = await import(
  root + "/may-chu/dist/xac-thuc/gioi-han.service.js"
);
const limiter = new GioiHanTruyCapService();
limiter.pool = {
  query: async (sql, args) => db.query(sql, args),
  end: async () => {},
};
await limiter.limit("local", "test", 2);
await limiter.limit("local", "test", 2);
await assert.rejects(
  () => limiter.limit("local", "test", 2),
  (e) => e.getStatus() === 429,
);
console.log(
  "PASS PostgreSQL: giữ khóa ngoại và chat cũ qua migration, giới hạn truy cập 429;  tìm phòng/giá server/không tin giá và trạng thái client/giữ phòng/gửi trùng/chống trùng/nhận đơn chỉ qua SĐT đã xác minh/hết hạn; chat guest/staff/IDOR/direct riêng tư/kết nối guest sau đăng nhập/chống gửi trùng.",
);
// Nhân viên: SQL thật trên PostgreSQL cục bộ; không chạm Supabase/Auth thật.
await db.exec("ALTER TABLE auth.users ADD COLUMN email text");
const { NhanVienService } = await import(
  root + "/may-chu/dist/quan-tri/nhan-vien.service.js"
);
const employees = new NhanVienService({
  kiemTraQuanTri: async (id) => {
    if (id !== admin) throw Error("Forbidden");
  },
});
employees.db = connection;
let provisioned;
const removed = [];
employees.auth = () => ({
  createUser: async () => {
    provisioned = randomUUID();
    await db.query("INSERT INTO auth.users(id,email) VALUES($1,$2)", [
      provisioned,
      "local@test.invalid",
    ]);
    return { data: { user: { id: provisioned } }, error: null };
  },
  deleteUser: async (id) => {
    removed.push(id);
    await db.query("DELETE FROM auth.users WHERE id=$1", [id]);
    return { error: null };
  },
});
const profile = {
  ho_ten: "Nhân viên thử",
  so_dien_thoai: "0909999999",
  trang_thai: "Đang hoạt động",
  vai_tro: "Chăm sóc khách hàng",
  chi_nhanh_ids: [branch],
};
await assert.rejects(() => employees.list(uid), /Forbidden/);
await assert.rejects(
  () =>
    employees.save(admin, undefined, {
      ...profile,
      vai_tro: "Quản trị hệ thống",
    }),
  /Vai trò/,
);
await assert.rejects(
  () =>
    employees.save(admin, undefined, {
      ...profile,
      chi_nhanh_ids: [randomUUID()],
      nguoi_dung_id: uid,
    }),
  /Chi nhánh không tồn tại/,
);
await assert.rejects(() => employees.save(admin, admin, profile), /quản trị/);
await assert.rejects(() => employees.remove(admin, admin), /Không tự/);
await employees.save(admin, undefined, { ...profile, nguoi_dung_id: uid });
let person = await employees.detail(admin, uid);
assert.equal(person.phan_cong.length, 1);
assert.equal(person.phan_cong[0].vai_tro, "Chăm sóc khách hàng");
await employees.save(admin, uid, {
  ...profile,
  vai_tro: "Nhân viên vệ sinh",
  trang_thai: "Tạm khóa",
});
person = await employees.detail(admin, uid);
assert.equal(person.trang_thai, "Tạm khóa");
assert.equal(person.phan_cong[0].vai_tro, "Nhân viên vệ sinh");
assert.equal(
  (
    await db.query(
      "SELECT count(*)::int AS n FROM public.nguoi_dung_vai_tro WHERE nguoi_dung_id=$1 AND ngay_thu_hoi IS NOT NULL",
      [uid],
    )
  ).rows[0].n,
  1,
);
await employees.remove(admin, uid);
person = await employees.detail(admin, uid);
assert.equal(person.phan_cong.length, 0);
assert.equal(
  (
    await db.query("SELECT count(*)::int AS n FROM auth.users WHERE id=$1", [
      uid,
    ])
  ).rows[0].n,
  1,
);
assert.ok(
  (
    await db.query(
      "SELECT count(*)::int AS n FROM public.nhat_ky_he_thong WHERE ban_ghi_id=$1",
      [uid],
    )
  ).rows[0].n >= 3,
);
const newEmployee = await employees.save(admin, undefined, {
  ...profile,
  so_dien_thoai: "0908888888",
  email: "local@test.invalid",
  mat_khau: "local-test-password-123",
});
assert.equal(newEmployee.id, provisioned);
await assert.rejects(
  () =>
    employees.save(admin, undefined, {
      ...profile,
      so_dien_thoai: "0908888888",
      email: "duplicate@test.invalid",
      mat_khau: "local-test-password-123",
    }),
  /đã được sử dụng/,
);
assert.ok(removed.includes(provisioned));
console.log(
  "PASS Nhân viên: tạo tài khoản giả lập/gán tài khoản cũ, danh sách/chi tiết/sửa/gỡ, phân công theo chi nhánh, giữ lịch sử, nhật ký, chặn nâng quyền/quản trị, rollback và bù trừ Auth.",
);
await db.exec(
  "CREATE TABLE IF NOT EXISTS public.migrations_ung_dung(phien_ban text PRIMARY KEY,ngay_chay timestamptz DEFAULT now())",
);
await db.exec(
  fs.readFileSync(
    root + "/co-so-du-lieu/migrations/20261112-quan-ly-trang-chu.sql",
    "utf8",
  ),
);
const { TrangChuService, MAC_DINH_TRANG_CHU } = await import(
  root + "/may-chu/dist/quan-tri/trang-chu.service.js"
);
const cms = new TrangChuService({
  kiemTraQuanTri: async (id) => {
    if (id !== admin) throw Error("Forbidden");
  },
});
cms.db = connection;
await assert.rejects(() => cms.read(uid), /Forbidden/);
const draft = structuredClone(MAC_DINH_TRANG_CHU);
draft.hero.tieu_de = "Tên riêng đang soạn";
draft.gioi_thieu = {
  hien: false,
  tieu_de: "Nội dung ẩn",
  noi_dung: "Không được trả public",
  anh: "",
};
draft.the = [
  {
    hien: true,
    tieu_de: "<script>text</script>",
    noi_dung: "Nội dung",
    anh: "",
  },
  { hien: false, tieu_de: "Ẩn", noi_dung: "bí mật bản nháp", anh: "" },
];
let saved = await cms.save(admin, {
  cau_hinh: draft,
  phien_ban: 1,
  xuat_ban: false,
});
assert.equal(saved.phien_ban, 2);
assert.notEqual((await cms.read()).hero.tieu_de, draft.hero.tieu_de);
await assert.rejects(
  () => cms.save(admin, { cau_hinh: draft, phien_ban: 1, xuat_ban: true }),
  /phiên khác/,
);
saved = await cms.save(admin, {
  cau_hinh: draft,
  phien_ban: 2,
  xuat_ban: true,
});
let publicHome = await cms.read();
assert.equal(publicHome.hero.tieu_de, draft.hero.tieu_de);
assert.equal(publicHome.gioi_thieu, null);
assert.equal(publicHome.the.length, 1);
assert.equal(publicHome.ban_nhap, undefined);
const bad = structuredClone(draft);
bad.hero.anh = "javascript:alert(1)";
await assert.rejects(
  () => cms.save(admin, { cau_hinh: bad, phien_ban: 3, xuat_ban: true }),
  /Chỉ dùng ảnh/,
);
draft.hien_phong = false;
draft.hero.hien = false;
await cms.save(admin, { cau_hinh: draft, phien_ban: 3, xuat_ban: true });
publicHome = await cms.read();
assert.equal(publicHome.hero, null);
assert.equal(publicHome.hien_phong, false);
await db.exec(
  fs.readFileSync(
    root + "/co-so-du-lieu/migrations/20261112-quan-ly-trang-chu.sql",
    "utf8",
  ),
);
assert.equal((await cms.read()).hien_phong, false);
await assert.rejects(
  () =>
    cms.upload(admin, {
      buffer: Buffer.from("<script>"),
      size: 8,
      mimetype: "image/png",
    }),
  /đúng định dạng/,
);
console.log(
  "PASS Trang chủ: nháp tách xuất bản, bật/tắt/ẩn nội dung khỏi API public, chống ghi đè phiên khác, quyền quản trị, chặn URL/tệp giả ảnh, migration chạy lại giữ dữ liệu.",
);
await db.close();

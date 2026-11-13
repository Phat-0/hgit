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
  "CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY,phone text,phone_confirmed_at timestamptz);CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA storage;CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);",
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
await db.exec(
  "CREATE TABLE IF NOT EXISTS public.migrations_ung_dung(phien_ban text PRIMARY KEY,ngay_chay timestamptz DEFAULT now())",
);
await db.exec(
  fs.readFileSync(
    root + "/co-so-du-lieu/migrations/20261112-chat-tim-kiem-va-chua-doc.sql",
    "utf8",
  ),
);
await db.exec(
  fs.readFileSync(
    root + "/co-so-du-lieu/migrations/20261112-chat-tep-mau-thong-bao.sql",
    "utf8",
  ),
);
await db.exec(
  fs.readFileSync(
    root + "/co-so-du-lieu/migrations/20261112-quyen-trigger-thong-bao.sql",
    "utf8",
  ),
);
await db.exec(
  fs.readFileSync(
    root + "/co-so-du-lieu/migrations/20261112-thu-tu-mau-ten-khach.sql",
    "utf8",
  ),
);
await db.exec(fs.readFileSync(root+'/co-so-du-lieu/migrations/20261113092348_tong_quan_danh_gia_quyen_lich.sql','utf8'));
await db.exec(fs.readFileSync(root+'/co-so-du-lieu/migrations/20261113111315_tach_trang_thai_phong_thanh_toan_anh_don.sql','utf8'));
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
// Hộp thư: số chưa đọc theo người, không đánh dấu khi chỉ GET, không lùi mốc đọc.
const guestInbox = await chat.list(undefined, guest.guest_token);
assert.equal(guestInbox.tong_chua_doc, 1);
assert.equal(guestInbox.hoi_thoai[0].ten_hien_thi, "Hỗ trợ HomeStay");
const gm = (await chat.messages(guest.id, undefined, guest.guest_token))
  .tin_nhan;
assert.equal(gm[0].ten_nguoi_gui, "Bạn");
assert.equal(gm[1].ten_nguoi_gui, "Hỗ trợ HomeStay");
assert.equal(gm[1].loai_nguoi_gui, undefined);
await chat.read(guest.id, gm.at(-1).id, undefined, guest.guest_token);
assert.equal((await chat.list(undefined, guest.guest_token)).tong_chua_doc, 0);
const firstPrivate = (await chat.messages(direct.id, "b")).tin_nhan[0];
assert.equal((await chat.list("b")).tong_chua_doc, 1);
await chat.messages(direct.id, "b");
assert.equal((await chat.list("b")).tong_chua_doc, 1);
await assert.rejects(
  () => chat.read(direct.id, firstPrivate.id, "admin"),
  /Không có quyền/,
);
await assert.rejects(() => chat.read(direct.id, gm[0].id, "b"), /không thuộc/);
await chat.read(direct.id, firstPrivate.id, "b");
assert.equal((await chat.list("b")).tong_chua_doc, 0);
await chat.send(
  direct.id,
  { noi_dung: "Tin mới sau mốc đọc", ma_phia_khach: randomUUID() },
  "a",
);
await chat.read(direct.id, firstPrivate.id, "b");
assert.equal((await chat.list("b")).tong_chua_doc, 1);
await chat.send(
  direct.id,
  { noi_dung: "B phản hồi", ma_phia_khach: randomUUID() },
  "b",
);
assert.equal((await chat.list("b")).tong_chua_doc, 1);
assert.equal((await chat.list("a")).tong_chua_doc, 1);
await db.query(
  "UPDATE public.nguoi_dung SET ho_ten=CASE WHEN id=$1 THEN 'Nguyễn An' WHEN id=$2 THEN 'Trần Bình' ELSE 'Lê Phúc' END WHERE id=ANY($3::uuid[])",
  [uid, other, [uid, other, admin]],
);
assert.ok(
  (await chat.people("tran binh", "a")).nguoi_dung.some((p) => p.id === other),
);
assert.ok(
  (await chat.people("le phuc", "a")).nguoi_dung.some((p) => p.id === admin),
);
const outsider = randomUUID();
await db.query("INSERT INTO auth.users(id) VALUES($1)", [outsider]);
await db.query(
  "INSERT INTO public.nguoi_dung(id,ho_ten,so_dien_thoai) VALUES($1,'Người riêng tư','0907777777')",
  [outsider],
);
assert.equal((await chat.people("Nguoi rieng tu", "a")).nguoi_dung.length, 0);
const exact = (await chat.people("0907777777", "a")).nguoi_dung;
assert.equal(exact[0].id, outsider);
assert.equal(exact[0].so_dien_thoai, undefined);
assert.equal(exact[0].email, undefined);
assert.equal(
  (await chat.list("a", undefined, "Trần Bình")).hoi_thoai[0].id,
  direct.id,
);
assert.ok((await chat.list("a")).hoi_thoai[0].tin_cuoi_luc);
await db.query(
  "INSERT INTO public.cuoc_tro_chuyen(homestay_id) SELECT $1 FROM generate_series(1,45)",
  [branch],
);
const page1 = await chat.list("admin");
const page2 = await chat.list("admin", undefined, "", 40);
assert.equal(page1.hoi_thoai.length, 40);
assert.ok(page2.hoi_thoai.length > 0);
assert.equal(
  new Set([...page1.hoi_thoai, ...page2.hoi_thoai].map((t) => t.id)).size,
  page1.tong_so,
);
await db.query(
  "INSERT INTO public.tin_nhan(cuoc_tro_chuyen_id,nguoi_gui_id,loai_nguoi_gui,noi_dung) SELECT $1,$2,'Khách hàng','Lịch sử '||i FROM generate_series(1,61) AS i",
  [direct.id, uid],
);
const recent = await chat.messages(direct.id, "b");
assert.equal(recent.tin_nhan.length, 60);
assert.equal(recent.co_tin_cu, true);
const olderPage = await chat.messages(
  direct.id,
  "b",
  undefined,
  recent.tin_nhan[0].id,
);
assert.ok(olderPage.tin_nhan.length > 0);
assert.ok(
  !olderPage.tin_nhan.some((m) => recent.tin_nhan.some((n) => n.id === m.id)),
);
assert.equal(
  (await chat.list("a", undefined, "tran binh")).hoi_thoai[0].id,
  direct.id,
);
console.log(
  "PASS Hộp thư: đếm chưa đọc/không tính tin tự gửi, GET không đánh dấu đọc, mốc không lùi/IDOR/cross-thread, nhãn khách, tìm tên không dấu/SĐT không lộ danh bạ, giờ tin cuối, tải đủ >40 hội thoại và >60 tin.",
);
const linked = await chat.start(
  { chi_nhanh_id: branch },
  "a",
  guest.guest_token,
);
assert.equal(linked.id, guest.id);
assert.equal((await chat.messages(guest.id, "a")).tin_nhan[0].cua_toi, true);
assert.equal(
  (await chat.list("a")).hoi_thoai.find((t) => t.id === guest.id).chua_doc,
  0,
);
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
  kiemTraTrang: async (id) => {
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
// Tệp riêng tư và câu trả lời mẫu, Storage giả lập, SQL thật.
const stored = new Map(),
  removedKeys = [];
let uploads = 0;
chat.storage = () => ({
  upload: async (path, buffer) => {
    uploads++;
    stored.set(path, buffer);
    return { error: null };
  },
  createSignedUrl: async (path, _ttl, options) => ({
    data: {
      signedUrl:
        "https://storage.test/private/" +
        encodeURIComponent(path) +
        (options ? "?download=1" : ""),
    },
    error: null,
  }),
  remove: async (paths) => {
    for (const p of paths) {
      removedKeys.push(p);
      stored.delete(p);
    }
    return { error: null };
  },
});
const fileChat = await chat.start({ chi_nhanh_id: branch });
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
const uploadFile = {
  buffer: png,
  size: png.length,
  mimetype: "image/png",
  originalname: "../../phong.png",
};
const fileNonce = randomUUID();
await assert.rejects(
  () =>
    chat.upload(fileChat.id, { ma_phia_khach: randomUUID() }, uploadFile, "b"),
  /Không có quyền/,
);
assert.equal(uploads, 0);
const imageMessage = await chat.upload(
  fileChat.id,
  { ma_phia_khach: fileNonce },
  uploadFile,
  undefined,
  fileChat.guest_token,
);
await chat.upload(
  fileChat.id,
  { ma_phia_khach: fileNonce },
  uploadFile,
  undefined,
  fileChat.guest_token,
);
assert.equal(uploads, 1);
const fm = (
  await chat.messages(fileChat.id, undefined, fileChat.guest_token)
).tin_nhan.at(-1);
assert.ok(fm.tep.url);
assert.equal(fm.tep.duong_dan, undefined);
assert.equal(fm.tep.la_anh, true);
assert.ok(!fm.tep.ten_tep.includes("/"));
assert.equal(
  (
    await chat.files(
      fileChat.id,
      "anh",
      "phong",
      0,
      undefined,
      fileChat.guest_token,
    )
  ).tep.length,
  1,
);
await assert.rejects(
  () => chat.files(fileChat.id, "anh", "", 0, "b"),
  /Không có quyền/,
);
const pdf = Buffer.from("%PDF-1.7 local test");
await chat.upload(
  fileChat.id,
  { ma_phia_khach: randomUUID(), noi_dung: "Tài liệu tham khảo" },
  {
    buffer: pdf,
    size: pdf.length,
    mimetype: "application/pdf",
    originalname: "huong-dan.pdf",
  },
  "admin",
);
const lib = await chat.files(
  fileChat.id,
  "tep",
  "huong",
  0,
  undefined,
  fileChat.guest_token,
);
assert.equal(lib.tep.length, 1);
assert.match(lib.tep[0].url, /download/);
assert.ok(
  (
    await chat.searchMessages(
      fileChat.id,
      "Tài liệu",
      0,
      undefined,
      fileChat.guest_token,
    )
  ).tin_nhan.length,
);
assert.ok(
  (
    await chat.messages(
      fileChat.id,
      undefined,
      fileChat.guest_token,
      undefined,
      imageMessage.id,
    )
  ).tin_nhan.some((m) => m.id === imageMessage.id),
);
await assert.rejects(
  () =>
    chat.messages(
      fileChat.id,
      undefined,
      fileChat.guest_token,
      undefined,
      firstPrivate.id,
    ),
  /không thuộc/,
);
await assert.rejects(
  () =>
    chat.upload(
      fileChat.id,
      { ma_phia_khach: randomUUID() },
      {
        buffer: Buffer.from("<script>"),
        size: 8,
        mimetype: "image/png",
        originalname: "fake.png",
      },
      undefined,
      fileChat.guest_token,
    ),
  /Chỉ nhận/,
);
const realDb = conn.db;
conn.db = async () => {
  const c = await realDb();
  return {
    ...c,
    query: async (sql, args) => {
      if (sql.startsWith("INSERT INTO public.tep_tin_chat"))
        throw Error("test rollback metadata");
      return c.query(sql, args);
    },
  };
};
const badNonce = randomUUID();
await assert.rejects(
  () =>
    chat.upload(
      fileChat.id,
      { ma_phia_khach: badNonce },
      uploadFile,
      undefined,
      fileChat.guest_token,
    ),
  /rollback metadata/,
);
conn.db = realDb;
assert.equal(
  (
    await db.query(
      "SELECT count(*)::int AS n FROM public.tin_nhan WHERE ma_phia_khach=$1",
      [badNonce],
    )
  ).rows[0].n,
  0,
);
assert.ok(removedKeys.length);
const { TienIchChatService } = await import(
  root + "/may-chu/dist/quan-tri/tien-ich-chat.service.js"
);
const utils = new TienIchChatService({
  kiemTraTrang: async (id) => {
    if (id !== admin) throw Error("Forbidden");
  },
});
utils.db = connection;
const template = await utils.saveTemplate(admin, undefined, {
  tieu_de: "Tên và chi nhánh",
  nhom: "Chào hỏi",
  noi_dung: "Chào {{ten_khach}} tại {{chi_nhanh}}",
  homestay_id: branch,
  hien: true,
});
const replies = await chat.replies(fileChat.id, "admin");
assert.equal(replies.mau.find((m) => m.id === template.id).du_gui_ngay, false);
await assert.rejects(
  () => chat.replies(fileChat.id, undefined, fileChat.guest_token),
  /Unauthorized/,
);
await assert.rejects(() => utils.templates(uid), /Forbidden/);
await utils.saveTemplate(admin, template.id, {
  tieu_de: "Đã sửa",
  nhom: "Hỗ trợ",
  noi_dung: "Xin chào bạn!",
  homestay_id: null,
  hien: true,
});
assert.equal(
  (await chat.replies(fileChat.id, "admin")).mau.find(
    (m) => m.id === template.id,
  ).du_gui_ngay,
  true,
);
await utils.deleteTemplate(admin, template.id);
assert.ok(
  !(await utils.templates(admin)).mau.some((m) => m.id === template.id),
);
const simpleInbox = await chat.list("admin", undefined, "", 0, true);
assert.ok(
  simpleInbox.hoi_thoai.every((t) => t.ten_hien_thi === "Hỗ trợ HomeStay"),
);
const beforeCount = (await utils.notifications(admin)).tong_so;
const noticeBooking = randomUUID();
await db.query(
  "INSERT INTO public.dat_phong(id,ma_dat_phong,nguoi_dung_id,homestay_id,phong_id,hinh_thuc_dat,nhan_phong_luc,tra_phong_luc,so_khach,tien_phong,ten_don,trang_thai) VALUES($1,$2,$3,$4,$5,'Theo giờ',now()+interval '40 days',now()+interval '40 days 3 hours',1,200000,'Khách thông báo','Đã xác nhận')",
  [noticeBooking, "DP-NOTICE-" + noticeBooking.slice(0, 8), uid, branch, room],
);
assert.equal((await utils.notifications(admin)).tong_so, beforeCount + 1);
await db.query("UPDATE public.dat_phong SET trang_thai='Đã hủy' WHERE id=$1", [
  noticeBooking,
]);
await db.query("UPDATE public.dat_phong SET trang_thai='Đã hủy' WHERE id=$1", [
  noticeBooking,
]);
assert.equal((await utils.notifications(admin)).tong_so, beforeCount + 2);
const cancelNotice = (
  await utils.notifications(admin, "Đơn hủy")
).thong_bao.find((n) => n.du_lieu.dat_phong_id === noticeBooking);
assert.ok(cancelNotice);
await utils.readNotification(admin, cancelNotice.id);
assert.ok(
  (await utils.notifications(admin, "Đơn hủy")).thong_bao.find(
    (n) => n.id === cancelNotice.id,
  ).da_doc_luc,
);
await assert.rejects(() => utils.notifications(uid), /Forbidden/);
const foreignNotice = (
  await db.query(
    "INSERT INTO public.thong_bao(nguoi_dung_id,tieu_de,noi_dung,loai) VALUES($1,'Riêng','Nội dung','Đơn mới') RETURNING id",
    [other],
  )
).rows[0].id;
await assert.rejects(
  () => utils.readNotification(admin, foreignNotice),
  /Không tìm thấy/,
);
console.log(
  "PASS Tiện ích: ảnh/tệp có ACL và link riêng tư, chống gửi lặp/rollback xóa tệp mới, tìm tin/ngữ cảnh, kho tệp, CRUD mẫu/quyền/biến thiếu, chế độ khách gọn, trigger đơn mới/hủy không lặp, chuông đọc đúng chủ.",
);
// Tên khách dùng sequence ổn định, thứ tự mẫu lưu trên server.
const numbered1 = await chat.start({ chi_nhanh_id: branch }),
  numbered2 = await chat.start({ chi_nhanh_id: branch });
const numberedRows = (
  await db.query(
    "SELECT id,ma_khach_chat FROM public.cuoc_tro_chuyen WHERE id=ANY($1::uuid[])",
    [[numbered1.id, numbered2.id]],
  )
).rows;
const no1 = BigInt(
    numberedRows.find((r) => r.id === numbered1.id).ma_khach_chat,
  ),
  no2 = BigInt(numberedRows.find((r) => r.id === numbered2.id).ma_khach_chat);
assert.ok(no2 > no1);
assert.equal(
  (await chat.start({ chi_nhanh_id: branch }, undefined, numbered1.guest_token))
    .id,
  numbered1.id,
);
const adminList = await chat.list("admin");
assert.match(
  adminList.hoi_thoai.find((t) => t.id === numbered1.id).ten_hien_thi,
  /^Khách #\d{6,}$/,
);
await chat.send(
  numbered1.id,
  { noi_dung: "Khách đánh số", ma_phia_khach: randomUUID() },
  undefined,
  numbered1.guest_token,
);
assert.match(
  (await chat.messages(numbered1.id, "admin")).tin_nhan[0].ten_nguoi_gui,
  /^Khách #\d{6,}$/,
);
assert.equal(
  (await chat.messages(numbered1.id, undefined, numbered1.guest_token))
    .tin_nhan[0].ten_nguoi_gui,
  "Bạn",
);
const rankBody = {
  tieu_de: "Thứ tự A",
  nhom: "Test",
  noi_dung: "A",
  homestay_id: null,
  hien: true,
};
const rankA = await utils.saveTemplate(admin, undefined, rankBody),
  rankB = await utils.saveTemplate(admin, undefined, {
    ...rankBody,
    tieu_de: "Thứ tự B",
  });
await utils.reorder(admin, { ids: [rankB.id, rankA.id] });
const ranked = (await utils.templates(admin)).mau;
assert.ok(
  ranked.findIndex((m) => m.id === rankB.id) <
    ranked.findIndex((m) => m.id === rankA.id),
);
const oldOrder = ranked.find((m) => m.id === rankB.id).thu_tu;
await utils.saveTemplate(admin, rankB.id, { ...rankBody, tieu_de: "B đã sửa" });
assert.equal(
  (await utils.templates(admin)).mau.find((m) => m.id === rankB.id).thu_tu,
  oldOrder,
);
await assert.rejects(
  () => utils.reorder(uid, { ids: [rankA.id, rankB.id] }),
  /Forbidden/,
);
await assert.rejects(
  () => utils.reorder(admin, { ids: [rankA.id, rankA.id] }),
  /không hợp lệ/,
);
await assert.rejects(
  () => utils.reorder(admin, { ids: [randomUUID()] }),
  /đã thay đổi/,
);
await db.exec(
  fs.readFileSync(
    root + "/co-so-du-lieu/migrations/20261112-thu-tu-mau-ten-khach.sql",
    "utf8",
  ),
);
assert.equal(
  (await utils.templates(admin)).mau.find((m) => m.id === rankB.id).thu_tu,
  oldOrder,
);
console.log(
  "PASS Chat lần 2: tên khách có số tăng/giữ nguyên trong phiên, tên phía khách không lộ nhãn, thứ tự mẫu qua chỉnh sửa và migration lặp, quyền/ID trùng/ID không tồn tại.",
);
// Kiểm tra nghiệp vụ mới bằng PostgreSQL thật trong PGlite.
const { QuanTriService }=await import(root+'/may-chu/dist/quan-tri/quan-tri.service.js');
const authorization=new QuanTriService();authorization.ketNoi=connection;
assert.equal((await authorization.truyCap(admin)).quan_tri_he_thong,true);
await assert.rejects(()=>authorization.truyCap(uid),/chưa được cấp quyền/);
const {VaiTroService}=await import(root+'/may-chu/dist/quan-tri/vai-tro.service.js');
const rolesService=new VaiTroService(authorization);rolesService.db=connection;
await assert.rejects(()=>rolesService.save(uid,undefined,{ten:'Vai trò lạ',trang:['bao-cao']}),/quyền quản trị/);
await assert.rejects(()=>rolesService.save(admin,undefined,{ten:'Vai trò lạ',trang:['nhan-vien']}),/không hợp lệ/);
await rolesService.save(admin,undefined,{ten:'Kiểm thử báo cáo',trang:['bao-cao']});
const reportRole=(await db.query("SELECT id FROM public.vai_tro WHERE ma_vai_tro='Kiểm thử báo cáo'")).rows[0].id;
await db.query('INSERT INTO public.nguoi_dung_vai_tro(nguoi_dung_id,vai_tro_id,homestay_id) VALUES($1,$2,$3)',[other,reportRole,branch]);
assert.deepEqual((await authorization.truyCap(other)).trang,['bao-cao']);
await assert.rejects(()=>authorization.kiemTraTrang(other,'phong'),/không được cấp quyền/);
const {BaoCaoService}=await import(root+'/may-chu/dist/quan-tri/bao-cao.service.js');
const reports=new BaoCaoService(authorization);reports.db=connection;
for(const [i,created,amount,state] of [[0,'2026-12-01T16:59:00Z',100000,'Đã xác nhận'],[1,'2026-12-01T17:01:00Z',200000,'Đã xác nhận'],[2,'2026-12-01T17:02:00Z',300000,'Đã hủy'],[3,'2026-12-01T17:03:00Z',400000,'Chờ xác nhận']]) {
 await db.query(`INSERT INTO public.dat_phong(ma_dat_phong,ten_don,homestay_id,phong_id,hinh_thuc_dat,nhan_phong_luc,tra_phong_luc,so_khach,trang_thai,tien_phong,ngay_tao) VALUES($1,'Khách báo cáo',$2,$3,'Theo giờ',$4,$5,1,$6,$7,$8)`,['BAOCAO'+i,branch,room2,`2032-03-0${i+1}T08:00:00+07:00`,`2032-03-0${i+1}T10:00:00+07:00`,state,amount,created]);
}
const report=await reports.report(other,'2026-12-01','2026-12-03',branch);
assert.deepEqual(report.theo_ngay.map(x=>x.so_don),[1,3,0]);
assert.deepEqual(report.theo_ngay.map(x=>Number(x.doanh_thu)),[100000,200000,0]);
assert.equal(report.theo_ngay[1].so_huy,1);assert.equal(Number(report.da_thu),0);
assert.equal(report.theo_kieu[0].so_don,4);
await assert.rejects(()=>reports.report(uid,'2026-12-01','2026-12-03'),/chưa được cấp quyền/);
await assert.rejects(()=>reports.report(admin,'2026-12-03','2026-12-01'),/khoảng ngày/);
await assert.rejects(()=>reports.report(admin,'2026-01-01','2028-01-01'),/khoảng ngày/);
const {HienThiLichService}=await import(root+'/may-chu/dist/quan-tri/hien-thi-lich.service.js');
const appearance=new HienThiLichService(authorization);appearance.db=connection;
const display=await appearance.read(admin);
await appearance.save(admin,{mau:{'Khóa sửa chữa':'#b091da'},trang_thai:['Khóa sửa chữa'],phien_ban:display.phien_ban});
const anotherDisplay=new HienThiLichService(authorization);anotherDisplay.db=connection;
assert.equal((await anotherDisplay.read(admin)).mau['Khóa sửa chữa'],'#b091da');
await assert.rejects(()=>appearance.save(admin,{...display}),/vừa được người khác/);
await assert.rejects(()=>appearance.save(admin,{mau:{x:'url(evil)'},trang_thai:[],phien_ban:2}),/mã màu/);
await assert.rejects(()=>appearance.read(other),/không được cấp quyền/);
await rolesService.save(admin,reportRole,{ten:'Kiểm thử báo cáo',trang:[]});
await assert.rejects(()=>reports.report(other,'2026-12-01','2026-12-03'),/chưa được cấp quyền/);
const {DonLichService}=await import(root+'/may-chu/dist/quan-tri/don-lich.service.js');
const editing=new DonLichService(authorization);editing.db=connection;
const editId=(await db.query("SELECT id FROM public.dat_phong WHERE ma_dat_phong='BAOCAO0'")).rows[0].id;
await editing.edit(admin,editId,{ten_khach:'Khách sửa đơn',phong_id:room,hinh_thuc_dat:'Theo giờ',nhan_phong_luc:'2033-03-01T08:00:00+07:00',tra_phong_luc:'2033-03-01T10:00:00+07:00',so_khach:1,tien_phong:200000,so_dien_thoai:'0901234567',ghi_chu:'Đổi phòng và ngày',combo_id:null});
const editedDetail=await editing.detail(admin,editId);
assert.equal(editedDetail.phong_id,room);assert.equal(editedDetail.thay_doi.length,1);
assert.equal(editedDetail.thay_doi[0].du_lieu_cu.phong_id,room2);assert.equal(editedDetail.thay_doi[0].du_lieu_moi.phong_id,room);
assert.equal(editedDetail.thay_doi[0].du_lieu_cu.ten_phong,'Phòng thử');
const cmsNow=await cms.read(admin);
const configUi={ten_web:'Nơi nghỉ',khau_hieu:'Không gian riêng',tieu_de_phong:'Các phòng',mau_nen:'#39205f',mau_nhan:'#7135a3',so_cot:3,anh_ben_trai:true};
await cms.save(admin,{cau_hinh:{...cmsNow.ban_nhap,giao_dien:configUi},phien_ban:cmsNow.phien_ban,xuat_ban:true});
assert.deepEqual((await cms.read()).giao_dien,configUi);
await assert.rejects(()=>cms.save(admin,{cau_hinh:{...cmsNow.ban_nhap,giao_dien:{...configUi,mau_nhan:'url(javascript:evil)'}},phien_ban:cmsNow.phien_ban+1,xuat_ban:false}),/không hợp lệ/);
const {PhongService}=await import(root+'/may-chu/dist/quan-tri/phong.service.js');
const roomService=new PhongService(authorization);roomService.db=connection;roomService.storage=()=>({});
const roomSearch=await roomService.list(admin,'Cao cấp');assert.ok(roomSearch.du_lieu.some(r=>r.id===room));assert.ok(roomSearch.tong_so>=2);
const overview=await reports.overview(admin,'2026-12');
assert.equal(overview.theo_ngay.length,31);assert.equal(overview.tong_danh_gia,0);
await db.exec('SET ROLE authenticated');
await assert.rejects(()=>db.query("UPDATE public.cau_hinh_hien_thi_lich SET mau='{}' WHERE id=1"),/permission denied/);
await db.exec('RESET ROLE');
console.log('PASS Tổng quan/Báo cáo: múi giờ/ngày trống/loại đơn hủy; quyền trang tạo/gán/thu hồi, backend từ chối truy cập; thiết lập đồng bộ và chống ghi đè; lịch sử đổi phòng/ngày và RLS cấu hình.');

// Trạng thái phòng thời gian thực, tách màu thanh toán và thao tác đơn.
const {LichPhongService}=await import(root+'/may-chu/dist/quan-tri/lich-phong.service.js');
const operations=new LichPhongService(authorization);operations.db=connection;
const stateRoom=randomUUID();
await db.query("INSERT INTO public.phong(id,homestay_id,loai_phong_id,ma_phong,ten_phong,gia_moi_gio,so_gio_toi_thieu) VALUES($1,$2,$3,'TT-01','Phòng trạng thái',200000,2)",[stateRoom,branch,type]);
const stateBooking=(await db.query(`INSERT INTO public.dat_phong(ma_dat_phong,ten_don,homestay_id,phong_id,hinh_thuc_dat,nhan_phong_luc,tra_phong_luc,so_khach,trang_thai,tien_phong,so_dien_thoai_dat) VALUES('TT01','Khách trạng thái',$1,$2,'Theo giờ',now()-interval '1 hour',now()+interval '1 hour',1,'Đã xác nhận',200000,'0901234567') RETURNING id`,[branch,stateRoom])).rows[0].id;
assert.equal((await roomService.list(admin,'TT-01')).du_lieu[0].trang_thai_hien_thi,'Đang sử dụng');
await operations.updateBooking(admin,stateBooking,{hanh_dong:'nhan_phong'});
await assert.rejects(()=>operations.updateBooking(admin,stateBooking,{hanh_dong:'nhan_phong'}),/Trạng thái đã thay đổi/);
await operations.updateBooking(admin,stateBooking,{hanh_dong:'tra_phong'});
assert.equal((await roomService.list(admin,'TT-01')).du_lieu[0].trang_thai_hien_thi,'Đang dọn');
await roomService.setState(admin,stateRoom,{trang_thai:'Trống'});
assert.equal((await roomService.list(admin,'TT-01')).du_lieu[0].trang_thai_hien_thi,'Trống');
await roomService.setState(admin,stateRoom,{trang_thai:'Bảo trì'});
assert.equal((await roomService.list(admin,'TT-01')).du_lieu[0].trang_thai_hien_thi,'Bảo trì');
await roomService.setState(admin,stateRoom,{trang_thai:'Trống'});
await db.query("UPDATE public.dat_phong SET trang_thai='Đã xác nhận',nhan_phong_luc=now()+interval '1 day',tra_phong_luc=now()+interval '1 day 2 hours',da_nhan_phong_luc=NULL,da_tra_phong_luc=NULL WHERE id=$1",[stateBooking]);
assert.equal((await roomService.list(admin,'TT-01')).du_lieu[0].trang_thai_hien_thi,'Trống');
await operations.updateBooking(admin,stateBooking,{hanh_dong:'khong_nhan'});
assert.equal((await operations.bookingList(admin,'Chưa nhận phòng','TT01'))[0].trang_thai,'Không nhận phòng');
const correctionBody={ten_khach:'Khách trạng thái',phong_id:stateRoom,hinh_thuc_dat:'Theo giờ',nhan_phong_luc:(await db.query('SELECT nhan_phong_luc FROM public.dat_phong WHERE id=$1',[stateBooking])).rows[0].nhan_phong_luc.toISOString(),tra_phong_luc:(await db.query('SELECT tra_phong_luc FROM public.dat_phong WHERE id=$1',[stateBooking])).rows[0].tra_phong_luc.toISOString(),so_khach:1,tien_phong:200000,so_dien_thoai:'0901234567',ghi_chu:'',trang_thai_sua:'Đã xác nhận'};
await assert.rejects(()=>editing.edit(admin,stateBooking,correctionBody),/cần lý do/);
await editing.edit(admin,stateBooking,{...correctionBody,ly_do_sua_trang_thai:'Bấm nhầm không nhận phòng'});
assert.equal((await editing.detail(admin,stateBooking)).trang_thai,'Đã xác nhận');
const fullPaid=await operations.createBooking(admin,{ten_khach:'Khách thanh toán',phong_id:stateRoom,hinh_thuc_dat:'Theo giờ',nhan_phong_luc:'2035-01-01T08:00:00+07:00',tra_phong_luc:'2035-01-01T10:00:00+07:00',so_khach:1,tien_phong:200000,so_dien_thoai:'0901234567',trang_thai_thanh_toan:'Đủ',tien_da_thanh_toan:200000});
assert.equal(Number((await editing.detail(admin,fullPaid.id)).tien_da_thanh_toan),200000);
const display2=await appearance.read(admin);
await appearance.save(admin,{...display2,trang_thai_phong:[...display2.trang_thai_phong,'Sửa nội thất'],trang_thai_thanh_toan:[...display2.trang_thai_thanh_toan,'Chờ đối soát'],mau_phong:{'Sửa nội thất':'#112233'},mau_thanh_toan:{'Chờ đối soát':'#445566'}});
const separate=await appearance.read(admin);assert.equal(separate.mau_phong['Sửa nội thất'],'#112233');assert.equal(separate.mau_thanh_toan['Chờ đối soát'],'#445566');
const lock=await operations.block(admin,{phong_id:stateRoom,loai_khoa:'gio',bat_dau:'2035-01-02T08:00:00+07:00',ket_thuc:'2035-01-02T10:00:00+07:00',ly_do:'Sửa nội thất phòng',trang_thai_phong:'Sửa nội thất',trang_thai_thanh_toan:'Chờ đối soát'});
assert.equal(lock.trang_thai_phong,'Sửa nội thất');assert.equal(lock.trang_thai_thanh_toan,'Chờ đối soát');
await assert.rejects(()=>operations.block(admin,{phong_id:stateRoom,loai_khoa:'gio',bat_dau:'2035-01-03T08:00:00+07:00',ket_thuc:'2035-01-03T10:00:00+07:00',ly_do:'x',trang_thai_phong:'Trạng thái không tồn tại'}),/Thiết lập/);
// Ảnh theo đơn: kho riêng, giới hạn byte/MIME, IDOR và chống dùng ảnh đơn khác.
const {TepVaChatDonService}=await import(root+'/may-chu/dist/quan-tri/tep-va-chat-don.service.js');
const orderFiles=new TepVaChatDonService(authorization);orderFiles.db=connection;
const uploadedOrderFiles=[],removedOrderFiles=[];
orderFiles.storage=()=>({upload:async(key)=>{uploadedOrderFiles.push(key);return {error:null}},createSignedUrl:async(key)=>({data:{signedUrl:'https://private.test/'+key},error:null}),remove:async(keys)=>{removedOrderFiles.push(...keys);return {error:null}}});
const photoBytes=Buffer.from([137,80,78,71,13,10,26,10]);
const photo=await orderFiles.upload(admin,stateBooking,{buffer:photoBytes,size:photoBytes.length,mimetype:'image/png',originalname:'anh-phong.png'});
assert.equal((await orderFiles.images(admin,stateBooking)).length,1);
await assert.rejects(()=>orderFiles.images(uid,stateBooking),/chưa được cấp quyền/);
await assert.rejects(()=>orderFiles.remove(admin,editId,photo.id),/không thuộc đơn/);
await assert.rejects(()=>orderFiles.upload(admin,stateBooking,{buffer:Buffer.from('fake'),size:4,mimetype:'image/png',originalname:'fake.png'}),/tối đa|định dạng/);
await orderFiles.remove(admin,stateBooking,photo.id);assert.equal((await orderFiles.images(admin,stateBooking)).length,0);assert.equal(removedOrderFiles.length,1);
// Tạo hội thoại chờ cho đơn; chỉ số điện thoại đã xác minh mới được nhận.
await db.query("UPDATE auth.users SET phone='84901234567',phone_confirmed_at=now() WHERE id=$1",[uid]);
const pending=await orderFiles.conversation(admin,stateBooking);
assert.equal((await orderFiles.conversation(admin,stateBooking)).id,pending.id);
const unverifiedId=randomUUID();await db.query('INSERT INTO auth.users(id) VALUES($1)',[unverifiedId]);await db.query("INSERT INTO public.nguoi_dung(id,ho_ten) VALUES($1,'Chưa xác minh')",[unverifiedId]);users.unverifiedOrder={id:unverifiedId,phone:'+84901234567',phone_verified:false};
assert.equal((await chat.list('unverifiedOrder')).hoi_thoai.some(x=>x.id===pending.id),false);
assert.equal((await chat.list('a')).hoi_thoai.some(x=>x.id===pending.id),true);
assert.equal((await orderFiles.conversation(admin,stateBooking)).id,pending.id);
await editing.edit(admin,stateBooking,{...correctionBody,so_dien_thoai:'0901234599',trang_thai_sua:'Đã xác nhận'});
const rotated=await orderFiles.conversation(admin,stateBooking);assert.notEqual(rotated.id,pending.id);
await assert.rejects(()=>chat.messages(rotated.id,'a'),/quyền xem/);
assert.ok((await db.query('SELECT id FROM public.cuoc_tro_chuyen WHERE id=$1',[pending.id])).rows.length);
console.log('PASS Trạng thái/phòng: sử dụng theo giờ, sau trả vệ sinh, đánh dấu sạch/bảo trì, đơn tương lai, no-show và sửa có lý do; thanh toán đã tạo mới; hai danh mục màu; ảnh riêng theo đơn/IDOR; hội thoại idempotent/OTP và không chuyển lịch sử cũ khi đổi số.');

await db.close();

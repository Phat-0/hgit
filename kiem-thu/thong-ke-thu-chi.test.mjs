import assert from "node:assert/strict";
import { build } from "../trang-web/node_modules/esbuild/lib/main.js";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { pathToFileURL, fileURLToPath } from "node:url";
const temp = await mkdtemp(tmpdir() + "/homestay-thongke-");
try {
  await build({
    entryPoints: [
      fileURLToPath(new URL("../trang-web/src/thong-ke-thu-chi.ts", import.meta.url)),
    ],
    outfile: temp + "/engine.mjs",
    bundle: true,
    format: "esm",
    platform: "node",
  });
  const { tinhGiaTri, nhomNgay } = await import(
    pathToFileURL(temp + "/engine.mjs")
  );
  const p = { id: "tong", loai: "tong", ten: "Tổng" },
    branch = { id: "b1", loai: "chi_nhanh", ten: "A" };
  const data = {
    dong: [
      {
        ngay: "2026-11-01",
        homestay_id: "b1",
        phong_id: "p1",
        thu: 100,
        chi: 0,
      },
      {
        ngay: "2026-11-02",
        homestay_id: "b1",
        phong_id: "p1",
        thu: 0,
        chi: 40,
      },
      {
        ngay: "2026-11-03",
        homestay_id: "b2",
        phong_id: "p2",
        thu: 60,
        chi: 0,
      },
      {
        ngay: "2026-12-01",
        homestay_id: "b1",
        phong_id: "p1",
        thu: 25,
        chi: 0,
      },
    ],
    don: [
      {
        ngay: "2026-11-02",
        homestay_id: "b1",
        phong_id: "p1",
        hinh_thuc_dat: "Theo giờ",
        gio: 9,
        dat: 2,
        huy: 1,
        gia: 300,
        gio_o: 6,
      },
    ],
    tien_ton: [
      { thang: "2026-11-01", so_tien: 1000 },
      { thang: "2026-12-01", so_tien: 2000 },
    ],
    truoc_thang: [{ homestay_id: "b1", phong_id: "p1", so_tien: 10 }],
  };
  const c = {
    id: "c",
    chiSo: "thu",
    cachTinh: "tong",
    chia: "chung",
    lichRieng: false,
    tu: "2026-11-01",
    den: "2026-11-07",
    thu: [0, 1, 2, 3, 4, 5, 6],
    loaiDat: [],
    gio: [],
  };
  const days = nhomNgay(c, c.tu, c.den)[0].ngay;
  assert.equal(tinhGiaTri(data, p, c, days), 160);
  assert.equal(
    tinhGiaTri(data, p, { ...c, cachTinh: "tb_ngay" }, days),
    160 / 7,
  ); // Include zero days.
  assert.equal(tinhGiaTri(data, p, { ...c, cachTinh: "tb_tuan" }, days), 80); // Two Monday-based weeks, including partial.
  const mondays = nhomNgay(
    { ...c, thu: [0], chia: "thu" },
    "2026-11-01",
    "2026-11-30",
  );
  assert.equal(mondays.length, 1);
  assert.equal(mondays[0].ngay.length, 5);
  assert.equal(
    tinhGiaTri(data, p, { ...c, chiSo: "chi" }, mondays[0].ngay),
    40,
  );
  assert.equal(
    tinhGiaTri(data, p, { ...c, chiSo: "gia_don", cachTinh: "tb_don" }, days),
    150,
  );
  assert.equal(
    tinhGiaTri(data, p, { ...c, chiSo: "thoi_gian", cachTinh: "tb_don" }, days),
    3,
  );
  assert.equal(tinhGiaTri(data, p, { ...c, chiSo: "huy" }, days), 1);
  assert.equal(
    tinhGiaTri(
      data,
      p,
      { ...c, chiSo: "loai_dat", loaiDat: ["Theo ngày"] },
      days,
    ),
    0,
  );
  assert.equal(
    tinhGiaTri(data, p, { ...c, chiSo: "khung_gio", gio: [9] }, days),
    2,
  );
  assert.equal(
    tinhGiaTri(data, p, { ...c, chiSo: "khung_gio", gio: [10] }, days),
    0,
  );
  assert.equal(
    tinhGiaTri(data, p, { ...c, chiSo: "gia_don", cachTinh: "tb_don" }, [
      "2026-11-07",
    ]),
    null,
  );
  assert.equal(
    tinhGiaTri(data, p, { ...c, chiSo: "so_du" }, ["2026-11-02"]),
    1060,
  ); // Includes transactions before selected weekday.
  assert.equal(
    tinhGiaTri(data, branch, { ...c, chiSo: "so_du" }, ["2026-11-02"]),
    70,
  ); // Scope's historical cash flow, no shared opening.
  assert.equal(
    tinhGiaTri(data, p, { ...c, chiSo: "so_du" }, ["2026-12-01"]),
    2025,
  ); // Month opening resets correctly.
  assert.equal(
    nhomNgay(
      {
        ...c,
        chia: "ngay",
        lichRieng: true,
        tu: "2028-02-28",
        den: "2028-03-01",
      },
      c.tu,
      c.den,
    ).length,
    3,
  );
  assert.equal(nhomNgay({ ...c, thu: [] }, c.tu, c.den).length, 0);
  assert.deepEqual(
    nhomNgay({ ...c, chia: "tuan" }, "2026-11-01", "2026-11-09").map(
      (x) => x.ngay.length,
    ),
    [1, 7, 1],
  );
  console.log(
    "PASS: tổng/TB ngày/TB tuần/TB đơn, nhiều thứ, lịch riêng, tuần lẻ, năm nhuận, số dư theo tháng/phạm vi, loại đặt/khung giờ, mẫu số 0.",
  );
} finally {
  await rm(temp, { recursive: true, force: true });
}

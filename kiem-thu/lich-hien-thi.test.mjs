import assert from 'node:assert/strict';
import {chuKhoangNgay} from '../trang-web/src/lich-hien-thi.ts';
assert.equal(chuKhoangNgay({tu:'2026-11-01',den:'2026-11-05'},2026),'01–05/11');
assert.equal(chuKhoangNgay({tu:'2025-11-01',den:'2025-11-05'},2026),'01–05/11/2025');
assert.equal(chuKhoangNgay({tu:'2026-11-28',den:'2026-12-02'},2026),'28/11–02/12');
assert.equal(chuKhoangNgay({tu:'2025-12-28',den:'2026-01-02'},2026),'28/12/2025–02/01/2026');
assert.equal(chuKhoangNgay({tu:'2026-11-05',den:'2026-11-05'},2026),'05/11');
console.log('PASS định dạng khoảng ngày: cùng tháng, khác tháng, khác năm, năm hiện tại và một ngày');

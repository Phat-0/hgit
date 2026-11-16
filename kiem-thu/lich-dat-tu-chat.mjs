import assert from 'node:assert/strict';
import { lichTuTinNhan } from '../trang-web/src/dat-phong-tu-tin-nhan.ts';
const now = new Date('2026-11-16T12:00:00+07:00');
assert.deepEqual(lichTuTinNhan('Nhận 20/11 trả 22/11, 2 người', now), {
  start: '2026-11-20', end: '2026-11-22', kind: 'ngay', guests: 2,
});
for (const text of ['20/11', '31/11 - 02/12', '20/11 - 19/11', '01/11 - 03/11', '20/11 - 22/11 theo giờ 08:00']) {
  assert.equal(lichTuTinNhan(text, now), null, text);
}
assert.equal(lichTuTinNhan('qua đêm 20/11/2026 - 21/11/2026', now)?.kind, 'dem');
console.log('PASS lịch từ chat: khoảng đủ, ngày sai/quá khứ/đảo, số khách, qua đêm, tránh đoán đặt giờ.');

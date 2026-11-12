import { describe, it, expect } from 'vitest';
import { docTepChat, type ChatFile } from './chat-tep.js';
const file = (
  buffer: Buffer,
  mimetype: string,
  originalname: string,
): ChatFile => ({ buffer, size: buffer.length, mimetype, originalname });
describe('Tệp chat riêng tư', () => {
  it('không nhận HTML giả ảnh hoặc SVG', () => {
    expect(() =>
      docTepChat(
        file(Buffer.from('<svg onload="alert(1)">'), 'image/png', 'a.png'),
      ),
    ).toThrow();
    expect(() =>
      docTepChat(file(Buffer.from('<svg/>'), 'image/svg+xml', 'a.svg')),
    ).toThrow();
  });
  it('không nhận tệp thực thi', () => {
    expect(() =>
      docTepChat(
        file(Buffer.from('MZ.exe'), 'application/octet-stream', 'a.exe'),
      ),
    ).toThrow();
  });
  it('giới hạn kích thước trước khi upload', () => {
    const b = Buffer.alloc(20971521);
    expect(() => docTepChat(file(b, 'application/pdf', 'a.pdf'))).toThrow();
  });
  it('không tin kích thước giả', () => {
    expect(() =>
      docTepChat({
        ...file(Buffer.from('%PDF-local'), 'application/pdf', 'a.pdf'),
        size: 1,
      }),
    ).toThrow();
  });
  it('chặn đường dẫn trong tên tải xuống', () => {
    expect(
      docTepChat(
        file(Buffer.from('%PDF-local'), 'application/pdf', '../../a.pdf'),
      ).name,
    ).not.toMatch(/[\\/]/);
  });
  it('văn bản phải là UTF8 không chứa NUL', () => {
    expect(() =>
      docTepChat(file(Buffer.from([255, 254]), 'text/plain', 'a.txt')),
    ).toThrow();
    expect(() =>
      docTepChat(file(Buffer.from([65, 0]), 'text/plain', 'a.txt')),
    ).toThrow();
  });
  it('nhận PDF và văn bản đúng kiểu', () => {
    expect(
      docTepChat(file(Buffer.from('%PDF-local'), 'application/pdf', 'a.pdf'))
        .ext,
    ).toBe('pdf');
    expect(
      docTepChat(file(Buffer.from('Xin chào'), 'text/plain', 'a.txt')).ext,
    ).toBe('txt');
  });
});

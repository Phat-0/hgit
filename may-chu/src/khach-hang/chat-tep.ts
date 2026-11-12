import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
export type ChatFile = {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname: string;
};
export type StoredFile = {
  id: string;
  tin_nhan_id: string;
  cuoc_tro_chuyen_id: string;
  duong_dan: string;
  ten_tep: string;
  mime: string;
  dung_luong: number;
  la_anh: boolean;
  ngay_tao: string;
};
export interface ChatStorage {
  upload(
    path: string,
    data: Buffer,
    options: { contentType: string; upsert: boolean },
  ): Promise<{ error: unknown }>;
  createSignedUrl(
    path: string,
    expires: number,
    options?: { download?: string },
  ): Promise<{ data: { signedUrl: string } | null; error: unknown }>;
  remove(paths: string[]): Promise<{ error: unknown }>;
}
export function chatStorage(): ChatStorage {
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new ServiceUnavailableException(
      'Chưa cấu hình kho tệp chat trên máy chủ',
    );
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage.from('tep-chat');
}
export function docTepChat(f?: ChatFile) {
  if (!f || !f.size || f.size !== f.buffer.length || f.size > 20971520)
    throw new BadRequestException('Tệp tối đa 20 MB');
  const name = f.originalname
      .normalize('NFC')
      .split('')
      .map((ch) =>
        ch === '/' ||
        ch === '\\' ||
        ch.charCodeAt(0) < 32 ||
        ch.charCodeAt(0) === 127
          ? '_'
          : ch,
      )
      .join('')
      .slice(0, 180),
    b = f.buffer;
  let ext = '',
    image = false;
  if (
    f.mimetype === 'image/jpeg' &&
    b[0] === 255 &&
    b[1] === 216 &&
    b[2] === 255
  ) {
    ext = 'jpg';
    image = true;
  } else if (
    f.mimetype === 'image/png' &&
    b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    ext = 'png';
    image = true;
  } else if (
    f.mimetype === 'image/webp' &&
    b.subarray(0, 4).toString() === 'RIFF' &&
    b.subarray(8, 12).toString() === 'WEBP'
  ) {
    ext = 'webp';
    image = true;
  } else if (
    f.mimetype === 'application/pdf' &&
    b.subarray(0, 5).toString() === '%PDF-'
  )
    ext = 'pdf';
  else if (['text/plain', 'text/csv'].includes(f.mimetype) && !b.includes(0)) {
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(b);
    } catch {
      throw new BadRequestException('Tệp văn bản cần UTF-8');
    }
    ext = f.mimetype === 'text/csv' ? 'csv' : 'txt';
  } else if (b[0] === 80 && b[1] === 75 && b[2] === 3 && b[3] === 4) {
    if (
      f.mimetype ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' &&
      /\.docx$/i.test(name)
    )
      ext = 'docx';
    if (
      f.mimetype ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' &&
      /\.xlsx$/i.test(name)
    )
      ext = 'xlsx';
  }
  if (!ext || !name || (image && f.size > 10485760))
    throw new BadRequestException(
      'Chỉ nhận JPG/PNG/WebP tối đa 10 MB; PDF/TXT/CSV/DOCX/XLSX tối đa 20 MB',
    );
  const suffix=ext==='jpg'?/\.(jpe?g)$/i:new RegExp('\\.'+ext+'$','i');
  if(!suffix.test(name))throw new BadRequestException('Phần mở rộng của tên tệp không khớp định dạng');
  return { name, ext, image, mime: f.mimetype };
}

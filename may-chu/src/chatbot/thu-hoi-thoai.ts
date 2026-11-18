import { BadRequestException } from '@nestjs/common';
import { cleanText, type Content } from './gemini.js';
export function previewHistory(value: unknown): Content[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 10 || value.length % 2 !== 0)
    throw new BadRequestException('Lịch sử thử không hợp lệ');
  let size = 0;
  return value.map((item: unknown, index): Content => {
    if (!item || typeof item !== 'object' || Array.isArray(item))
      throw new BadRequestException('Tin nhắn thử không hợp lệ');
    const m = item as Record<string, unknown>,
      role = index % 2 === 0 ? 'user' : 'model';
    if (
      m.role !== role ||
      typeof m.text !== 'string' ||
      !m.text.trim() ||
      m.text.length > 4000
    )
      throw new BadRequestException('Tin nhắn thử không hợp lệ');
    size += m.text.length;
    if (size > 20000) throw new BadRequestException('Lịch sử thử quá dài');
    return { role, parts: [{ text: cleanText(m.text.trim()) }] };
  });
}

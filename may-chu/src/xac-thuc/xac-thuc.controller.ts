import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { SupabaseAuthGuard } from './supabase-auth.guard.js';
import { XacThucService } from './xac-thuc.service.js';

function kiemTraDuLieu(body: unknown): { email: string; matKhau: string } {
  if (!body || typeof body !== 'object') throw new BadRequestException('Dữ liệu không hợp lệ');
  const input = body as Record<string, unknown>;
  if (typeof input.email !== 'string' || typeof input.matKhau !== 'string') {
    throw new BadRequestException('Email và mật khẩu phải là chuỗi');
  }
  const email = input.email.trim();
  const matKhau = input.matKhau;
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BadRequestException('Email không hợp lệ');
  }
  if (matKhau.length < 8 || matKhau.length > 128) {
    throw new BadRequestException('Mật khẩu phải có từ 8 đến 128 ký tự');
  }
  return { email, matKhau };
}

@Controller('xac-thuc')
export class XacThucController {
  constructor(private readonly xacThucService: XacThucService) {}

  @Post('dang-ky')
  dangKy(@Body() body: unknown) {
    const { email, matKhau } = kiemTraDuLieu(body);
    return this.xacThucService.dangKy(email, matKhau);
  }

  @Post('dang-nhap')
  dangNhap(@Body() body: unknown) {
    const { email, matKhau } = kiemTraDuLieu(body);
    return this.xacThucService.dangNhap(email, matKhau);
  }

  @UseGuards(SupabaseAuthGuard)
  @Get('toi')
  thongTin(@Req() request: Request & { nguoiDung?: { id: string; email?: string } }) {
    return { nguoi_dung: request.nguoiDung };
  }
}

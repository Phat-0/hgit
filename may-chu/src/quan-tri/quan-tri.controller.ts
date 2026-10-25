import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { SupabaseAuthGuard } from '../xac-thuc/supabase-auth.guard.js';
import { QuanTriService } from './quan-tri.service.js';

type RequestNguoiDung = Request & { nguoiDung: { id: string; email?: string } };

@Controller('quan-tri')
@UseGuards(SupabaseAuthGuard)
export class QuanTriController {
  constructor(private readonly service: QuanTriService) {}

  @Get('toi')
  toi(@Req() req: RequestNguoiDung) {
    return this.service.kiemTraQuanTri(req.nguoiDung.id);
  }

  @Get('tong-quan')
  tongQuan(@Req() req: RequestNguoiDung) {
    return this.service.tongQuan(req.nguoiDung.id);
  }
}

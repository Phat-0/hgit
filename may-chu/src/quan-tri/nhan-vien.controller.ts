import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { SupabaseAuthGuard } from '../xac-thuc/supabase-auth.guard.js';
import { NhanVienService } from './nhan-vien.service.js';

type AuthRequest = Request & { nguoiDung: { id: string } };
@Controller('quan-tri/nhan-vien')
@UseGuards(SupabaseAuthGuard)
export class NhanVienController {
  constructor(private readonly service: NhanVienService) {}
  @Get()
  list(@Req() req: AuthRequest) {
    return this.service.list(req.nguoiDung.id);
  }
  @Get(':id')
  detail(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.service.detail(req.nguoiDung.id, id);
  }
  @Post()
  create(@Req() req: AuthRequest, @Body() body: unknown) {
    return this.service.save(req.nguoiDung.id, undefined, body);
  }
  @Put(':id')
  update(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.service.save(req.nguoiDung.id, id, body);
  }
  @Delete(':id')
  remove(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.service.remove(req.nguoiDung.id, id);
  }
}

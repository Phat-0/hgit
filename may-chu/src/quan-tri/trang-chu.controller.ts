import { GioiHanTruyCapService } from '../xac-thuc/gioi-han.service.js';
import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { SupabaseAuthGuard } from '../xac-thuc/supabase-auth.guard.js';
import { TrangChuService } from './trang-chu.service.js';
type AuthRequest = Request & { nguoiDung: { id: string } };
@Controller('quan-tri/trang-chu')
@UseGuards(SupabaseAuthGuard)
export class TrangChuController {
  constructor(private readonly service: TrangChuService) {}
  @Get() read(@Req() r: AuthRequest) {
    return this.service.read(r.nguoiDung.id);
  }
  @Put() save(@Req() r: AuthRequest, @Body() b: unknown) {
    return this.service.save(r.nguoiDung.id, b);
  }
  @Post('anh')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5242880, files: 1, fields: 0 },
    }),
  )
  upload(
    @Req() r: AuthRequest,
    @UploadedFile() f?: { buffer: Buffer; size: number; mimetype: string },
  ) {
    return this.service.upload(r.nguoiDung.id, f);
  }
}
@Controller('khach/trang-chu')
export class TrangChuKhachController {
  constructor(
    private readonly service: TrangChuService,
    private readonly limiter: GioiHanTruyCapService,
  ) {}
  @Get() async read(@Req() r: Request) {
    await this.limiter.limit(r.ip || 'unknown', 'trang-chu', 120);
    return this.service.read();
  }
}

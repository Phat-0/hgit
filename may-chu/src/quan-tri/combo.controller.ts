import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
import { ComboService } from './combo.service.js';
type AuthRequest = Request & { nguoiDung: { id: string } };
type ImageFile = {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname: string;
};
const upload = () =>
  FileInterceptor('file', {
    limits: { fileSize: 5242880, files: 1, fields: 1, fieldSize: 200000 },
  });
function payload(value: unknown): unknown {
  if (typeof value !== 'string')
    throw new BadRequestException('Thiếu dữ liệu combo');
  try {
    return JSON.parse(value);
  } catch {
    throw new BadRequestException('Dữ liệu combo không hợp lệ');
  }
}
@Controller('quan-tri/combo')
@UseGuards(SupabaseAuthGuard)
export class ComboController {
  constructor(private readonly service: ComboService) {}
  @Get() list(@Req() req: AuthRequest) {
    return this.service.list(req.nguoiDung.id);
  }
  @Post() @UseInterceptors(upload()) create(
    @Req() req: AuthRequest,
    @Body('du_lieu') value: unknown,
    @UploadedFile() file?: ImageFile,
  ) {
    return this.service.save(req.nguoiDung.id, null, payload(value), file);
  }
  @Put(':id') @UseInterceptors(upload()) update(
    @Req() req: AuthRequest,
    @Param('id') id: string,
    @Body('du_lieu') value: unknown,
    @UploadedFile() file?: ImageFile,
  ) {
    return this.service.save(req.nguoiDung.id, id, payload(value), file);
  }
  @Delete(':id') remove(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.service.remove(req.nguoiDung.id, id);
  }
}

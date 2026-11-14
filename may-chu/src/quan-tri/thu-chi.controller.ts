import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { SupabaseAuthGuard } from '../xac-thuc/supabase-auth.guard.js';
import { ThuChiService } from './thu-chi.service.js';
import type { ChatFile } from '../khach-hang/chat-tep.js';
type Auth = Request & { nguoiDung: { id: string } };
@Controller('quan-tri/thu-chi')
@UseGuards(SupabaseAuthGuard)
export class ThuChiController {
  constructor(private readonly service: ThuChiService) {}
  @Get() list(
    @Req() r: Auth,
    @Query('tu_ngay') a: string,
    @Query('den_ngay') b: string,
  ) {
    return this.service.list(r.nguoiDung.id, a, b);
  }
  @Post() create(@Req() r: Auth, @Body() b: unknown) {
    return this.service.save(r.nguoiDung.id, undefined, b);
  }
  @Get('bieu-do') chartSettings(@Req() r: Auth) {
    return this.service.chartSettings(r.nguoiDung.id);
  }
  @Put('bieu-do') saveChartSettings(
    @Req() r: Auth,
    @Body() b: Record<string, unknown>,
  ) {
    return this.service.saveChartSettings(r.nguoiDung.id, b);
  }
  @Put('tien-ton') opening(@Req() r: Auth, @Body() b: Record<string, unknown>) {
    return this.service.opening(r.nguoiDung.id, b);
  }
  @Put(':id') save(
    @Req() r: Auth,
    @Param('id') id: string,
    @Body() b: unknown,
  ) {
    return this.service.save(r.nguoiDung.id, id, b);
  }
  @Delete(':id') remove(
    @Req() r: Auth,
    @Param('id') id: string,
    @Query('phien_ban') v: string,
  ) {
    return this.service.remove(r.nguoiDung.id, id, Number(v));
  }
  @Get(':id/chung-tu') files(@Req() r: Auth, @Param('id') id: string) {
    return this.service.files(r.nguoiDung.id, id);
  }
  @Post(':id/chung-tu')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 20971520, files: 1 } }),
  )
  upload(
    @Req() r: Auth,
    @Param('id') id: string,
    @UploadedFile() file: ChatFile,
  ) {
    return this.service.upload(r.nguoiDung.id, id, file);
  }
  @Delete(':id/chung-tu/:file') removeFile(
    @Req() r: Auth,
    @Param('id') id: string,
    @Param('file') file: string,
  ) {
    return this.service.removeFile(r.nguoiDung.id, id, file);
  }
}

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
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { SupabaseAuthGuard } from '../xac-thuc/supabase-auth.guard.js';
import { TienIchChatService } from './tien-ich-chat.service.js';
type R = Request & { nguoiDung: { id: string } };
@Controller('quan-tri')
@UseGuards(SupabaseAuthGuard)
export class TienIchChatController {
  constructor(private readonly service: TienIchChatService) {}
  @Get('cau-tra-loi-mau') templates(@Req() r: R) {
    return this.service.templates(r.nguoiDung.id);
  }
  @Post('cau-tra-loi-mau') create(@Req() r: R, @Body() b: unknown) {
    return this.service.saveTemplate(r.nguoiDung.id, undefined, b);
  }
  @Put('cau-tra-loi-mau/thu-tu') reorder(@Req() r: R, @Body() b: unknown) {
    return this.service.reorder(r.nguoiDung.id, b);
  }
  @Put('cau-tra-loi-mau/:id') update(
    @Req() r: R,
    @Param('id') id: string,
    @Body() b: unknown,
  ) {
    return this.service.saveTemplate(r.nguoiDung.id, id, b);
  }
  @Delete('cau-tra-loi-mau/:id') remove(@Req() r: R, @Param('id') id: string) {
    return this.service.deleteTemplate(r.nguoiDung.id, id);
  }
  @Get('thong-bao-don') notifications(
    @Req() r: R,
    @Query('loai') filter = '',
    @Query('bo_qua') off = '0',
  ) {
    return this.service.notifications(r.nguoiDung.id, filter, Number(off));
  }
  @Post('thong-bao-don/da-doc') all(@Req() r: R) {
    return this.service.readNotification(r.nguoiDung.id);
  }
  @Post('thong-bao-don/:id/da-doc') read(@Req() r: R, @Param('id') id: string) {
    return this.service.readNotification(r.nguoiDung.id, id);
  }
}

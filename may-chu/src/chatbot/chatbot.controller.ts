import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { SupabaseAuthGuard } from '../xac-thuc/supabase-auth.guard.js';
import { GioiHanTruyCapService } from '../xac-thuc/gioi-han.service.js';
import { ChatbotService } from './chatbot.service.js';
type AuthRequest = Request & { nguoiDung: { id: string } };
@Controller('quan-tri/chatbot')
@UseGuards(SupabaseAuthGuard)
export class ChatbotController {
  constructor(
    private readonly bot: ChatbotService,
    private readonly limiter: GioiHanTruyCapService,
  ) {}
  @Get() read(@Req() r: AuthRequest) {
    return this.bot.read(r.nguoiDung.id);
  }
  @Put() save(@Req() r: AuthRequest, @Body() b: Record<string, unknown>) {
    return this.bot.save(r.nguoiDung.id, b);
  }
  @Post('kien-thuc') knowledge(
    @Req() r: AuthRequest,
    @Body() b: Record<string, unknown>,
  ) {
    return this.bot.knowledge(r.nguoiDung.id, b);
  }
  @Put('hoi-thoai/:id') mode(
    @Req() r: AuthRequest,
    @Param('id') id: string,
    @Body() b: Record<string, unknown>,
  ) {
    return this.bot.mode(r.nguoiDung.id, id, b.che_do);
  }
  @Post('thu') async preview(
    @Req() r: AuthRequest,
    @Body() b: Record<string, unknown>,
  ) {
    await this.limiter.limit(r.nguoiDung.id, 'chatbot-thu', 6);
    return this.bot.preview(r.nguoiDung.id, b);
  }
}

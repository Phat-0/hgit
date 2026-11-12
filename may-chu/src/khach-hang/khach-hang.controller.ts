import { KhachExceptionFilter } from './khach-exception.filter.js';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseFilters,
} from '@nestjs/common';
import type { Request } from 'express';
import { TrangKhachService } from './trang-khach.service.js';
import { KetNoiKhachService } from './ket-noi.service.js';
import { ChatService } from './chat.service.js';
import { XacThucService } from '../xac-thuc/xac-thuc.service.js';
import { chuanHoaSoDienThoai } from './tien-phong.js';
@Controller('khach')
@UseFilters(KhachExceptionFilter)
export class KhachHangController {
  constructor(
    private readonly rooms: TrangKhachService,
    private readonly chat: ChatService,
    private readonly conn: KetNoiKhachService,
    private readonly auth: XacThucService,
  ) {}
  @Get('cau-hinh') async options(@Req() r: Request) {
    await this.conn.limit(r.ip || 'unknown', 'options', 120);
    return this.rooms.options();
  }
  @Get('phong') async search(
    @Req() r: Request,
    @Query() q: Record<string, unknown>,
  ) {
    await this.conn.limit(r.ip || 'unknown', 'search', 60);
    return this.rooms.rooms(q);
  }
  @Post('bao-gia') async quote(
    @Req() r: Request,
    @Body() x: Record<string, unknown>,
  ) {
    await this.conn.limit(r.ip || 'unknown', 'quote', 60);
    return this.rooms.quote(x || {});
  }
  @Post('combo') async combos(
    @Req() r: Request,
    @Body() x: Record<string, unknown>,
  ) {
    await this.conn.limit(r.ip || 'unknown', 'combo', 60);
    return this.rooms.combos(x || {});
  }
  @Post('dat-phong') async create(
    @Req() r: Request,
    @Body() x: Record<string, unknown>,
  ) {
    await this.conn.limit(r.ip || 'unknown', 'book', 3, 600);
    return this.rooms.create(x || {}, r.headers.authorization);
  }
  @Get('don-cua-toi') async history(@Req() r: Request) {
    await this.conn.limit(r.ip || 'unknown', 'history', 60);
    return this.rooms.history(r.headers.authorization);
  }
  @Post('gui-otp') async otp(
    @Req() r: Request,
    @Body() x: { so_dien_thoai?: unknown },
  ) {
    await this.conn.limit(r.ip || 'unknown', 'otp', 5, 600);
    return this.auth.guiOtpDienThoai(chuanHoaSoDienThoai(x?.so_dien_thoai));
  }
  @Post('xac-minh-otp') async verify(
    @Req() r: Request,
    @Body() x: { so_dien_thoai?: unknown; otp?: unknown },
  ) {
    await this.conn.limit(r.ip || 'unknown', 'verify', 10, 600);
    const otp = typeof x?.otp === 'string' ? x.otp : '';
    if (!/^\d{4,8}$/.test(otp))
      throw new BadRequestException('Mã OTP không hợp lệ');
    return this.auth.xacMinhOtpDienThoai(
      chuanHoaSoDienThoai(x.so_dien_thoai),
      otp,
    );
  }
  @Post('chat') async start(
    @Req() r: Request,
    @Body() x: Record<string, unknown>,
  ) {
    await this.conn.limit(r.ip || 'unknown', 'chatstart', 10, 600);
    return this.chat.start(
      x || {},
      r.headers.authorization,
      r.headers['x-guest-chat'] as string,
    );
  }
  @Get('chat/nguoi-dung') async people(
    @Req() r: Request,
    @Query('tim') q = '',
  ) {
    await this.conn.limit(r.ip || 'unknown', 'chatpeople', 20);
    return this.chat.people(q, r.headers.authorization);
  }
  @Post('chat/:id/da-doc') async read(
    @Req() r: Request,
    @Param('id') id: string,
    @Body() body: { tin_nhan_id?: string },
  ) {
    await this.conn.limit(r.ip || 'unknown', 'chatseen', 100);
    return this.chat.read(
      id,
      String(body?.tin_nhan_id || ''),
      r.headers.authorization,
      r.headers['x-guest-chat'] as string,
    );
  }
  @Get('chat') async list(
    @Req() r: Request,
    @Query('tim') q = '',
    @Query('bo_qua') offset = '0',
  ) {
    await this.conn.limit(r.ip || 'unknown', 'chatlist', 60);
    return this.chat.list(
      r.headers.authorization,
      r.headers['x-guest-chat'] as string,
      q,
      Number(offset),
    );
  }
  @Get('chat/:id/tin-nhan') async messages(
    @Req() r: Request,
    @Param('id') id: string,
    @Query('truoc') before?: string,
  ) {
    await this.conn.limit(r.ip || 'unknown', 'chatread', 100);
    return this.chat.messages(
      id,
      r.headers.authorization,
      r.headers['x-guest-chat'] as string,
      before,
    );
  }
  @Post('chat/:id/tin-nhan') async send(
    @Req() r: Request,
    @Param('id') id: string,
    @Body() x: Record<string, unknown>,
  ) {
    await this.conn.limit(r.ip || 'unknown', 'chatsend', 30);
    return this.chat.send(
      id,
      x || {},
      r.headers.authorization,
      r.headers['x-guest-chat'] as string,
    );
  }
}

import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { SupabaseAuthGuard } from '../xac-thuc/supabase-auth.guard.js';
import { VaiTroService } from './vai-tro.service.js';
type Auth = Request & { nguoiDung: { id: string } };
@Controller('quan-tri/vai-tro')
@UseGuards(SupabaseAuthGuard)
export class VaiTroController {
  constructor(private readonly service: VaiTroService) {}
  @Get() list(@Req() r: Auth) {
    return this.service.list(r.nguoiDung.id);
  }
  @Post() create(@Req() r: Auth, @Body() b: unknown) {
    return this.service.save(r.nguoiDung.id, undefined, b);
  }
  @Put(':id') edit(
    @Req() r: Auth,
    @Param('id') id: string,
    @Body() b: unknown,
  ) {
    return this.service.save(r.nguoiDung.id, id, b);
  }
}

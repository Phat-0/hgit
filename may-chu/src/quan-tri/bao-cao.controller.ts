import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { SupabaseAuthGuard } from '../xac-thuc/supabase-auth.guard.js';
import { BaoCaoService } from './bao-cao.service.js';
type Auth = Request & { nguoiDung: { id: string } };
@Controller('quan-tri')
@UseGuards(SupabaseAuthGuard)
export class BaoCaoController {
  constructor(private readonly service: BaoCaoService) {}
  @Get('bao-cao') report(
    @Req() r: Auth,
    @Query('tu_ngay') a: string,
    @Query('den_ngay') b: string,
    @Query('homestay_id') branch: string,
  ) {
    return this.service.report(r.nguoiDung.id, a, b, branch || '');
  }
  @Get('danh-gia') reviews(
    @Req() r: Auth,
    @Query('tim_kiem') q: string,
    @Query('so_sao') stars: string,
    @Query('tu_ngay') a: string,
    @Query('den_ngay') b: string,
  ) {
    return this.service.reviews(
      r.nguoiDung.id,
      q || '',
      stars || '',
      a || '',
      b || '',
    );
  }
  @Get('tong-quan-moi') overview(
    @Req() r: Auth,
    @Query('thang') month: string,
  ) {
    return this.service.overview(r.nguoiDung.id, month || '');
  }
}

import {TomTatKhachService} from './tom-tat-khach.service.js';
import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { SupabaseAuthGuard } from '../xac-thuc/supabase-auth.guard.js';
import { KhachHangQuanTriService } from './khach-hang.service.js';
import { LichSuService } from './lich-su.service.js';
import { VeSinhService } from './ve-sinh.service.js';
import { VoucherService } from './voucher.service.js';
import { moDb, chu, maId } from './van-hanh.db.js';
import { BadRequestException,ForbiddenException } from '@nestjs/common';
type R = Request & { nguoiDung: { id: string } };
@Controller('quan-tri')
@UseGuards(SupabaseAuthGuard)
export class VanHanhController {
  constructor(
    private readonly khach: KhachHangQuanTriService,
    private readonly summaries:TomTatKhachService,
    private readonly history: LichSuService,
    private readonly clean: VeSinhService,
    private readonly vouchers: VoucherService,
  ) {}
  @Get('khach-hang') list(@Req() r: R, @Query() q: Record<string, string>) {
    return this.khach.list(r.nguoiDung.id, q);
  }
  @Get('khach-hang/chi-tiet') detail(@Req() r: R, @Query('khoa') key: string) {
    return this.khach.detail(r.nguoiDung.id, key);
  }
  @Post('khach-hang') save(@Req() r: R, @Body() b: Record<string, unknown>) {
    return this.khach.save(r.nguoiDung.id, b);
  }
  @Post('khach-hang/tai-khoan') account(@Req() r:R,@Body() b:Record<string,unknown>){return this.khach.createAccount(r.nguoiDung.id,b);}
  @Get('khach-hang/tom-tat') summary(@Req() r:R,@Query('khoa') key:string){return this.summaries.read(r.nguoiDung.id,key);}
  @Post('khach-hang/tom-tat') generateSummary(@Req() r:R,@Body() b:Record<string,unknown>){return this.summaries.summarize(r.nguoiDung.id,String(b.khach_khoa||''));}
  @Get('lich-su') logs(@Req() r: R, @Query() q: Record<string, string>) {
    return this.history.list(r.nguoiDung.id, q);
  }
  @Get('ve-sinh') tasks(@Req() r: R) {
    return this.clean.list(r.nguoiDung.id);
  }
  @Put('ve-sinh/:id') task(
    @Req() r: R,
    @Param('id') id: string,
    @Body() b: Record<string, unknown>,
  ) {
    return this.clean.update(r.nguoiDung.id, id, b);
  }
  @Get('voucher/khach') recipients(@Req() r: R) {
    return this.vouchers.recipients(r.nguoiDung.id);
  }
  @Get('voucher') voucher(@Req() r: R) {
    return this.vouchers.list(r.nguoiDung.id);
  }
  @Post('voucher') addVoucher(@Req() r: R, @Body() b: Record<string, unknown>) {
    return this.vouchers.save(r.nguoiDung.id, undefined, b);
  }
  @Post('voucher/thu') preview(
    @Req() r: R,
    @Body() b: Record<string, unknown>,
  ) {
    return this.vouchers.preview(r.nguoiDung.id, b);
  }
  @Put('voucher/:id') editVoucher(
    @Req() r: R,
    @Param('id') id: string,
    @Body() b: Record<string, unknown>,
  ) {
    return this.vouchers.save(r.nguoiDung.id, id, b);
  }
  @Post('voucher/:id/gui') sendVoucher(
    @Req() r: R,
    @Param('id') id: string,
    @Body() b: Record<string, unknown>,
  ) {
    return this.vouchers.send(r.nguoiDung.id, id, b);
  }
}
@Controller('khach')
@UseGuards(SupabaseAuthGuard)
export class ThietBiController {
  private async db(uid:string){const c=await moDb();try{const state=(await c.query('SELECT trang_thai FROM public.nguoi_dung WHERE id=$1',[uid])).rows[0]?.trang_thai;if(state!=='Đang hoạt động')throw new ForbiddenException('Tài khoản không hoạt động');return c;}catch(e){await c.end();throw e;}}

  @Post('thiet-bi') async register(
    @Req() r: R,
    @Body() b: Record<string, unknown>,
  ) {
    const token = chu(b.ma_thiet_bi, 20, 4096),
      platform = String(b.nen_tang);
    if (!['Android', 'iOS', 'Web'].includes(platform))
      throw new BadRequestException('Nền tảng không hợp lệ');
    const c = await this.db(r.nguoiDung.id);
    try {
      await c.query(
        'INSERT INTO public.thiet_bi_thong_bao(nguoi_dung_id,ma_thiet_bi,nen_tang) VALUES($1,$2,$3) ON CONFLICT(ma_thiet_bi) DO UPDATE SET nguoi_dung_id=$1,nen_tang=$3,ngay_cap_nhat=now()',
        [r.nguoiDung.id, token, platform],
      );
      return { ok: true };
    } finally {
      await c.end();
    }
  }
  @Delete('thiet-bi') async remove(
    @Req() r: R,
    @Body() b: Record<string, unknown>,
  ) {
    const c = await this.db(r.nguoiDung.id);
    try {
      await c.query(
        'DELETE FROM public.thiet_bi_thong_bao WHERE nguoi_dung_id=$1 AND ma_thiet_bi=$2',
        [r.nguoiDung.id, chu(b.ma_thiet_bi, 20, 4096)],
      );
      return { ok: true };
    } finally {
      await c.end();
    }
  }
  @Get('thong-bao') async notices(@Req() r: R) {
    const c = await this.db(r.nguoiDung.id);
    try {
      return (
        await c.query(
          'SELECT id,tieu_de,noi_dung,loai,du_lieu,da_doc_luc,ngay_tao FROM public.thong_bao WHERE nguoi_dung_id=$1 ORDER BY ngay_tao DESC LIMIT 100',
          [r.nguoiDung.id],
        )
      ).rows;
    } finally {
      await c.end();
    }
  }
  @Put('thong-bao/:id/doc') async read(@Req() r: R, @Param('id') id: string) {
    const c = await this.db(r.nguoiDung.id);
    try {
      await c.query(
        'UPDATE public.thong_bao SET da_doc_luc=coalesce(da_doc_luc,now()) WHERE id=$1 AND nguoi_dung_id=$2',
        [maId(id), r.nguoiDung.id],
      );
      return { ok: true };
    } finally {
      await c.end();
    }
  }
}

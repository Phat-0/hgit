import {Body,Controller,Delete,Get,Param,Patch,Post,Query,Req,UseGuards} from '@nestjs/common';
import type {Request} from 'express';
import {SupabaseAuthGuard} from '../xac-thuc/supabase-auth.guard.js';
import {LichPhongService} from './lich-phong.service.js';
type Auth=Request & {nguoiDung:{id:string}};
@Controller('quan-tri/lich-phong')
@UseGuards(SupabaseAuthGuard)
export class LichPhongController{
 constructor(private readonly service:LichPhongService){}
 @Get() calendar(@Req() r:Auth,@Query('homestay_id') branch:string,@Query('bat_dau') a:string,@Query('ket_thuc') b:string){return this.service.calendar(r.nguoiDung.id,branch||'',a,b);}
 @Post('khoa') block(@Req() r:Auth,@Body() b:unknown){return this.service.block(r.nguoiDung.id,b);}
 @Delete('khoa/:id') unblock(@Req() r:Auth,@Param('id') id:string){return this.service.unblock(r.nguoiDung.id,id);}
 @Patch('phong/:id/gia-co-ban') basePrices(@Req() r:Auth,@Param('id') id:string,@Body() b:unknown){return this.service.updateBasePrices(r.nguoiDung.id,id,b);}
}

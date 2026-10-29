import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { SupabaseAuthGuard } from '../xac-thuc/supabase-auth.guard.js';
import { PhongService } from './phong.service.js';
type AuthRequest=Request & {nguoiDung:{id:string}};
@Controller('quan-tri/phong')
@UseGuards(SupabaseAuthGuard)
export class PhongController {
 constructor(private readonly service:PhongService){}
 @Get('tuy-chon') options(@Req() req:AuthRequest){return this.service.options(req.nguoiDung.id);}
 @Get() list(@Req() req:AuthRequest,@Query('tim') tim='',@Query('homestay_id') homestay='',@Query('trang_thai') state='',@Query('trang',new ParseIntPipe({optional:true})) page=1,@Query('gioi_han',new ParseIntPipe({optional:true})) limit=10){return this.service.list(req.nguoiDung.id,tim,homestay,state,page,limit);}
 @Get(':id') detail(@Req() req:AuthRequest,@Param('id') id:string){return this.service.detail(req.nguoiDung.id,id);}
 @Post() create(@Req() req:AuthRequest,@Body() body:unknown){return this.service.create(req.nguoiDung.id,body);}
 @Put(':id') update(@Req() req:AuthRequest,@Param('id') id:string,@Body() body:unknown){return this.service.update(req.nguoiDung.id,id,body);}
 @Delete(':id') remove(@Req() req:AuthRequest,@Param('id') id:string){return this.service.remove(req.nguoiDung.id,id);}
}

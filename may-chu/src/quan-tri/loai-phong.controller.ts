import {Body,Controller,Delete,Get,Param,Post,Put,Query,Req,UseGuards} from '@nestjs/common';
import type {Request} from 'express';
import {SupabaseAuthGuard} from '../xac-thuc/supabase-auth.guard.js';
import {LoaiPhongService} from './loai-phong.service.js';
type Auth=Request & {nguoiDung:{id:string}};
@Controller('quan-tri/loai-phong')
@UseGuards(SupabaseAuthGuard)
export class LoaiPhongController{
 constructor(private readonly service:LoaiPhongService){}
 @Get() list(@Req() r:Auth,@Query('homestay_id') branch=''){return this.service.list(r.nguoiDung.id,branch);}
 @Post() create(@Req() r:Auth,@Body() b:unknown){return this.service.create(r.nguoiDung.id,b);}
 @Put(':id') update(@Req() r:Auth,@Param('id') id:string,@Body() b:unknown){return this.service.update(r.nguoiDung.id,id,b);}
 @Delete(':id') remove(@Req() r:Auth,@Param('id') id:string){return this.service.remove(r.nguoiDung.id,id);}
}

import {Body,Controller,Delete,Get,Param,Put,Req,UseGuards} from '@nestjs/common';
import type {Request} from 'express';
import {SupabaseAuthGuard} from '../xac-thuc/supabase-auth.guard.js';
import {DonLichService} from './don-lich.service.js';
type Auth=Request & {nguoiDung:{id:string}};
@Controller('quan-tri/lich-phong/don-dat-phong')
@UseGuards(SupabaseAuthGuard)
export class DonLichController{
 constructor(private readonly service:DonLichService){}
 @Get(':id') detail(@Req() r:Auth,@Param('id') id:string){return this.service.detail(r.nguoiDung.id,id);}
 @Put(':id') edit(@Req() r:Auth,@Param('id') id:string,@Body() body:unknown){return this.service.edit(r.nguoiDung.id,id,body);}
 @Delete(':id') remove(@Req() r:Auth,@Param('id') id:string){return this.service.remove(r.nguoiDung.id,id);}
}

import {FileInterceptor} from '@nestjs/platform-express';
import {TepVaChatDonService} from './tep-va-chat-don.service.js';
import type {ChatFile} from '../khach-hang/chat-tep.js';
import {Body,Controller,Delete,Get,Param,Put,Post,UploadedFile,UseInterceptors,Req,UseGuards} from '@nestjs/common';
import type {Request} from 'express';
import {SupabaseAuthGuard} from '../xac-thuc/supabase-auth.guard.js';
import {DonLichService} from './don-lich.service.js';
type Auth=Request & {nguoiDung:{id:string}};
@Controller('quan-tri/lich-phong/don-dat-phong')
@UseGuards(SupabaseAuthGuard)
export class DonLichController{
 constructor(private readonly service:DonLichService,private readonly files:TepVaChatDonService){}
 @Get(':id/anh') images(@Req() r:Auth,@Param('id') id:string){return this.files.images(r.nguoiDung.id,id);}
 @Post(':id/anh') @UseInterceptors(FileInterceptor('file',{limits:{fileSize:5242880,files:1}})) upload(@Req() r:Auth,@Param('id') id:string,@UploadedFile() file:ChatFile){return this.files.upload(r.nguoiDung.id,id,file);}
 @Delete(':id/anh/:image') deleteImage(@Req() r:Auth,@Param('id') id:string,@Param('image') image:string){return this.files.remove(r.nguoiDung.id,id,image);}
 @Post(':id/hoi-thoai') conversation(@Req() r:Auth,@Param('id') id:string){return this.files.conversation(r.nguoiDung.id,id);}

 @Get(':id') detail(@Req() r:Auth,@Param('id') id:string){return this.service.detail(r.nguoiDung.id,id);}
 @Put(':id') edit(@Req() r:Auth,@Param('id') id:string,@Body() body:unknown){return this.service.edit(r.nguoiDung.id,id,body);}
 @Delete(':id') remove(@Req() r:Auth,@Param('id') id:string){return this.service.remove(r.nguoiDung.id,id);}
}

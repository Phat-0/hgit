import { BadRequestException, Controller, Get, Param, Query } from '@nestjs/common';
import { HomestayService } from './homestay.service.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Controller('homestay')
export class HomestayController {
  constructor(private readonly service: HomestayService) {}

  @Get()
  danhSach(@Query('tinh_thanh') tinhThanh?: string) {
    if (tinhThanh && tinhThanh.length > 100) throw new BadRequestException('Tỉnh thành không hợp lệ');
    return this.service.danhSach(tinhThanh?.trim());
  }

  @Get(':id/phong')
  danhSachPhong(@Param('id') id: string) {
    if (!uuid.test(id)) throw new BadRequestException('Mã Homestay không hợp lệ');
    return this.service.danhSachPhong(id);
  }
}

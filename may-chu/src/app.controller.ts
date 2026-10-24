import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('suc-khoe')
  getHealth() {
    return { trang_thai: 'Hoạt động', dich_vu: 'Máy chủ Homestay' };
  }

  @Get('suc-khoe/co-so-du-lieu')
  async getDatabaseHealth() {
    try {
      return await this.appService.getDatabaseHealth();
    } catch {
      throw new ServiceUnavailableException('Không thể kiểm tra cơ sở dữ liệu');
    }
  }
}

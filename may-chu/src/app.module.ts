import { Module } from '@nestjs/common';
import { XacThucModule } from './xac-thuc/xac-thuc.module.js';
import { HomestayModule } from './homestay/homestay.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [XacThucModule, HomestayModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

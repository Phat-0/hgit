import { Module } from '@nestjs/common';
import { XacThucModule } from './xac-thuc/xac-thuc.module.js';
import { HomestayModule } from './homestay/homestay.module.js';
import { QuanTriModule } from './quan-tri/quan-tri.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [XacThucModule, HomestayModule, QuanTriModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

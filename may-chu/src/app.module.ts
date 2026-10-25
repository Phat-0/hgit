import { Module } from '@nestjs/common';
import { XacThucModule } from './xac-thuc/xac-thuc.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [XacThucModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

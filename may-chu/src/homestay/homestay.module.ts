import { Module } from '@nestjs/common';
import { HomestayController } from './homestay.controller.js';
import { HomestayService } from './homestay.service.js';

@Module({ controllers: [HomestayController], providers: [HomestayService] })
export class HomestayModule {}

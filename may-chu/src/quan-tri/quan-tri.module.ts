import { Module } from '@nestjs/common';
import { XacThucModule } from '../xac-thuc/xac-thuc.module.js';
import { QuanTriController } from './quan-tri.controller.js';
import { QuanTriService } from './quan-tri.service.js';
import { ChiNhanhController } from './chi-nhanh.controller.js';
import { ChiNhanhService } from './chi-nhanh.service.js';

@Module({ imports: [XacThucModule], controllers: [QuanTriController, ChiNhanhController], providers: [QuanTriService, ChiNhanhService] })
export class QuanTriModule {}

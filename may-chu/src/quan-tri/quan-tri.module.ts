import { Module } from '@nestjs/common';
import { XacThucModule } from '../xac-thuc/xac-thuc.module.js';
import { QuanTriController } from './quan-tri.controller.js';
import { QuanTriService } from './quan-tri.service.js';
import { ChiNhanhController } from './chi-nhanh.controller.js';
import { ChiNhanhService } from './chi-nhanh.service.js';
import { PhongController } from './phong.controller.js';
import { PhongService } from './phong.service.js';
import { LoaiPhongService } from './loai-phong.service.js';
import { LoaiPhongController } from './loai-phong.controller.js';

@Module({ imports: [XacThucModule], controllers: [QuanTriController, ChiNhanhController, PhongController, LoaiPhongController], providers: [QuanTriService, ChiNhanhService, PhongService, LoaiPhongService] })
export class QuanTriModule {}

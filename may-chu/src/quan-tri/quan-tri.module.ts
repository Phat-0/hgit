import { Module } from '@nestjs/common';
import { XacThucModule } from '../xac-thuc/xac-thuc.module.js';
import { QuanTriController } from './quan-tri.controller.js';
import { QuanTriService } from './quan-tri.service.js';

@Module({ imports: [XacThucModule], controllers: [QuanTriController], providers: [QuanTriService] })
export class QuanTriModule {}

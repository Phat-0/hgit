import { Module } from '@nestjs/common';
import { XacThucModule } from '../xac-thuc/xac-thuc.module.js';
import { KhachHangController } from './khach-hang.controller.js';
import { KetNoiKhachService } from './ket-noi.service.js';
import { TrangKhachService } from './trang-khach.service.js';
import { ChatService } from './chat.service.js';
@Module({
  imports: [XacThucModule],
  controllers: [KhachHangController],
  providers: [KetNoiKhachService, TrangKhachService, ChatService],
})
export class KhachHangModule {}

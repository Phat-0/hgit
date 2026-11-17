import { ChatbotService } from '../chatbot/chatbot.service.js';
import { ChatbotCongCu } from '../chatbot/chatbot-cong-cu.js';
import { ChatbotController } from '../chatbot/chatbot.controller.js';
import { QuanTriService } from '../quan-tri/quan-tri.service.js';
import { Module } from '@nestjs/common';
import { XacThucModule } from '../xac-thuc/xac-thuc.module.js';
import { KhachHangController } from './khach-hang.controller.js';
import { KetNoiKhachService } from './ket-noi.service.js';
import { TrangKhachService } from './trang-khach.service.js';
import { ChatService } from './chat.service.js';
@Module({
  imports: [XacThucModule],
  controllers: [KhachHangController, ChatbotController],
  providers: [KetNoiKhachService, TrangKhachService, ChatService, ChatbotService, ChatbotCongCu, QuanTriService],
})
export class KhachHangModule {}

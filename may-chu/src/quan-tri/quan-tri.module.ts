import {TepVaChatDonService} from './tep-va-chat-don.service.js';
import {HienThiLichService} from './hien-thi-lich.service.js';
import {BaoCaoController} from './bao-cao.controller.js';
import {BaoCaoService} from './bao-cao.service.js';
import {VaiTroController} from './vai-tro.controller.js';
import {VaiTroService} from './vai-tro.service.js';
import { TienIchChatController } from './tien-ich-chat.controller.js';
import { TienIchChatService } from './tien-ich-chat.service.js';
import {
  TrangChuController,
  TrangChuKhachController,
} from './trang-chu.controller.js';
import { TrangChuService } from './trang-chu.service.js';
import { NhanVienController } from './nhan-vien.controller.js';
import { NhanVienService } from './nhan-vien.service.js';
import { ComboController } from './combo.controller.js';
import { ComboService } from './combo.service.js';
import { DonLichController } from './don-lich.controller.js';
import { DonLichService } from './don-lich.service.js';
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
import { LichPhongController } from './lich-phong.controller.js';
import { LichPhongService } from './lich-phong.service.js';

@Module({
  imports: [XacThucModule],
  controllers: [BaoCaoController,VaiTroController,
    TienIchChatController,
    TrangChuController,
    TrangChuKhachController,
    NhanVienController,
    ComboController,
    QuanTriController,
    ChiNhanhController,
    PhongController,
    LoaiPhongController,
    LichPhongController,
    DonLichController,
  ],
  providers: [TepVaChatDonService,HienThiLichService,BaoCaoService,VaiTroService,
    TienIchChatService,
    TrangChuService,
    NhanVienService,
    ComboService,
    QuanTriService,
    ChiNhanhService,
    PhongService,
    LoaiPhongService,
    LichPhongService,
    DonLichService,
  ],
})
export class QuanTriModule {}

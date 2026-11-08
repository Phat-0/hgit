import {GioiHanTruyCapService} from './gioi-han.service.js';
import { Module } from '@nestjs/common';
import { SupabaseAuthGuard } from './supabase-auth.guard.js';
import { XacThucController } from './xac-thuc.controller.js';
import { XacThucService } from './xac-thuc.service.js';

@Module({
  controllers: [XacThucController],
  providers: [GioiHanTruyCapService, XacThucService, SupabaseAuthGuard],
  exports: [GioiHanTruyCapService, XacThucService, SupabaseAuthGuard],
})
export class XacThucModule {}

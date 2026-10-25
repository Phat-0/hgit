import { Module } from '@nestjs/common';
import { SupabaseAuthGuard } from './supabase-auth.guard.js';
import { XacThucController } from './xac-thuc.controller.js';
import { XacThucService } from './xac-thuc.service.js';

@Module({
  controllers: [XacThucController],
  providers: [XacThucService, SupabaseAuthGuard],
  exports: [XacThucService, SupabaseAuthGuard],
})
export class XacThucModule {}

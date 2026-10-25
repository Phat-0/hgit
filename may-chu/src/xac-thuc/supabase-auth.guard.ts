import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { XacThucService } from './xac-thuc.service.js';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly xacThucService: XacThucService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { nguoiDung?: { id: string; email?: string } }>();
    const authorization = request.headers.authorization;
    if (!authorization || !/^Bearer\s+\S+$/i.test(authorization)) {
      throw new UnauthorizedException('Thiếu Bearer token');
    }
    const token = authorization.replace(/^Bearer\s+/i, '');
    request.nguoiDung = await this.xacThucService.xacMinhToken(token);
    return true;
  }
}

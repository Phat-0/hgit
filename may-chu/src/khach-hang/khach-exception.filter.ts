import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
@Catch()
export class KhachExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('TrangKhach');
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    if (error instanceof HttpException) {
      const data = error.getResponse();
      response
        .status(error.getStatus())
        .json(typeof data === 'string' ? { message: data } : data);
      return;
    }
    const code = (error as { code?: string })?.code;
    if (code === '42P01' || code === '42703') {
      response
        .status(503)
        .json({
          message:
            'Database chưa đồng bộ trang khách/chat. Chạy các migration đặt phòng, combo rồi npm.cmd run db:trang-khach-chat tại may-chu.',
        });
      return;
    }
    this.logger.error('Lỗi trang khách/chat: ' + (code || 'không có mã'));
    response
      .status(503)
      .json({
        message: 'Hệ thống tạm thời chưa xử lý được. Vui lòng thử lại sau.',
      });
  }
}

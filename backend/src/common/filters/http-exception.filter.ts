import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

import { ApiResponse } from '../envelope/api-response';

/**
 * Every error path returns an ApiResponse envelope. HTTP status stays accurate
 * (401/403/429 still mean what they say) but the body always parses on the
 * frontend's single chokepoint.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errNo: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const obj = body as { message?: unknown; error?: unknown; err_no?: unknown };
        if (Array.isArray(obj.message)) message = obj.message.join('; ');
        else if (typeof obj.message === 'string') message = obj.message;
        else if (typeof obj.error === 'string') message = obj.error;
        if (typeof obj.err_no === 'string') errNo = obj.err_no;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      this.logger.error(exception.stack);
    } else {
      this.logger.error('Unknown exception type', String(exception));
    }

    res.status(status).json(ApiResponse.fail(message, errNo));
  }
}

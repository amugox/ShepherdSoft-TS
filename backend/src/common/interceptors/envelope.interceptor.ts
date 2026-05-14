import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

import { ApiResponse, type ApiResponseEnvelope, isRawEnvelope } from '../envelope/api-response';

/**
 * Wraps every controller return value into ApiResponseEnvelope.
 * Services that need full control (e.g., embed an SP's err_no) can return
 * a rawEnvelope() sentinel and it'll be passed through untouched.
 */
@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiResponseEnvelope> {
    return next.handle().pipe(
      map((value): ApiResponseEnvelope => {
        if (isRawEnvelope(value)) {
          // Strip the sentinel symbol — JSON.stringify ignores symbol keys anyway,
          // but being explicit keeps the contract clean.
          const { stat, msg, ext, err_no, data } = value;
          return { stat, msg, ext, err_no, data };
        }
        return ApiResponse.ok(value);
      }),
    );
  }
}

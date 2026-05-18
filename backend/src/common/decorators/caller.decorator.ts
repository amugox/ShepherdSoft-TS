import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';

import type { RequestHeaderDto } from '../envelope/api-request.dto';
import type { RequestWithCaller } from '../envelope/types';

/**
 * @Caller() — pulls the server-vouched RequestHeader off the request.
 * The header is populated by CallerInterceptor from the verified JWT,
 * so handlers can trust br_code / ucode / sid without re-validating.
 */
export const Caller = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestHeaderDto => {
    const req = ctx.switchToHttp().getRequest<RequestWithCaller>();
    if (!req.caller) {
      throw new UnauthorizedException('Caller context missing — route requires authentication.');
    }
    return req.caller;
  },
);

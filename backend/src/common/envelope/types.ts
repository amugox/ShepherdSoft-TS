import type { Request as ExpressRequest } from 'express';

import type { ApiAppContext } from '@shepherd/shared';

import type { ApiRequestDto, RequestHeaderDto } from './api-request.dto';

/** JWT payload extracted by the Passport strategy and stored on req.user. */
export interface JwtUser {
  sub: string;
  jti: string;
  userData: ApiAppContext;
}

export interface RequestWithCaller extends ExpressRequest {
  user?: JwtUser;
  /** Body re-typed so we can rely on the envelope shape inside controllers. */
  body: ApiRequestDto;
  /** Set by CallerInterceptor — server-vouched caller header. */
  caller?: RequestHeaderDto;
}

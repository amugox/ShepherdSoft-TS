import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

import { RequestHeaderDto } from '../envelope/api-request.dto';
import type { RequestWithCaller } from '../envelope/types';

/**
 * Replaces ShepherdSoft.Api/Middlewares/WebApiDataHandler.cs.
 * For every authenticated request, builds a server-vouched RequestHeader from
 * the JWT's userData claim and OVERWRITES request.body.caller so handlers
 * never trust client-supplied caller data.
 */
@Injectable()
export class CallerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<RequestWithCaller>();
    if (req.user?.userData) {
      const u = req.user.userData;
      const caller = new RequestHeaderDto();
      caller.ucode = u.UserCode;
      caller.br_code = u.BranchCode;
      caller.uname = u.Username;
      caller.fnames = u.FullNames;
      caller.url = u.UserRole;
      caller.sid = u.SessionID;
      caller.ttl = u.Title;
      req.caller = caller;
      if (req.body && typeof req.body === 'object') {
        req.body.caller = caller;
      }
    }
    return next.handle();
  }
}

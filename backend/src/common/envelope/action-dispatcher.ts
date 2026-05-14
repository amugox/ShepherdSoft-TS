import { BadRequestException } from '@nestjs/common';

import type { ApiRequestDto } from './api-request.dto';

export type ActionHandler<TReq extends ApiRequestDto = ApiRequestDto> = (req: TReq) => Promise<unknown>;

export type ActionMap<TReq extends ApiRequestDto = ApiRequestDto> = Record<number, ActionHandler<TReq>>;

/**
 * Generic dispatcher: each module's service builds a handler map and delegates
 * to this helper. Mirrors the `switch (request.Action)` blocks in Bl.cs.
 */
export const dispatch = async <TReq extends ApiRequestDto>(
  req: TReq,
  handlers: ActionMap<TReq>,
): Promise<unknown> => {
  const handler = handlers[req.act];
  if (!handler) {
    throw new BadRequestException(`Unsupported action code: ${req.act}`);
  }
  return handler(req);
};

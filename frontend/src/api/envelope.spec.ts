import { describe, expect, it } from 'vitest';

import { API_STATUS, HTTP_API_ACTION } from '@shepherd/shared';

import { ApiError } from './envelope';

describe('shared constants', () => {
  it('action codes match the .NET HTTP_API_ACTION exactly', () => {
    expect(HTTP_API_ACTION.DATA_GET_LIST).toBe(1);
    expect(HTTP_API_ACTION.GUEST_FIND).toBe(200);
    expect(HTTP_API_ACTION.GUEST_GET_STATS).toBe(208);
    expect(HTTP_API_ACTION.MEMBER_FAM_FIND).toBe(105);
  });

  it('API_STATUS sentinel values', () => {
    expect(API_STATUS.Ok).toBe(0);
    expect(API_STATUS.Error).toBe(1);
  });
});

describe('ApiError', () => {
  it('carries the err_no code', () => {
    const err = new ApiError('boom', 'ERR-AUTH-01');
    expect(err.errNo).toBe('ERR-AUTH-01');
    expect(err.message).toBe('boom');
    expect(err.name).toBe('ApiError');
  });
});

import { AxiosError } from 'axios';

import type { ApiResponse } from '@shepherd/shared';
import { API_STATUS } from '@shepherd/shared';

import { client } from './client';

export type Area = 'auth' | 'data' | 'guest' | 'member' | 'messaging' | 'user';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly errNo?: string,
    public readonly httpStatus?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const envelopeFromAxiosError = <T>(
  err: unknown,
  fallbackMsg: string,
): ApiError => {
  if (err instanceof AxiosError && err.response) {
    const status = err.response.status;
    const body = err.response.data as Partial<ApiResponse<T>> | undefined;
    return new ApiError(body?.msg ?? fallbackMsg, body?.err_no, status);
  }
  return new ApiError(fallbackMsg);
};

/** Single chokepoint — every action-coded request flows through here. */
export const call = async <T = unknown>(
  area: Area,
  act: number,
  content?: unknown,
): Promise<T | undefined> => {
  try {
    const { data } = await client.post<ApiResponse<T>>(`/${area}/service`, {
      tsp: new Date().toISOString(),
      ver: 1,
      act,
      content,
      caller: null,
    });
    if (data.stat !== API_STATUS.Ok) {
      throw new ApiError(data.msg ?? 'Request failed.', data.err_no);
    }
    return data.data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw envelopeFromAxiosError<T>(err, 'Request failed.');
  }
};

/**
 * Login is the one endpoint that takes a payload but is not /service.
 * It still uses the envelope shape so the response interceptor handling is uniform.
 */
export const callLogin = async <T = unknown>(content: unknown): Promise<T> => {
  try {
    const { data } = await client.post<ApiResponse<T>>(`/auth/login`, {
      tsp: new Date().toISOString(),
      ver: 1,
      act: 0,
      content,
      caller: null,
    });
    if (data.stat !== API_STATUS.Ok) {
      throw new ApiError(data.msg ?? 'Login failed.', data.err_no);
    }
    return data.data as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw envelopeFromAxiosError<T>(err, 'Login failed.');
  }
};

export const callPublic = async <T = unknown>(path: string, content: unknown, act = 0): Promise<T> => {
  try {
    const { data } = await client.post<ApiResponse<T>>(path, {
      tsp: new Date().toISOString(),
      ver: 1,
      act,
      content,
      caller: null,
    });
    if (data.stat !== API_STATUS.Ok) {
      throw new ApiError(data.msg ?? 'Request failed.', data.err_no);
    }
    return data.data as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw envelopeFromAxiosError<T>(err, 'Request failed.');
  }
};

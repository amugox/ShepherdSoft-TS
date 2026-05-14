/**
 * Mirrors ShepherdSoft.DBL.Models.ApiResponseModel.
 * Serialized property names match exactly (stat, msg, ext, err_no, data).
 */
export interface ApiResponseEnvelope<T = unknown> {
  stat: number;
  msg?: string;
  ext?: string;
  err_no?: string;
  data?: T;
}

export const ApiResponse = {
  ok<T>(data?: T, msg?: string): ApiResponseEnvelope<T> {
    return { stat: 0, ...(msg !== undefined ? { msg } : {}), ...(data !== undefined ? { data } : {}) };
  },
  fail(msg: string, errNo?: string): ApiResponseEnvelope<never> {
    return { stat: 1, msg, ...(errNo !== undefined ? { err_no: errNo } : {}) };
  },
};

/**
 * Sentinel returned by services that want to short-circuit and emit a raw envelope
 * (e.g., when the underlying SP returns a non-zero RespStatus that's not an exception).
 */
export const RAW_ENVELOPE = Symbol('RAW_ENVELOPE');

export interface RawEnvelope<T = unknown> extends ApiResponseEnvelope<T> {
  [RAW_ENVELOPE]: true;
}

export const rawEnvelope = <T>(env: ApiResponseEnvelope<T>): RawEnvelope<T> => ({
  ...env,
  [RAW_ENVELOPE]: true,
});

export const isRawEnvelope = (v: unknown): v is RawEnvelope =>
  typeof v === 'object' && v !== null && (v as Record<symbol, unknown>)[RAW_ENVELOPE] === true;

/**
 * Request envelope — mirrors ShepherdSoft.DBL.Models.ApiRequestModel.
 * Property names match the JsonPropertyName attributes exactly.
 */
export interface ApiRequest<TContent = unknown> {
  /** Client timestamp ISO string. JSON: "tsp" */
  tsp: string;
  /** Protocol version. JSON: "ver" */
  ver: number;
  /** Action code. JSON: "act" */
  act: number;
  /** Action-specific payload. JSON: "content" */
  content?: TContent;
  /**
   * Caller context. Set by the server from the JWT — clients may send null.
   * JSON: "caller"
   */
  caller?: RequestHeader | null;
}

/** Mirrors ShepherdSoft.DBL.Models.RequestHeader. */
export interface RequestHeader {
  /** JSON: "br_code" */
  br_code: number;
  /** JSON: "ucode" */
  ucode: number;
  /** JSON: "uname" */
  uname?: string;
  /** JSON: "fnames" */
  fnames?: string;
  /** JSON: "ver" */
  ver?: string;
  /** JSON: "sid" */
  sid?: string;
  /** JSON: "url" — UserRole (named "url" in the original — preserved). */
  url?: string;
  /** JSON: "skey" */
  skey?: string;
  /** JSON: "ttl" */
  ttl?: string;
}

/**
 * Response envelope — mirrors ShepherdSoft.DBL.Models.ApiResponseModel.
 */
export interface ApiResponse<TData = unknown> {
  /** 0 = Ok, 1 = Error. JSON: "stat" */
  stat: number;
  /** JSON: "msg" */
  msg?: string;
  /** JSON: "ext" */
  ext?: string;
  /** JSON: "err_no" */
  err_no?: string;
  /** JSON: "data" */
  data?: TData;
}

import { Expose, Type } from 'class-transformer';
import { IsInt, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

/**
 * Mirrors ShepherdSoft.DBL.Models.RequestHeader.
 * In branch-user flows the CallerInterceptor *overwrites* this from the JWT,
 * so any client-supplied value is discarded.
 */
export class RequestHeaderDto {
  @Expose({ name: 'br_code' })
  @IsInt()
  @IsOptional()
  br_code = 0;

  @Expose({ name: 'ucode' })
  @IsInt()
  @IsOptional()
  ucode = 0;

  @Expose({ name: 'uname' })
  @IsOptional()
  @IsString()
  uname?: string;

  @Expose({ name: 'fnames' })
  @IsOptional()
  @IsString()
  fnames?: string;

  @Expose({ name: 'ver' })
  @IsOptional()
  @IsString()
  ver?: string;

  @Expose({ name: 'sid' })
  @IsOptional()
  @IsString()
  sid?: string;

  @Expose({ name: 'url' })
  @IsOptional()
  @IsString()
  url?: string;

  @Expose({ name: 'skey' })
  @IsOptional()
  @IsString()
  skey?: string;

  @Expose({ name: 'ttl' })
  @IsOptional()
  @IsString()
  ttl?: string;
}

/**
 * Mirrors ShepherdSoft.DBL.Models.ApiRequestModel.
 * Property names (tsp, ver, act, content, caller) are serialized exactly.
 */
export class ApiRequestDto<TContent = unknown> {
  @Expose({ name: 'tsp' })
  @IsOptional()
  @IsString()
  tsp?: string;

  @Expose({ name: 'ver' })
  @IsInt()
  ver = 1;

  @Expose({ name: 'act' })
  @IsInt()
  act = 0;

  @Expose({ name: 'content' })
  @IsOptional()
  content?: TContent;

  @Expose({ name: 'caller' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => RequestHeaderDto)
  caller?: RequestHeaderDto | null;
}

import { Body, Controller, HttpCode, Post, UseGuards, UseInterceptors } from '@nestjs/common';

import { ApiRequestDto } from '../common/envelope/api-request.dto';
import { CallerInterceptor } from '../common/interceptors/caller.interceptor';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { MemberService } from './member.service';

@Controller('member')
@UseGuards(JwtAuthGuard)
@UseInterceptors(CallerInterceptor)
export class MemberController {
  constructor(private readonly member: MemberService) {}

  @Post('service')
  @HttpCode(200)
  handle(@Body() body: ApiRequestDto): Promise<unknown> {
    return this.member.handle(body);
  }
}

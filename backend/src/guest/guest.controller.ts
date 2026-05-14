import { Body, Controller, HttpCode, Post, UseGuards, UseInterceptors } from '@nestjs/common';

import { ApiRequestDto } from '../common/envelope/api-request.dto';
import { CallerInterceptor } from '../common/interceptors/caller.interceptor';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GuestService } from './guest.service';

@Controller('guest')
@UseGuards(JwtAuthGuard)
@UseInterceptors(CallerInterceptor)
export class GuestController {
  constructor(private readonly guest: GuestService) {}

  @Post('service')
  @HttpCode(200)
  handle(@Body() body: ApiRequestDto): Promise<unknown> {
    return this.guest.handle(body);
  }
}

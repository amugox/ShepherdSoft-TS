import { Body, Controller, HttpCode, Post, UseGuards, UseInterceptors } from '@nestjs/common';

import { ApiRequestDto } from '../common/envelope/api-request.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CallerInterceptor } from '../common/interceptors/caller.interceptor';
import { MessagingService } from './messaging.service';

@Controller('messaging')
@UseGuards(JwtAuthGuard)
@UseInterceptors(CallerInterceptor)
export class MessagingController {
  constructor(private readonly messaging: MessagingService) {}

  @Post('service')
  @HttpCode(200)
  handle(@Body() body: ApiRequestDto): Promise<unknown> {
    return this.messaging.handle(body);
  }
}

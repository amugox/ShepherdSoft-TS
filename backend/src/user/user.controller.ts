import { Body, Controller, HttpCode, Post, UseGuards, UseInterceptors } from '@nestjs/common';

import { ApiRequestDto } from '../common/envelope/api-request.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CallerInterceptor } from '../common/interceptors/caller.interceptor';
import { UserService } from './user.service';

@Controller('user')
@UseGuards(JwtAuthGuard)
@UseInterceptors(CallerInterceptor)
export class UserController {
  constructor(private readonly users: UserService) {}

  @Post('service')
  @HttpCode(200)
  handle(@Body() body: ApiRequestDto): Promise<unknown> {
    return this.users.handle(body);
  }
}

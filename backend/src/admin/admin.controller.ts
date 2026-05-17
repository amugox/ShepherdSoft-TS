import { Body, Controller, HttpCode, Post, UseGuards, UseInterceptors } from '@nestjs/common';

import { ApiRequestDto } from '../common/envelope/api-request.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CallerInterceptor } from '../common/interceptors/caller.interceptor';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(JwtAuthGuard)
@UseInterceptors(CallerInterceptor)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Post('service')
  @HttpCode(200)
  handle(@Body() body: ApiRequestDto): Promise<unknown> {
    return this.admin.handle(body);
  }
}

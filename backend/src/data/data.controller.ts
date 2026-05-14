import { Body, Controller, HttpCode, Post } from '@nestjs/common';

import { Public } from '../common/decorators/public.decorator';
import { ApiRequestDto } from '../common/envelope/api-request.dto';
import { DataService } from './data.service';

/**
 * /api/v1/data/service is AllowAnonymous in the .NET implementation — the
 * reference data it serves (branches, member groups) is needed on the public
 * login screen to populate the branch dropdown.
 */
@Controller('data')
export class DataController {
  constructor(private readonly data: DataService) {}

  @Public()
  @Post('service')
  @HttpCode(200)
  handle(@Body() body: ApiRequestDto): Promise<unknown> {
    return this.data.handle(body);
  }
}

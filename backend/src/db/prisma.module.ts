import { Global, Module } from '@nestjs/common';

import { MySqlService } from './mysql.service';
import { PrismaService } from './prisma.service';
import { DataSp } from './sp/data.sp';
import { FollowUpSp } from './sp/followup.sp';
import { GuestSp } from './sp/guest.sp';
import { MemberSp } from './sp/member.sp';
import { SecuritySp } from './sp/security.sp';

@Global()
@Module({
  providers: [PrismaService, MySqlService, SecuritySp, MemberSp, GuestSp, FollowUpSp, DataSp],
  exports: [PrismaService, MySqlService, SecuritySp, MemberSp, GuestSp, FollowUpSp, DataSp],
})
export class PrismaModule {}

import { Module } from '@nestjs/common';
import { LpnuScheduleService } from './lpnu-schedule.service';
import { LpnuScheduleController } from './lpnu-schedule.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { LpnuLecturerLoginSyncService } from './lpnu-lecturer-login-sync.service';

@Module({
  imports: [PrismaModule],
  controllers: [LpnuScheduleController],
  providers: [LpnuScheduleService, LpnuLecturerLoginSyncService],
  exports: [LpnuScheduleService, LpnuLecturerLoginSyncService],
})
export class LpnuScheduleModule {}

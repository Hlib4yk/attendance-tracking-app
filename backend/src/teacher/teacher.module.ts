import { Module } from '@nestjs/common';
import { TeacherController } from './teacher.controller';
import { TeacherService } from './teacher.service';
import { LpnuScheduleModule } from '../lpnu-schedule/lpnu-schedule.module';
import { FaceModule } from '../face/face.module';

@Module({
  imports: [LpnuScheduleModule, FaceModule],
  controllers: [TeacherController],
  providers: [TeacherService],
  exports: [TeacherService],
})
export class TeacherModule {}

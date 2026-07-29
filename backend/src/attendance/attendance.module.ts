import { Module } from '@nestjs/common';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { TeacherModule } from '../teacher/teacher.module';
import { FaceModule } from '../face/face.module';

@Module({
  imports: [TeacherModule, FaceModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}

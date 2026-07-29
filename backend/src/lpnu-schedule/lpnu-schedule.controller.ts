import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LpnuScheduleService } from './lpnu-schedule.service';
import { LpnuStudentScheduleQueryDto } from './dto/lpnu-student-schedule.query.dto';
import { LpnuLecturerScheduleQueryDto } from './dto/lpnu-lecturer-schedule.query.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/request-user';

@Controller('schedule/lpnu')
@UseGuards(AuthGuard('jwt'))
export class LpnuScheduleController {
  constructor(private readonly lpnu: LpnuScheduleService) {}

  @Get('student')
  student(@CurrentUser() user: RequestUser, @Query() q: LpnuStudentScheduleQueryDto) {
    return this.lpnu.studentSchedule(user, q);
  }

  @Get('lecturer')
  lecturer(@CurrentUser() user: RequestUser, @Query() q: LpnuLecturerScheduleQueryDto) {
    return this.lpnu.lecturerSchedule(user, q);
  }
}

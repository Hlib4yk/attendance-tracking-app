import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '../prisma/prisma-exports.js';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/request-user';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { StudentService } from './student.service';

@Controller('student')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.STUDENT)
export class StudentController {
  constructor(private student: StudentService) {}

  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return this.student.getProfile(user.id);
  }

  @Get('schedule')
  schedule(@CurrentUser() user: RequestUser) {
    return this.student.getSchedule(user.id);
  }

  @Get('attendance')
  attendance(@CurrentUser() user: RequestUser) {
    return this.student.getAttendanceSummary(user.id);
  }
}

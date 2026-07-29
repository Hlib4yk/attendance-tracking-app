import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '../prisma/prisma-exports.js';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/request-user';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { TeacherService } from './teacher.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { CreateSessionDto } from './dto/create-session.dto';
import { SetManualAttendanceDto } from './dto/set-manual-attendance.dto';
import { LpnuSyncGroupsSemesterDto } from './dto/lpnu-sync-groups-semester.dto';
import { AttendanceSlotContextQueryDto } from './dto/attendance-slot-context.query.dto';

@Controller('teacher')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.TEACHER)
export class TeacherController {
  constructor(private teacher: TeacherService) {}

  @Get('subjects')
  subjects(@CurrentUser() user: RequestUser) {
    if (!user.teacherId) {
      throw new ForbiddenException();
    }
    return this.teacher.listSubjects(user.teacherId);
  }

  @Get('schedule-slot/attendance-context')
  attendanceSlotContext(@CurrentUser() user: RequestUser, @Query() query: AttendanceSlotContextQueryDto) {
    if (!user.teacherId) {
      throw new ForbiddenException();
    }
    return this.teacher.resolveAttendanceSlotContext(user, query);
  }

  @Post('subjects/:subjectId/sync-groups-from-lpnu')
  syncGroupsFromLpnu(
    @CurrentUser() user: RequestUser,
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
    @Body() body: LpnuSyncGroupsSemesterDto,
  ) {
    return this.teacher.syncSubjectGroupsFromLpnu(user, subjectId, body);
  }

  @Get('subjects/:subjectId/groups')
  subjectGroups(
    @CurrentUser() user: RequestUser,
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
  ) {
    if (!user.teacherId) {
      throw new ForbiddenException();
    }
    return this.teacher.getSubjectGroups(user.teacherId, subjectId);
  }

  @Get('groups/:groupId/sessions')
  listGroupSessions(
    @CurrentUser() user: RequestUser,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ) {
    if (!user.teacherId) {
      throw new ForbiddenException();
    }
    return this.teacher.listSessionsForGroup(user.teacherId, groupId);
  }

  @Get('groups/:groupId/students')
  listStudents(
    @CurrentUser() user: RequestUser,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ) {
    if (!user.teacherId) {
      throw new ForbiddenException();
    }
    return this.teacher.listStudentsInGroup(user.teacherId, groupId);
  }

  @Post('groups/:groupId/students')
  addStudent(
    @CurrentUser() user: RequestUser,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: CreateStudentDto,
  ) {
    if (!user.teacherId) {
      throw new ForbiddenException();
    }
    return this.teacher.createStudent(user.teacherId, groupId, dto);
  }

  @Patch('students/:studentId')
  updateStudent(
    @CurrentUser() user: RequestUser,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() dto: UpdateStudentDto,
  ) {
    if (!user.teacherId) {
      throw new ForbiddenException();
    }
    return this.teacher.updateStudent(user.teacherId, studentId, dto);
  }

  @Delete('students/:studentId')
  removeStudent(
    @CurrentUser() user: RequestUser,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    if (!user.teacherId) {
      throw new ForbiddenException();
    }
    return this.teacher.deleteStudent(user.teacherId, studentId);
  }

  @Post('students/:studentId/profile-photo')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          cb(null, join(process.cwd(), 'uploads', 'students'));
        },
        filename: (_req, file, cb) => {
          const safe = `${Date.now()}${extname(file.originalname)}`.replace(/[^a-zA-Z0-9.]/g, '');
          cb(null, safe);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadProfilePhoto(
    @CurrentUser() user: RequestUser,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!user.teacherId || !file) {
      throw new ForbiddenException();
    }
    const publicPath = `/uploads/students/${file.filename}`;
    return this.teacher.setStudentProfilePhoto(user.teacherId, studentId, publicPath);
  }

  @Post('subjects/:subjectId/sessions')
  createSession(
    @CurrentUser() user: RequestUser,
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
    @Body() dto: CreateSessionDto,
  ) {
    if (!user.teacherId) {
      throw new ForbiddenException();
    }
    return this.teacher.createSession(user.teacherId, subjectId, dto);
  }

  @Get('subjects/:subjectId/sessions')
  listSessions(
    @CurrentUser() user: RequestUser,
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
  ) {
    if (!user.teacherId) {
      throw new ForbiddenException();
    }
    return this.teacher.listSessions(user.teacherId, subjectId);
  }

  @Get('sessions/:sessionId/attendance')
  getSessionAttendance(
    @CurrentUser() user: RequestUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    if (!user.teacherId) {
      throw new ForbiddenException();
    }
    return this.teacher.getSessionAttendance(user.teacherId, sessionId);
  }

  @Patch('sessions/:sessionId/attendance')
  setManualAttendance(
    @CurrentUser() user: RequestUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: SetManualAttendanceDto,
  ) {
    if (!user.teacherId) {
      throw new ForbiddenException();
    }
    return this.teacher.setManualAttendance(user.teacherId, sessionId, dto);
  }

  @Post('sessions/:sessionId/confirm')
  confirmSession(
    @CurrentUser() user: RequestUser,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    if (!user.teacherId) {
      throw new ForbiddenException();
    }
    return this.teacher.confirmSessionAttendance(user.teacherId, sessionId);
  }
}

import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '../prisma/prisma-exports.js';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminService } from './admin.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { CreateTeacherInviteDto } from './dto/create-teacher-invite.dto';
import { CurrentUser, type RequestUser } from '../auth/current-user.decorator';
@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private admin: AdminService) {}

  @Get('users')
  users() {
    return this.admin.listUsers();
  }

  @Get('students')
  students() {
    return this.admin.listStudentsAdmin();
  }

  @Get('subjects')
  subjects() {
    return this.admin.listSubjectsAdmin();
  }

  @Get('stats')
  stats() {
    return this.admin.getStats();
  }

  @Get('activity')
  activity() {
    return this.admin.getRecentActivity();
  }

  @Get('groups')
  groups() {
    return this.admin.listGroups();
  }

  @Post('groups')
  createGroup(@Body() dto: CreateGroupDto) {
    return this.admin.createGroup(dto);
  }

  @Patch('groups/:id')
  updateGroup(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateGroupDto) {
    return this.admin.updateGroup(id, dto);
  }

  @Delete('groups/:id')
  deleteGroup(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.deleteGroup(id);
  }

  @Post('teacher-invites')
  createTeacherInvite(@CurrentUser() user: RequestUser, @Body() dto: CreateTeacherInviteDto) {
    return this.admin.createTeacherInvite(user.id, dto);
  }

  @Get('teacher-invites')
  teacherInvites() {
    return this.admin.listTeacherInvites();
  }

  @Post('subjects')
  createSubject(@Body() dto: CreateSubjectDto) {
    return this.admin.createSubject(dto);
  }

  @Post('subjects/:subjectId/groups/:groupId')
  linkSubjectGroup(
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ) {
    return this.admin.linkSubjectToGroup(subjectId, groupId);
  }

  @Delete('subjects/:subjectId/groups/:groupId')
  unlinkSubjectGroup(
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ) {
    return this.admin.unlinkSubjectFromGroup(subjectId, groupId);
  }
}

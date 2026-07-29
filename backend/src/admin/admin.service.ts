import { randomBytes } from 'node:crypto';
import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Role } from '../prisma/prisma-exports.js';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { CreateTeacherInviteDto } from './dto/create-teacher-invite.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class AdminService {
  private readonly log = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  listUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        teacher: {
          select: {
            id: true,
            subjects: { select: { id: true, name: true } },
          },
        },
        student: {
          select: {
            id: true,
            groupId: true,
            group: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  listStudentsAdmin() {
    return this.prisma.student.findMany({
      orderBy: { user: { name: 'asc' } },
      include: {
        user: { select: { id: true, name: true, email: true, createdAt: true } },
        group: { select: { id: true, name: true } },
        _count: { select: { attendance: true } },
      },
    });
  }

  listSubjectsAdmin() {
    return this.prisma.subject.findMany({
      orderBy: { name: 'asc' },
      include: {
        teacher: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        groups: { select: { id: true, name: true } },
      },
    });
  }

  async getStats() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const [teachers, students, groups, sessionsToday, sessionsTotal] = await Promise.all([
      this.prisma.user.count({ where: { role: Role.TEACHER } }),
      this.prisma.user.count({ where: { role: Role.STUDENT } }),
      this.prisma.group.count(),
      this.prisma.session.count({
        where: { date: { gte: start, lt: end } },
      }),
      this.prisma.session.count(),
    ]);
    return { teachers, students, groups, sessionsToday, sessionsTotal };
  }

  getRecentActivity() {
    return this.prisma.session.findMany({
      take: 12,
      orderBy: { date: 'desc' },
      include: {
        subject: {
          select: {
            name: true,
            teacher: { include: { user: { select: { name: true } } } },
          },
        },
      },
    });
  }

  listGroups() {
    return this.prisma.group.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { students: true } },
        subjects: { select: { id: true, name: true } },
      },
    });
  }

  createGroup(dto: CreateGroupDto) {
    return this.prisma.group.create({ data: { name: dto.name } });
  }

  async updateGroup(id: string, dto: UpdateGroupDto) {
    try {
      return await this.prisma.group.update({ where: { id }, data: { name: dto.name } });
    } catch {
      throw new NotFoundException('Group not found');
    }
  }

  async deleteGroup(id: string) {
    const g = await this.prisma.group.findUnique({
      where: { id },
      include: { _count: { select: { students: true } } },
    });
    if (!g) {
      throw new NotFoundException('Group not found');
    }
    if (g._count.students > 0) {
      throw new ConflictException('Group still has students');
    }
    await this.prisma.group.delete({ where: { id } });
    return { deleted: true };
  }

  async createSubject(dto: CreateSubjectDto) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId: dto.teacherUserId },
    });
    if (!teacher) {
      throw new NotFoundException('Teacher not found for this user');
    }
    return this.prisma.subject.create({
      data: {
        name: dto.name,
        teacherId: teacher.id,
      },
    });
  }

  async linkSubjectToGroup(subjectId: string, groupId: string) {
    const [subject, group] = await Promise.all([
      this.prisma.subject.findUnique({ where: { id: subjectId } }),
      this.prisma.group.findUnique({ where: { id: groupId } }),
    ]);
    if (!subject || !group) {
      throw new NotFoundException('Subject or group not found');
    }
    return this.prisma.subject.update({
      where: { id: subjectId },
      data: { groups: { connect: { id: groupId } } },
      include: { groups: true },
    });
  }

  async unlinkSubjectFromGroup(subjectId: string, groupId: string) {
    return this.prisma.subject.update({
      where: { id: subjectId },
      data: { groups: { disconnect: { id: groupId } } },
      include: { groups: true },
    });
  }

  async createTeacherInvite(adminUserId: string, dto: CreateTeacherInviteDto) {
    const invitedEmail = dto.email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({ where: { email: invitedEmail } });
    if (existingUser) {
      throw new ConflictException('Користувач з цим email уже зареєстрований');
    }

    const expiresAt =
      dto.expiresInDays != null
        ? new Date(Date.now() + dto.expiresInDays * 86_400_000)
        : null;

    const baseUrl = (process.env.FRONTEND_URL ?? 'http://localhost:3000').replace(/\/$/, '');

    for (let attempt = 0; attempt < 8; attempt++) {
      const token = randomBytes(32).toString('base64url');
      try {
        const row = await this.prisma.teacherInvite.create({
          data: {
            token,
            invitedEmail,
            createdByAdminId: adminUserId,
            expiresAt,
          },
          select: {
            id: true,
            invitedEmail: true,
            createdAt: true,
            expiresAt: true,
          },
        });

        const inviteUrl = `${baseUrl}/register?invite=${encodeURIComponent(token)}`;
        let emailSent = false;
        let emailError: string | undefined;
        try {
          emailSent = await this.mail.sendTeacherInvite(invitedEmail, inviteUrl);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.log.warn(`SMTP failed for ${invitedEmail}: ${msg}`);
          emailError = msg;
        }

        return {
          ...row,
          emailSent,
          ...(emailSent ? {} : { inviteUrl }),
          ...(emailError ? { emailError } : {}),
        };
      } catch {
        /* unique collision on token */
      }
    }
    throw new ConflictException('Could not generate unique invite token');
  }

  listTeacherInvites() {
    return this.prisma.teacherInvite.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        invitedEmail: true,
        createdAt: true,
        expiresAt: true,
        usedAt: true,
        usedByUserId: true,
        usedByUser: { select: { email: true, name: true } },
        createdByAdmin: { select: { name: true, email: true } },
      },
    });
  }
}

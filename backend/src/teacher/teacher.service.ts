import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Method, Role, Status } from '../prisma/prisma-exports.js';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LpnuScheduleService } from '../lpnu-schedule/lpnu-schedule.service';
import {
  extractGroupCodesFromSlot,
  extractGroupCodesFromLpnuSlots,
  normalizeLpnuGroupAbbrev,
} from '../lpnu-schedule/lpnu-group-codes';
import { buildScheduleByDayAndPeriod } from '../lpnu-schedule/lpnu-schedule-layout.js';
import type { RequestUser } from '../auth/request-user';
import { CreateSessionDto } from './dto/create-session.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { SetManualAttendanceDto } from './dto/set-manual-attendance.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import type { AttendanceSlotContextQueryDto } from './dto/attendance-slot-context.query.dto';
import { StudentFaceEmbeddingService } from '../face/student-face-embedding.service';

const SALT_ROUNDS = 10;

@Injectable()
export class TeacherService {
  constructor(
    private prisma: PrismaService,
    private lpnu: LpnuScheduleService,
    private studentFaceEmbedding: StudentFaceEmbeddingService,
  ) {}

  async listSubjects(teacherId: string) {
    return this.prisma.subject.findMany({
      where: { teacherId },
      include: { groups: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Обрана з розкладу LPNU пара → коди груп у цьому слоті → перетин з групами предметів викладача.
   * Індекс variant має збігатися з порядком карток у UI (LpnuScheduleGrouped).
   */
  async resolveAttendanceSlotContext(user: RequestUser, q: AttendanceSlotContextQueryDto) {
    if (!user.teacherId) {
      throw new ForbiddenException();
    }
    const schedule = await this.lpnu.lecturerSchedule(
      { id: user.id, role: user.role, name: user.name },
      { teachername: user.name, semestr: q.semestr, semestrduration: q.semestrduration },
    );
    const grouped = buildScheduleByDayAndPeriod(schedule.slots);
    const dayRow = grouped.find((d) => d.day === q.day);
    if (!dayRow) {
      return {
        ok: false as const,
        reason: 'DAY_NOT_FOUND' as const,
        message: `У розкладі LPNU немає дня «${q.day}» для обраних семестру та половини.`,
      };
    }
    const periodRow = dayRow.periods.find((p) => p.period === q.period);
    if (!periodRow) {
      return {
        ok: false as const,
        reason: 'PERIOD_NOT_FOUND' as const,
        message: `У цей день немає пари ${q.period}.`,
      };
    }
    const slot = periodRow.slots[q.variant];
    if (!slot) {
      return {
        ok: false as const,
        reason: 'VARIANT_NOT_FOUND' as const,
        message: 'Немає такого варіанту пари в розкладі (перевірте підгрупу / тиждень).',
      };
    }

    const codesRaw = extractGroupCodesFromSlot(slot);
    const codeNorms = new Set(codesRaw.map(normalizeLpnuGroupAbbrev));

    const subjects = await this.prisma.subject.findMany({
      where: { teacherId: user.teacherId },
      include: { groups: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });

    const subjectMatches = subjects
      .map((sub) => ({
        subjectId: sub.id,
        subjectName: sub.name,
        groups: sub.groups.filter((g) => codeNorms.has(normalizeLpnuGroupAbbrev(g.name))),
      }))
      .filter((x) => x.groups.length > 0);

    if (subjectMatches.length === 0) {
      return {
        ok: false as const,
        reason: 'NO_MATCHING_GROUPS' as const,
        codesInSlot: codesRaw,
        slot: {
          day: slot.day,
          period: slot.period,
          weekParity: slot.weekParity,
          lines: slot.lines,
        },
        message:
          'Коди груп з цієї пари не збігаються з жодною групою ваших предметів у системі. Спершу прив’яжіть групи (LPNU → «Додати групи з LPNU») або відредагуйте назви груп у базі.',
      };
    }

    return {
      ok: true as const,
      ambiguousSubjects: subjectMatches.length > 1,
      subjects: subjectMatches,
      slot: {
        day: slot.day,
        period: slot.period,
        weekParity: slot.weekParity,
        lines: slot.lines,
        rawText: slot.rawText,
      },
      lpnu: { cached: schedule.cached, fetchedAt: schedule.fetchedAt },
    };
  }

  /**
   * Тягне розклад викладача з LPNU, витягує коди груп (ОІ-44, …) і зв’язує відповідні Group у БД з предметом.
   * Групи, яких немає в БД, лишаються в missingInDatabase — їх треба створити в адмінці або імпортом.
   */
  async syncSubjectGroupsFromLpnu(
    user: RequestUser,
    subjectId: string,
    q: { semestr: 'All' | '1' | '2'; semestrduration: '1' | '2' },
  ) {
    if (!user.teacherId) {
      throw new ForbiddenException();
    }
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, teacherId: user.teacherId },
      include: { groups: { select: { id: true, name: true } } },
    });
    if (!subject) {
      throw new ForbiddenException('Subject not found or access denied');
    }

    const schedule = await this.lpnu.lecturerSchedule(
      { id: user.id, role: user.role, name: user.name },
      { teachername: user.name, semestr: q.semestr, semestrduration: q.semestrduration },
    );

    const codesRaw = extractGroupCodesFromLpnuSlots(schedule.slots);
    const normalizedUnique = [...new Set(codesRaw.map(normalizeLpnuGroupAbbrev))];

    const allGroups = await this.prisma.group.findMany({ select: { id: true, name: true } });
    const normToGroup = new Map<string, { id: string; name: string }>();
    for (const g of allGroups) {
      const n = normalizeLpnuGroupAbbrev(g.name);
      if (!normToGroup.has(n)) {
        normToGroup.set(n, g);
      }
    }

    const missingInDatabase: string[] = [];
    const matchedGroups: { id: string; name: string }[] = [];
    for (const norm of normalizedUnique.values()) {
      const hit = normToGroup.get(norm);
      if (hit) {
        matchedGroups.push(hit);
      } else {
        missingInDatabase.push(norm);
      }
    }

    const existingIds = new Set(subject.groups.map((g) => g.id));
    for (const g of matchedGroups) {
      existingIds.add(g.id);
    }

    await this.prisma.subject.update({
      where: { id: subjectId },
      data: {
        groups: { set: [...existingIds].map((id) => ({ id })) },
      },
    });

    const refreshed = await this.prisma.subject.findFirst({
      where: { id: subjectId },
      include: { groups: { select: { id: true, name: true }, orderBy: { name: 'asc' } } },
    });

    return {
      linkedFromSchedule: matchedGroups.map((g) => g.name),
      missingInDatabase,
      codesDetectedInSchedule: codesRaw.map((c) => ({
        raw: c,
        normalized: normalizeLpnuGroupAbbrev(c),
      })),
      subjectGroups: refreshed?.groups ?? [],
      lpnuCached: schedule.cached,
      lpnuFetchedAt: schedule.fetchedAt,
    };
  }

  async getSubjectGroups(teacherId: string, subjectId: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, teacherId },
      include: { groups: { select: { id: true, name: true } } },
    });
    if (!subject) {
      throw new ForbiddenException('Subject not found or access denied');
    }
    return subject.groups;
  }

  async assertGroupAccessible(teacherId: string, groupId: string) {
    const n = await this.prisma.subject.count({
      where: { teacherId, groups: { some: { id: groupId } } },
    });
    if (!n) {
      throw new ForbiddenException('No access to this group');
    }
  }

  async assertStudentAccessible(teacherId: string, studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { groupId: true },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    await this.assertGroupAccessible(teacherId, student.groupId);
  }

  async listStudentsInGroup(teacherId: string, groupId: string) {
    await this.assertGroupAccessible(teacherId, groupId);
    return this.prisma.student.findMany({
      where: { groupId },
      include: {
        user: { select: { id: true, email: true, name: true, createdAt: true } },
      },
      orderBy: { user: { name: 'asc' } },
    });
  }

  async createStudent(teacherId: string, groupId: string, dto: CreateStudentDto) {
    await this.assertGroupAccessible(teacherId, groupId);
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const hashed = await bcrypt.hash(dto.password, SALT_ROUNDS);
    return this.prisma.student.create({
      data: {
        group: { connect: { id: groupId } },
        user: {
          create: {
            email: dto.email,
            name: dto.name,
            password: hashed,
            role: Role.STUDENT,
          },
        },
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
        group: { select: { id: true, name: true } },
      },
    });
  }

  async updateStudent(teacherId: string, studentId: string, dto: UpdateStudentDto) {
    await this.assertStudentAccessible(teacherId, studentId);
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { userId: true, groupId: true },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    if (dto.groupId && dto.groupId !== student.groupId) {
      await this.assertGroupAccessible(teacherId, dto.groupId);
    }
    if (dto.email) {
      const taken = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id: student.userId } },
      });
      if (taken) {
        throw new ConflictException('Email already in use');
      }
    }
    await this.prisma.user.update({
      where: { id: student.userId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.email && { email: dto.email }),
      },
    });
    if (dto.groupId) {
      await this.prisma.student.update({
        where: { id: studentId },
        data: { groupId: dto.groupId },
      });
    }
    return this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        group: { select: { id: true, name: true } },
      },
    });
  }

  async deleteStudent(teacherId: string, studentId: string) {
    await this.assertStudentAccessible(teacherId, studentId);
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { userId: true },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    await this.prisma.user.delete({ where: { id: student.userId } });
    return { deleted: true };
  }

  async setStudentProfilePhoto(teacherId: string, studentId: string, publicPath: string) {
    await this.assertStudentAccessible(teacherId, studentId);
    const updated = await this.prisma.student.update({
      where: { id: studentId },
      data: { profilePhotoUrl: publicPath },
      include: {
        user: { select: { id: true, email: true, name: true } },
        group: { select: { id: true, name: true } },
      },
    });
    await this.studentFaceEmbedding.refreshFromPublicPath(studentId, publicPath);
    return updated;
  }

  async createSession(teacherId: string, subjectId: string, dto: CreateSessionDto) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, teacherId },
    });
    if (!subject) {
      throw new ForbiddenException('Subject not found or access denied');
    }
    if (dto.groupId) {
      await this.assertSubjectHasGroup(teacherId, subjectId, dto.groupId);
    }
    return this.prisma.session.create({
      data: {
        subjectId,
        ...(dto.date && { date: new Date(dto.date) }),
        ...(dto.groupId && { groupId: dto.groupId }),
      },
    });
  }

  async listSessions(teacherId: string, subjectId: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, teacherId },
    });
    if (!subject) {
      throw new ForbiddenException('Subject not found or access denied');
    }
    return this.prisma.session.findMany({
      where: { subjectId },
      orderBy: { date: 'desc' },
      include: {
        group: { select: { id: true, name: true } },
        _count: { select: { attendances: true } },
      },
    });
  }

  /**
   * Sessions for a group across the teacher's subjects (for attendance reports).
   * Includes sessions explicitly tied to the group and legacy rows without groupId.
   */
  async listSessionsForGroup(teacherId: string, groupId: string) {
    await this.assertGroupAccessible(teacherId, groupId);
    const sessions = await this.prisma.session.findMany({
      where: {
        subject: {
          teacherId,
          groups: { some: { id: groupId } },
        },
        OR: [{ groupId }, { groupId: null }],
      },
      orderBy: { date: 'desc' },
      include: {
        subject: { select: { id: true, name: true } },
        attendances: { select: { status: true } },
      },
    });

    return sessions.map((s) => {
      let present = 0;
      let absent = 0;
      let late = 0;
      for (const a of s.attendances) {
        if (a.status === Status.PRESENT) present += 1;
        else if (a.status === Status.ABSENT) absent += 1;
        else if (a.status === Status.LATE) late += 1;
      }
      return {
        id: s.id,
        date: s.date.toISOString(),
        subjectId: s.subject.id,
        subjectName: s.subject.name,
        confirmed: s.confirmed,
        photoUrl: s.photoUrl,
        presentCount: present,
        absentCount: absent,
        lateCount: late,
        attendanceRecords: s.attendances.length,
      };
    });
  }

  async assertSessionOwnedByTeacher(teacherId: string, sessionId: string) {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, subject: { teacherId } },
      include: { subject: true },
    });
    if (!session) {
      throw new ForbiddenException('Session not found or access denied');
    }
    return session;
  }

  async getSessionAttendance(teacherId: string, sessionId: string) {
    const session = await this.assertSessionOwnedByTeacher(teacherId, sessionId);
    const rows = await this.prisma.attendance.findMany({
      where: { sessionId },
      include: {
        student: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            group: { select: { id: true, name: true } },
          },
        },
      },
    });
    const rowByStudent = new Map(rows.map((r) => [r.studentId, r]));

    let roster: {
      studentId: string;
      name: string;
      email: string;
      groupName?: string;
      status: Status;
      method: Method;
    }[];

    if (session.groupId) {
      const students = await this.prisma.student.findMany({
        where: { groupId: session.groupId },
        include: {
          user: { select: { name: true, email: true } },
          group: { select: { name: true } },
        },
        orderBy: { user: { name: 'asc' } },
      });
      roster = students.map((st) => {
        const r = rowByStudent.get(st.id);
        return {
          studentId: st.id,
          name: st.user.name,
          email: st.user.email,
          groupName: st.group.name,
          status: r?.status ?? Status.ABSENT,
          method: r?.method ?? Method.AUTO,
        };
      });
    } else {
      roster = rows
        .map((r) => ({
          studentId: r.studentId,
          name: r.student.user.name,
          email: r.student.user.email,
          groupName: r.student.group.name,
          status: r.status,
          method: r.method,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'uk'));
    }

    return { session, attendances: rows, roster };
  }

  async setManualAttendance(teacherId: string, sessionId: string, dto: SetManualAttendanceDto) {
    const session = await this.assertSessionOwnedByTeacher(teacherId, sessionId);
    if (session.confirmed) {
      throw new ConflictException('Session attendance is already confirmed');
    }
    const groupIds = await this.prisma.subject.findUnique({
      where: { id: session.subjectId },
      select: { groups: { select: { id: true } } },
    });
    const allowedGroups = new Set(groupIds?.groups.map((g) => g.id) ?? []);
    for (const r of dto.records) {
      const st = await this.prisma.student.findUnique({
        where: { id: r.studentId },
        select: { groupId: true },
      });
      if (!st || !allowedGroups.has(st.groupId)) {
        throw new ForbiddenException(`Student ${r.studentId} is not in this subject's groups`);
      }
      if (session.groupId && st.groupId !== session.groupId) {
        throw new ForbiddenException(`Student ${r.studentId} is not in this session's group`);
      }
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.attendance.deleteMany({ where: { sessionId } });
      if (dto.records.length) {
        await tx.attendance.createMany({
          data: dto.records.map((r) => ({
            sessionId,
            studentId: r.studentId,
            status: r.status,
            method: Method.MANUAL,
          })),
        });
      }
    });
    return this.getSessionAttendance(teacherId, sessionId);
  }

  async confirmSessionAttendance(teacherId: string, sessionId: string) {
    await this.assertSessionOwnedByTeacher(teacherId, sessionId);
    return this.prisma.session.update({
      where: { id: sessionId },
      data: { confirmed: true },
    });
  }

  /**
   * Після ML: повний список студентів обраних груп — присутні (AUTO) або відсутні (AUTO).
   */
  async syncRecognitionRollCall(sessionId: string, groupIds: string[], presentStudentIds: string[]) {
    const uniqGroupIds = [...new Set(groupIds)];
    if (uniqGroupIds.length === 0) {
      throw new BadRequestException('At least one group is required');
    }
    const students = await this.prisma.student.findMany({
      where: { groupId: { in: uniqGroupIds } },
      select: { id: true },
    });
    const inGroups = new Set(students.map((s) => s.id));
    for (const id of presentStudentIds) {
      if (!inGroups.has(id)) {
        throw new BadRequestException('Recognized student is not in the selected groups');
      }
    }
    const present = new Set(presentStudentIds);
    await this.prisma.$transaction(async (tx) => {
      await tx.attendance.deleteMany({ where: { sessionId } });
      if (students.length === 0) return;
      await tx.attendance.createMany({
        data: students.map((s) => ({
          sessionId,
          studentId: s.id,
          status: present.has(s.id) ? Status.PRESENT : Status.ABSENT,
          method: Method.AUTO,
        })),
      });
    });
  }

  async assertSubjectHasGroup(teacherId: string, subjectId: string, groupId: string) {
    const s = await this.prisma.subject.findFirst({
      where: {
        id: subjectId,
        teacherId,
        groups: { some: { id: groupId } },
      },
    });
    if (!s) {
      throw new ForbiddenException('Subject/group mismatch or access denied');
    }
    return s;
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { Status } from '../prisma/prisma-exports.js';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StudentService {
  constructor(private prisma: PrismaService) {}

  async resolveStudent(userId: string) {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: { user: { select: { id: true, email: true, name: true } }, group: true },
    });
    if (!student) {
      throw new NotFoundException('Student profile not found');
    }
    return student;
  }

  async getProfile(userId: string) {
    const student = await this.resolveStudent(userId);
    return {
      user: student.user,
      group: student.group,
      profilePhotoUrl: student.profilePhotoUrl,
      studentId: student.id,
    };
  }

  async getSchedule(userId: string) {
    const student = await this.resolveStudent(userId);
    return this.prisma.session.findMany({
      where: {
        subject: {
          groups: { some: { id: student.groupId } },
        },
      },
      orderBy: { date: 'desc' },
      include: {
        subject: {
          select: { id: true, name: true, teacher: { include: { user: { select: { name: true } } } } },
        },
      },
    });
  }

  async getAttendanceSummary(userId: string) {
    const student = await this.resolveStudent(userId);
    const records = await this.prisma.attendance.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: 'desc' },
      include: {
        session: {
          include: {
            subject: { select: { id: true, name: true } },
          },
        },
      },
    });
    const totalSessions = await this.prisma.session.count({
      where: {
        subject: {
          groups: { some: { id: student.groupId } },
        },
      },
    });
    const attended = records.filter((r) => r.status === Status.PRESENT || r.status === Status.LATE).length;
    const missed = records.filter((r) => r.status === Status.ABSENT).length;
    const bySubject = await this.prisma.subject.findMany({
      where: { groups: { some: { id: student.groupId } } },
      select: { id: true, name: true },
    });
    const stats = await Promise.all(
      bySubject.map(async (sub) => {
        const sessions = await this.prisma.session.findMany({
          where: { subjectId: sub.id },
          select: { id: true },
        });
        const sessionIds = sessions.map((s) => s.id);
        const att = await this.prisma.attendance.findMany({
          where: { studentId: student.id, sessionId: { in: sessionIds } },
        });
        const present = att.filter((a) => a.status !== Status.ABSENT).length;
        const total = sessions.length;
        const rate = total ? Math.round((present / total) * 100) : 0;
        return {
          subjectId: sub.id,
          subject: sub.name,
          totalClasses: total,
          attended: present,
          absent: total - present,
          rate,
        };
      }),
    );
    return {
      studentId: student.id,
      overall: {
        recordedSessions: records.length,
        totalSessionsInSubjects: totalSessions,
        attendedMarked: attended,
        absentMarked: missed,
        attendanceRateApprox:
          records.length > 0
            ? Math.round(((attended + (records.length - attended - missed)) / records.length) * 100)
            : null,
      },
      history: records,
      bySubject: stats,
    };
  }
}

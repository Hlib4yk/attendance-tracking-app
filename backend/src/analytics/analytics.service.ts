import { Injectable } from '@nestjs/common';
import { Method, Status } from '../prisma/prisma-exports.js';
import { PrismaService } from '../prisma/prisma.service';

export type AnalyticsStudentRow = {
  id: string;
  name: string;
  group: string;
  attendanceRate: number;
  status: string;
};

export type AnalyticsGroupRow = {
  name: string;
  groupId: string;
  students: AnalyticsStudentRow[];
  averageAttendance: number;
};

export type AnalyticsStatCard = {
  label: string;
  value: string;
  change: string;
  color: string;
};

export type AnalyticsPayload = {
  groups: AnalyticsGroupRow[];
  stats: AnalyticsStatCard[];
  autoRecognizedPercent: number | null;
  manualPercent: number | null;
};

function statusFromRate(rate: number): string {
  if (rate >= 98) return 'Perfect';
  if (rate >= 95) return 'Excellent';
  if (rate >= 85) return 'Great';
  if (rate >= 75) return 'Average';
  return 'Needs Attention';
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  adminOverview(): Promise<AnalyticsPayload> {
    return this.build({});
  }

  teacherOverview(teacherId: string): Promise<AnalyticsPayload> {
    return this.build({ teacherId });
  }

  private async build(opts: { teacherId?: string }): Promise<AnalyticsPayload> {
    const teacherId = opts.teacherId;

    let groups = await this.prisma.group.findMany({
      orderBy: { name: 'asc' },
      include: {
        students: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    if (teacherId) {
      const teacher = await this.prisma.teacher.findUnique({
        where: { id: teacherId },
        include: { subjects: { include: { groups: { select: { id: true } } } } },
      });
      if (!teacher) {
        return {
          groups: [],
          stats: this.emptyStats(),
          autoRecognizedPercent: null,
          manualPercent: null,
        };
      }
      const allowed = new Set<string>();
      for (const s of teacher.subjects) {
        for (const g of s.groups) {
          allowed.add(g.id);
        }
      }
      groups = groups.filter((g) => allowed.has(g.id));
    }

    const groupPayloads: AnalyticsGroupRow[] = await Promise.all(
      groups.map(async (g) => {
        const sessions = await this.prisma.session.findMany({
          where: {
            subject: {
              groups: { some: { id: g.id } },
              ...(teacherId ? { teacherId } : {}),
            },
          },
          select: { id: true },
        });
        const sessionIds = sessions.map((s) => s.id);
        const totalSessions = sessionIds.length;

        const students: AnalyticsStudentRow[] = await Promise.all(
          g.students.map(async (st) => {
            if (totalSessions === 0) {
              return {
                id: st.id,
                name: st.user.name,
                group: g.name,
                attendanceRate: 0,
                status: statusFromRate(0),
              };
            }
            const present = await this.prisma.attendance.count({
              where: {
                studentId: st.id,
                sessionId: { in: sessionIds },
                status: { in: [Status.PRESENT, Status.LATE] },
              },
            });
            const rate = Math.round((present / totalSessions) * 100);
            return {
              id: st.id,
              name: st.user.name,
              group: g.name,
              attendanceRate: rate,
              status: statusFromRate(rate),
            };
          }),
        );

        const sorted = [...students].sort((a, b) => b.attendanceRate - a.attendanceRate);
        const averageAttendance =
          sorted.length > 0
            ? Math.round(sorted.reduce((acc, s) => acc + s.attendanceRate, 0) / sorted.length)
            : 0;

        return {
          name: g.name,
          groupId: g.id,
          students: sorted,
          averageAttendance,
        };
      }),
    );

    const attendanceRows = await this.prisma.attendance.findMany({
      where: teacherId ? { session: { subject: { teacherId } } } : undefined,
      select: { method: true },
    });
    let autoRecognizedPercent: number | null = null;
    let manualPercent: number | null = null;
    if (attendanceRows.length > 0) {
      const autoN = attendanceRows.filter((a) => a.method === Method.AUTO).length;
      autoRecognizedPercent = Math.round((autoN / attendanceRows.length) * 100);
      manualPercent = 100 - autoRecognizedPercent;
    }

    const allStudents = groupPayloads.flatMap((g) => g.students);
    const overall =
      allStudents.length > 0
        ? Math.round(allStudents.reduce((a, s) => a + s.attendanceRate, 0) / allStudents.length)
        : null;

    const lowPresence = allStudents.filter((s) => s.attendanceRate < 75).length;

    const sessionCount = await this.prisma.session.count({
      where: teacherId ? { subject: { teacherId } } : undefined,
    });

    const stats: AnalyticsStatCard[] = [
      {
        label: 'Загальна відвідуваність',
        value: overall != null ? `${overall}%` : '—',
        change: allStudents.length ? `${allStudents.length} студентів у вибірці` : 'Немає студентів',
        color: 'text-indigo-600',
      },
      {
        label: 'Активні групи',
        value: String(groupPayloads.length),
        change: `${sessionCount} занять у системі`,
        color: 'text-slate-900',
      },
      {
        label: 'Авто-облік',
        value: autoRecognizedPercent != null ? `${autoRecognizedPercent}%` : '—',
        change: manualPercent != null ? `Вручну: ${manualPercent}%` : 'Немає записів відвідуваності',
        color: 'text-green-600',
      },
      {
        label: 'Низька присутність',
        value: String(lowPresence),
        change: 'Студенти з відсотком < 75%',
        color: 'text-rose-500',
      },
    ];

    return { groups: groupPayloads, stats, autoRecognizedPercent, manualPercent };
  }

  private emptyStats(): AnalyticsStatCard[] {
    return [
      {
        label: 'Загальна відвідуваність',
        value: '—',
        change: 'Немає даних',
        color: 'text-slate-900',
      },
      {
        label: 'Активні групи',
        value: '0',
        change: '—',
        color: 'text-slate-900',
      },
      {
        label: 'Авто-облік',
        value: '—',
        change: '—',
        color: 'text-green-600',
      },
      {
        label: 'Низька присутність',
        value: '0',
        change: '—',
        color: 'text-rose-500',
      },
    ];
  }
}

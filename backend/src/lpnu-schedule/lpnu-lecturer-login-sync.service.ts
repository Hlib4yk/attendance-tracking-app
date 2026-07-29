import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LpnuScheduleService } from './lpnu-schedule.service';
import { buildMergedLecturerBootstrap, normSubjectKey } from './lpnu-lecturer-bootstrap.parse';
import { normalizeLpnuGroupAbbrev } from './lpnu-group-codes';

@Injectable()
export class LpnuLecturerLoginSyncService {
  private readonly logger = new Logger(LpnuLecturerLoginSyncService.name);

  constructor(
    private prisma: PrismaService,
    private lpnu: LpnuScheduleService,
  ) {}

  /**
   * За розкладом LPNU створює предмети та групи для викладача й зв’язує їх.
   * Викликати після успішної перевірки пароля; при помилці LPNU — лише лог у AuthService.
   */
  async syncOnTeacherLogin(user: {
    id: string;
    role: string;
    name: string;
    teacherId: string;
  }): Promise<{ createdSubjects: number; createdGroups: number; subjectCount: number }> {
    const ctx = { id: user.id, role: user.role, name: user.name };

    const [half1, half2] = await Promise.all([
      this.lpnu.lecturerSchedule(ctx, {
        teachername: user.name,
        semestr: 'All',
        semestrduration: '1',
      }),
      this.lpnu.lecturerSchedule(ctx, {
        teachername: user.name,
        semestr: 'All',
        semestrduration: '2',
      }),
    ]);

    const slots = [...half1.slots, ...half2.slots];
    if (!slots.length) {
      this.logger.log(`LPNU login sync: порожній розклад для «${user.name}»`);
      return { createdSubjects: 0, createdGroups: 0, subjectCount: 0 };
    }

    const { subjects: merged, groupNormToLabel } = buildMergedLecturerBootstrap(slots);
    if (merged.size === 0) {
      return { createdSubjects: 0, createdGroups: 0, subjectCount: 0 };
    }

    let createdSubjects = 0;
    let createdGroups = 0;

    await this.prisma.$transaction(async (tx) => {
      const allGroups = await tx.group.findMany({ select: { id: true, name: true } });
      const normToGroup = new Map<string, { id: string; name: string }>();
      for (const g of allGroups) {
        const n = normalizeLpnuGroupAbbrev(g.name);
        if (!normToGroup.has(n)) {
          normToGroup.set(n, g);
        }
      }

      const allNormsNeeded = new Set<string>();
      for (const { groupNorms } of merged.values()) {
        for (const n of groupNorms) {
          allNormsNeeded.add(n);
        }
      }

      for (const norm of allNormsNeeded) {
        if (normToGroup.has(norm)) continue;
        const label = groupNormToLabel.get(norm) ?? norm;
        const created = await tx.group.create({ data: { name: label } });
        normToGroup.set(norm, created);
        createdGroups += 1;
      }

      const existingSubjects = await tx.subject.findMany({
        where: { teacherId: user.teacherId },
        include: { groups: { select: { id: true } } },
      });
      const byNorm = new Map(
        existingSubjects.map((s) => [normSubjectKey(s.name), s] as const),
      );

      for (const [subKey, { displayName, groupNorms }] of merged.entries()) {
        let sub = byNorm.get(subKey);
        if (!sub) {
          sub = await tx.subject.create({
            data: {
              name: displayName,
              teacherId: user.teacherId,
            },
            include: { groups: { select: { id: true } } },
          });
          byNorm.set(subKey, sub);
          createdSubjects += 1;
        }

        const groupIds = new Set(sub.groups.map((g) => g.id));
        for (const gn of groupNorms) {
          const row = normToGroup.get(gn);
          if (row) {
            groupIds.add(row.id);
          }
        }

        const updated = await tx.subject.update({
          where: { id: sub.id },
          data: {
            groups: { set: [...groupIds].map((id) => ({ id })) },
          },
          include: { groups: { select: { id: true } } },
        });
        byNorm.set(subKey, updated);
      }
    });

    const subjectCount = await this.prisma.subject.count({ where: { teacherId: user.teacherId } });
    this.logger.log(
      `LPNU login sync: user ${user.id} — нових предметів ${createdSubjects}, нових груп ${createdGroups}, всього предметів ${subjectCount}`,
    );
    return { createdSubjects, createdGroups, subjectCount };
  }
}

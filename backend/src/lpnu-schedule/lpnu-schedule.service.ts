import { BadGatewayException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../prisma/prisma-exports.js';
import { parseLpnuScheduleHtml, type LpnuScheduleSlot } from './lpnu-schedule.parser';
import type { LpnuStudentScheduleQueryDto } from './dto/lpnu-student-schedule.query.dto';
import type { LpnuLecturerScheduleQueryDto } from './dto/lpnu-lecturer-schedule.query.dto';

const STUDENT_BASE = 'https://student.lpnu.ua/students_schedule';
const LECTURER_BASE = 'https://staff.lpnu.ua/lecturer_schedule';

type LpnuSource = 'student' | 'lecturer';

type CachedPayload = {
  slots: LpnuScheduleSlot[];
  params: Record<string, string>;
  fetchedAt: string;
};

function cacheTtlMs(): number {
  const raw = process.env.LPNU_SCHEDULE_CACHE_TTL_SEC;
  const sec = raw != null && raw !== '' ? Number(raw) : 4 * 60 * 60;
  if (!Number.isFinite(sec)) return 4 * 60 * 60 * 1000;
  const clamped = Math.min(Math.max(Math.floor(sec), 60), 6 * 60 * 60);
  return clamped * 1000;
}

function normGroup(s: string): string {
  return s.trim().replace(/\s+/g, '').toLocaleUpperCase('uk');
}

function normTeacherName(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

@Injectable()
export class LpnuScheduleService {
  private readonly logger = new Logger(LpnuScheduleService.name);

  constructor(private prisma: PrismaService) {}

  private hashKey(source: LpnuSource, params: Record<string, string>): string {
    const sorted = Object.keys(params)
      .sort()
      .reduce<Record<string, string>>((acc, k) => {
        acc[k] = params[k];
        return acc;
      }, {});
    const stable = JSON.stringify({ source, params: sorted });
    return createHash('sha256').update(stable).digest('hex');
  }

  private async loadFromNetwork(url: string): Promise<string> {
    const res = await fetch(url, {
      headers: {
        'User-Agent': process.env.LPNU_HTTP_USER_AGENT ?? 'DiplomaScheduleAdapter/1.0 (+edu project)',
        'Accept-Language': 'uk-UA,uk;q=0.9',
      },
    });
    if (!res.ok) {
      throw new BadGatewayException(`LPNU responded with HTTP ${res.status}`);
    }
    return res.text();
  }

  private async getOrFetch(source: LpnuSource, params: Record<string, string>): Promise<{
    slots: LpnuScheduleSlot[];
    params: Record<string, string>;
    fetchedAt: string;
    expiresAt: Date;
    fromCache: boolean;
  }> {
    const key = this.hashKey(source, params);
    const now = new Date();
    const hit = await this.prisma.lpnuScheduleCache.findUnique({ where: { cacheKey: key } });
    if (hit && hit.expiresAt > now) {
      const p = hit.payload as CachedPayload;
      return {
        slots: p.slots,
        params: p.params,
        fetchedAt: p.fetchedAt,
        expiresAt: hit.expiresAt,
        fromCache: true,
      };
    }

    const target = new URL(source === 'student' ? STUDENT_BASE : LECTURER_BASE);
    for (const [k, v] of Object.entries(params)) {
      target.searchParams.set(k, v);
    }

    this.logger.log(`LPNU fetch: ${source} ${target.toString()}`);
    const html = await this.loadFromNetwork(target.toString());
    const slots = parseLpnuScheduleHtml(html);
    const fetchedAt = new Date().toISOString();
    const payload: CachedPayload = { slots, params: { ...params }, fetchedAt };
    const expiresAt = new Date(Date.now() + cacheTtlMs());

    await this.prisma.lpnuScheduleCache.upsert({
      where: { cacheKey: key },
      create: { cacheKey: key, source, payload: payload as object, expiresAt },
      update: { payload: payload as object, expiresAt },
    });

    return { slots, params: { ...params }, fetchedAt, expiresAt, fromCache: false };
  }

  async studentSchedule(
    user: { id: string; role: string },
    q: LpnuStudentScheduleQueryDto,
  ) {
    if (user.role === Role.STUDENT) {
      const student = await this.prisma.student.findUnique({
        where: { userId: user.id },
        include: { group: true },
      });
      if (!student) throw new ForbiddenException('Student profile not found');
      if (normGroup(q.studygroup_abbrname) !== normGroup(student.group.name)) {
        throw new ForbiddenException('Група в запиті не збігається з вашим профілем');
      }
    } else if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Недостатньо прав');
    }

    const params: Record<string, string> = {
      studygroup_abbrname: q.studygroup_abbrname.trim(),
      semestr: q.semestr,
      semestrduration: q.semestrduration,
    };

    const r = await this.getOrFetch('student', params);
    return {
      source: 'student' as const,
      slots: r.slots,
      params: r.params,
      fetchedAt: r.fetchedAt,
      cached: r.fromCache,
      expiresAt: r.expiresAt.toISOString(),
      officialUrl: `${STUDENT_BASE}?${new URLSearchParams(params).toString()}`,
    };
  }

  async lecturerSchedule(
    user: { id: string; role: string; name: string },
    q: LpnuLecturerScheduleQueryDto,
  ) {
    if (user.role === Role.TEACHER) {
      if (normTeacherName(q.teachername) !== normTeacherName(user.name)) {
        throw new ForbiddenException('ПІБ у запиті має збігатися з вашим профілем (як на сайті LPNU)');
      }
    } else if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Недостатньо прав');
    }

    const params: Record<string, string> = {
      teachername: q.teachername.trim(),
      semestr: q.semestr,
      semestrduration: q.semestrduration,
    };

    const r = await this.getOrFetch('lecturer', params);
    return {
      source: 'lecturer' as const,
      slots: r.slots,
      params: r.params,
      fetchedAt: r.fetchedAt,
      cached: r.fromCache,
      expiresAt: r.expiresAt.toISOString(),
      officialUrl: `${LECTURER_BASE}?${new URLSearchParams(params).toString()}`,
    };
  }
}

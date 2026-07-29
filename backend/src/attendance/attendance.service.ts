import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Status } from '../prisma/prisma-exports.js';
import { PrismaService } from '../prisma/prisma.service';
import { TeacherService } from '../teacher/teacher.service';
import { FaceClientService } from '../face/face-client.service';

type RecognitionHit = {
  studentId: string;
  name: string;
  email: string;
  /** Cosine similarity for InsightFace / 0–1 style for mock */
  confidence: number;
};

type AttendanceEngine = 'insightface' | 'mock';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private prisma: PrismaService,
    private teacher: TeacherService,
    private faceClient: FaceClientService,
  ) {}

  async processAttendanceImage(
    photoUrl: string,
    subjectId: string,
    groupIds: string[],
    teacherUserId: string,
    existingSessionId?: string,
  ) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { userId: teacherUserId },
    });
    if (!teacher) {
      throw new ForbiddenException('Teacher profile not found');
    }

    const uniqGroupIds = [...new Set(groupIds)];
    if (uniqGroupIds.length === 0) {
      throw new BadRequestException('At least one group is required');
    }
    for (const gid of uniqGroupIds) {
      await this.teacher.assertSubjectHasGroup(teacher.id, subjectId, gid);
    }

    const sessionGroupId = uniqGroupIds.length === 1 ? uniqGroupIds[0] : null;

    let session: { id: string; subjectId: string; confirmed: boolean };

    if (existingSessionId) {
      const s = await this.teacher.assertSessionOwnedByTeacher(teacher.id, existingSessionId);
      if (s.subjectId !== subjectId) {
        throw new BadRequestException('sessionId does not belong to this subject');
      }
      if (s.confirmed) {
        throw new ConflictException('Cannot modify a confirmed session');
      }
      session = await this.prisma.session.update({
        where: { id: existingSessionId },
        data: { photoUrl, groupId: sessionGroupId },
      });
    } else {
      session = await this.prisma.session.create({
        data: {
          subjectId,
          photoUrl,
          groupId: sessionGroupId,
        },
      });
    }

    this.logger.log(`Processing attendance for session ${session.id}`);

    const started = Date.now();
    const groupStudents = await this.prisma.student.findMany({
      where: { groupId: { in: uniqGroupIds } },
      select: {
        id: true,
        faceEmbedding: true,
        user: { select: { name: true, email: true } },
      },
    });

    let recognitions: RecognitionHit[];
    let engine: AttendanceEngine = 'mock';
    let message: string;

    const prototypes = groupStudents
      .filter((s) => s.faceEmbedding)
      .map((s) => ({
        id: s.id,
        embedding: JSON.parse(s.faceEmbedding!) as number[],
      }));

    const useInsightface =
      this.faceClient.isEnabled() && prototypes.length > 0 && photoUrl.startsWith('/uploads/');

    if (useInsightface) {
      try {
        const diskPath = join(process.cwd(), ...photoUrl.split('/').filter(Boolean));
        const buf = await readFile(diskPath);
        const matches = await this.faceClient.matchAudience(
          buf,
          prototypes,
          this.faceClient.getMatchThreshold(),
        );
        recognitions = this.hitsFromInsightMatches(matches, groupStudents);
        engine = 'insightface';
        message = 'Attendance processed using face embeddings (InsightFace).';
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(`InsightFace matching failed, falling back to mock: ${msg}`);
        recognitions = await this.mockAiRecognition(uniqGroupIds);
        message =
          'Face matching failed (InsightFace); used mock recognition. Check face-service logs and photo quality.';
      }
    } else {
      recognitions = await this.mockAiRecognition(uniqGroupIds);
      if (this.faceClient.isEnabled() && prototypes.length === 0) {
        message =
          'Mock recognition: no students in the selected groups have stored face embeddings yet. Upload profile photos while the face service is running.';
      } else if (!this.faceClient.isEnabled()) {
        message =
          'Mock recognition: set FACE_SERVICE_URL and run the face-service for real matching.';
      } else {
        message = 'Mock recognition (unexpected photo path or configuration).';
      }
    }

    const recognizedStudentIds = recognitions.map((r) => r.studentId);

    await this.teacher.syncRecognitionRollCall(session.id, uniqGroupIds, recognizedStudentIds);

    const totalStudents = await this.prisma.student.count({
      where: { groupId: { in: uniqGroupIds } },
    });
    const presentCount = await this.prisma.attendance.count({
      where: { sessionId: session.id, status: Status.PRESENT },
    });
    const absentCount = await this.prisma.attendance.count({
      where: { sessionId: session.id, status: Status.ABSENT },
    });

    return {
      message,
      sessionId: session.id,
      photoUrl,
      engine,
      recognitions,
      recognizedStudentIds,
      presentCount,
      absentCount,
      totalStudents,
      recognizedCount: presentCount,
      processingMs: Date.now() - started,
    };
  }

  private hitsFromInsightMatches(
    matches: { id: string; confidence: number }[],
    groupStudents: {
      id: string;
      user: { name: string; email: string };
    }[],
  ): RecognitionHit[] {
    const byId = new Map(groupStudents.map((s) => [s.id, s]));
    return matches
      .map((m) => {
        const s = byId.get(m.id);
        return {
          studentId: m.id,
          name: s?.user.name ?? '?',
          email: s?.user.email ?? '?',
          confidence: Math.round(m.confidence * 1000) / 1000,
        };
      })
      .sort((a, b) => b.confidence - a.confidence);
  }

  private async mockAiRecognition(groupIds: string[]): Promise<RecognitionHit[]> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const students = await this.prisma.student.findMany({
      where: { groupId: { in: groupIds } },
      select: {
        id: true,
        user: { select: { name: true, email: true } },
      },
    });
    if (students.length === 0) {
      return [];
    }
    const take = Math.min(5, Math.max(1, Math.ceil(students.length * 0.6)));
    const shuffled = [...students].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, take);

    const rnd = () => 0.72 + Math.random() * 0.26;

    return picked
      .map((s) => ({
        studentId: s.id,
        name: s.user.name,
        email: s.user.email,
        confidence: Math.round(rnd() * 1000) / 1000,
      }))
      .sort((a, b) => b.confidence - a.confidence);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { FaceClientService } from './face-client.service';

@Injectable()
export class StudentFaceEmbeddingService {
  private readonly logger = new Logger(StudentFaceEmbeddingService.name);

  constructor(
    private prisma: PrismaService,
    private faceClient: FaceClientService,
  ) {}

  /** Best-effort: store `Student.faceEmbedding` from the profile image at `publicPath` when face-service is enabled. */
  async refreshFromPublicPath(studentId: string, publicPath: string): Promise<void> {
    if (!this.faceClient.isEnabled()) {
      return;
    }
    const diskPath = join(process.cwd(), ...publicPath.split('/').filter(Boolean));
    try {
      const buf = await readFile(diskPath);
      const embedding = await this.faceClient.embedOneFace(buf);
      if (!embedding?.length) {
        this.logger.warn(`No face embedding for student ${studentId} (no face or service rejected)`);
        return;
      }
      await this.prisma.student.update({
        where: { id: studentId },
        data: { faceEmbedding: JSON.stringify(embedding) },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Face embedding refresh failed for student ${studentId}: ${msg}`);
    }
  }
}

import {
  BadRequestException,
  ConflictException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '../prisma/prisma-exports.js';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { unlink } from 'node:fs/promises';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/request-user';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AttendanceService } from './attendance.service';

function parseRecognizeGroupIds(groupId: string | undefined, groupIdsRaw: string | undefined): string[] {
  if (groupIdsRaw != null && String(groupIdsRaw).trim() !== '') {
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(groupIdsRaw));
    } catch {
      throw new BadRequestException('groupIds must be valid JSON array');
    }
    const ids = [
      ...new Set(
        (parsed as string[])
          .map((s) => String(s).trim())
          .filter((s) => s.length > 0),
      ),
    ];
    if (ids.length === 0) {
      throw new BadRequestException('groupIds must not be empty');
    }
    return ids;
  }
  if (groupId != null && String(groupId).trim() !== '') {
    return [String(groupId).trim()];
  }
  throw new BadRequestException('groupId or groupIds is required');
}

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('recognize')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.TEACHER)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          cb(null, join(process.cwd(), 'uploads', 'sessions'));
        },
        filename: (_req, file, cb) => {
          const safe = `${Date.now()}${extname(file.originalname)}`.replace(/[^a-zA-Z0-9.]/g, '');
          cb(null, safe || 'photo.jpg');
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadAndRecognize(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: Express.Multer.File,
    @Body('subjectId') subjectId: string,
    @Body('groupId') groupId?: string,
    @Body('groupIds') groupIdsRaw?: string,
    @Body('sessionId') sessionId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }
    if (!subjectId) {
      throw new BadRequestException('subjectId is required');
    }
    const groupIds = parseRecognizeGroupIds(groupId, groupIdsRaw);
    if (!user.id) {
      throw new BadRequestException('User missing');
    }

    const allowedMime = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowedMime.has(file.mimetype)) {
      try {
        await unlink(file.path);
      } catch {
        /* ignore */
      }
      throw new BadRequestException('Only JPEG, PNG and WebP images are allowed');
    }

    const photoUrl = `/uploads/sessions/${file.filename}`;
    return await this.attendanceService.processAttendanceImage(
      photoUrl,
      subjectId,
      groupIds,
      user.id,
      sessionId,
    );
  }
}

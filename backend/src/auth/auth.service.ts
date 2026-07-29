import { unlink } from 'node:fs/promises';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../prisma/prisma-exports.js';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterStudentMultipartDto } from './dto/register-student-multipart.dto';
import { LpnuLecturerLoginSyncService } from '../lpnu-schedule/lpnu-lecturer-login-sync.service';
import { StudentFaceEmbeddingService } from '../face/student-face-embedding.service';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private lpnuLecturerLoginSync: LpnuLecturerLoginSyncService,
    private studentFaceEmbedding: StudentFaceEmbeddingService,
  ) {}

  async register(dto: RegisterDto) {
    const emailNorm = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email: emailNorm } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const role = dto.role ?? Role.STUDENT;
    if (role === Role.ADMIN) {
      throw new ConflictException('Cannot register as admin via public API');
    }

    const hashed = await bcrypt.hash(dto.password, SALT_ROUNDS);

    if (role === Role.STUDENT) {
      if (!dto.groupId) {
        throw new BadRequestException('groupId is required for student registration');
      }
      const group = await this.prisma.group.findUnique({ where: { id: dto.groupId } });
      if (!group) {
        throw new BadRequestException('Group not found');
      }
      const user = await this.prisma.user.create({
        data: {
          email: emailNorm,
          name: dto.name,
          password: hashed,
          role: Role.STUDENT,
          student: {
            create: { groupId: dto.groupId },
          },
        },
        include: { student: true, teacher: true },
      });
      return this.withToken(user);
    }

    const code = dto.inviteToken?.trim();
    if (!code) {
      throw new BadRequestException('inviteToken is required for teacher registration');
    }

    return this.prisma.$transaction(async (tx) => {
      const invite = await tx.teacherInvite.findUnique({ where: { token: code } });
      if (!invite) {
        throw new BadRequestException('Invalid or expired invite link');
      }
      if (invite.usedAt) {
        throw new BadRequestException('Invite link already used');
      }
      if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
        throw new BadRequestException('Invite link expired');
      }
      if (invite.invitedEmail !== emailNorm) {
        throw new BadRequestException('Email must match the address the invite was sent to');
      }

      const user = await tx.user.create({
        data: {
          email: emailNorm,
          name: dto.name,
          password: hashed,
          role: Role.TEACHER,
          teacher: { create: {} },
        },
        include: { student: true, teacher: true },
      });

      await tx.teacherInvite.update({
        where: { id: invite.id },
        data: { usedAt: new Date(), usedByUserId: user.id },
      });

      return this.withToken(user);
    });
  }

  /** Student self-signup with profile photo (used for `faceEmbedding` when face-service is enabled). */
  async registerStudentWithPhoto(dto: RegisterStudentMultipartDto, file: Express.Multer.File) {
    const publicPath = `/uploads/students/${file.filename}`;
    const emailNorm = dto.email.trim().toLowerCase();
    try {
      const existing = await this.prisma.user.findUnique({ where: { email: emailNorm } });
      if (existing) {
        throw new ConflictException('Email already registered');
      }
      const group = await this.prisma.group.findUnique({ where: { id: dto.groupId } });
      if (!group) {
        throw new BadRequestException('Group not found');
      }
      const hashed = await bcrypt.hash(dto.password, SALT_ROUNDS);
      const user = await this.prisma.user.create({
        data: {
          email: emailNorm,
          name: dto.name,
          password: hashed,
          role: Role.STUDENT,
          student: {
            create: {
              groupId: dto.groupId,
              profilePhotoUrl: publicPath,
            },
          },
        },
        include: { student: true, teacher: true },
      });
      if (user.student) {
        await this.studentFaceEmbedding.refreshFromPublicPath(user.student.id, publicPath);
      }
      return this.withToken(user);
    } catch (e) {
      try {
        await unlink(file.path);
      } catch {
        /* ignore */
      }
      throw e;
    }
  }

  /** Lets the registration form pre-fill email; token is only sent to the invitee. */
  async previewTeacherInvite(tokenRaw: string | undefined) {
    const token = tokenRaw?.trim();
    if (!token) {
      throw new BadRequestException('token is required');
    }
    const invite = await this.prisma.teacherInvite.findUnique({ where: { token } });
    if (!invite || invite.usedAt) {
      throw new BadRequestException('Invalid or used invite link');
    }
    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Invite link expired');
    }
    return { invitedEmail: invite.invitedEmail };
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { student: true, teacher: true },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(dto.password, user.password);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.role === Role.TEACHER && user.teacher) {
      try {
        await this.lpnuLecturerLoginSync.syncOnTeacherLogin({
          id: user.id,
          role: user.role,
          name: user.name,
          teacherId: user.teacher.id,
        });
      } catch (e) {
        this.logger.warn(`Не вдалося синхронізувати предмети/групи з LPNU під час входу (${email})`, e);
      }
    }

    return this.withToken(user);
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        student: {
          select: {
            id: true,
            groupId: true,
            profilePhotoUrl: true,
            group: { select: { id: true, name: true } },
          },
        },
        teacher: {
          select: { id: true },
        },
      },
    });
  }

  private withToken(user: {
    id: string;
    role: Role;
    email: string;
    name: string;
    student?: { id: string; groupId: string } | null;
    teacher?: { id: string } | null;
  }) {
    const payload = { sub: user.id, role: user.role };
    return {
      access_token: this.jwt.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        teacherId: user.teacher?.id,
        studentId: user.student?.id,
        groupId: user.student?.groupId,
      },
    };
  }
}

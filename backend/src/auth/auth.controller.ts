import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { unlink } from 'node:fs/promises';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import type { RequestUser } from './request-user';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterStudentMultipartDto } from './dto/register-student-multipart.dto';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Get('teacher-invite-preview')
  teacherInvitePreview(@Query('token') token: string) {
    return this.auth.previewTeacherInvite(token);
  }

  @Post('register/student')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          cb(null, join(process.cwd(), 'uploads', 'students'));
        },
        filename: (_req, file, cb) => {
          const safe = `reg-${Date.now()}${extname(file.originalname)}`.replace(/[^a-zA-Z0-9.]/g, '');
          cb(null, safe || 'photo.jpg');
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async registerStudent(
    @Body() dto: RegisterStudentMultipartDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
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
    return this.auth.registerStudentWithPhoto(dto, file);
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@CurrentUser() user: RequestUser) {
    return this.auth.getMe(user.id);
  }
}

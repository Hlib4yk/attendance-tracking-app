import { IsEmail, IsEnum, IsOptional, IsString, IsUUID, MinLength, ValidateIf } from 'class-validator';
import { Role } from '../../prisma/prisma-exports.js';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  name: string;

  /** Defaults to STUDENT. TEACHER allowed for local/demo; restrict in production. */
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  /** Required when role is STUDENT */
  @IsOptional()
  @IsUUID()
  groupId?: string;

  /** Required when role is TEACHER — token from the email invite link */
  @ValidateIf((o) => o.role === Role.TEACHER)
  @IsString()
  @MinLength(40)
  inviteToken?: string;
}

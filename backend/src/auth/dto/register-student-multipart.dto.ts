import { IsEmail, IsString, IsUUID, MinLength } from 'class-validator';

/** Body fields for multipart `POST /auth/register/student` (file field: `image`). */
export class RegisterStudentMultipartDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsUUID()
  groupId: string;
}

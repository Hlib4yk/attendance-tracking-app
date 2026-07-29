import { IsString, IsUUID, MinLength } from 'class-validator';

export class CreateSubjectDto {
  @IsString()
  @MinLength(1)
  name: string;

  /** `User.id` of the teacher account */
  @IsUUID()
  teacherUserId: string;
}

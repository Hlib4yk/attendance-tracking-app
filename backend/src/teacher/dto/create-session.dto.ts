import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CreateSessionDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsUUID()
  groupId?: string;
}

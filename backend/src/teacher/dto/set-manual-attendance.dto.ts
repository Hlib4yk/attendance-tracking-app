import { IsArray, IsEnum, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Status } from '../../prisma/prisma-exports.js';

class AttendanceRowDto {
  @IsUUID()
  studentId: string;

  @IsEnum(Status)
  status: Status;
}

export class SetManualAttendanceDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceRowDto)
  records: AttendanceRowDto[];
}

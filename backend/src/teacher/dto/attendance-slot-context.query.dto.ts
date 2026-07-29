import { Type } from 'class-transformer';
import { IsIn, IsInt, IsString, Min } from 'class-validator';

export class AttendanceSlotContextQueryDto {
  @IsString()
  day!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  period!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  variant!: number;

  @IsIn(['All', '1', '2'])
  semestr!: 'All' | '1' | '2';

  @IsIn(['1', '2'])
  semestrduration!: '1' | '2';
}

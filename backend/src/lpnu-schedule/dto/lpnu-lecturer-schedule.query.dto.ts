import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class LpnuLecturerScheduleQueryDto {
  @IsString()
  @MinLength(5)
  @MaxLength(128)
  teachername!: string;

  @IsIn(['All', '1', '2'])
  semestr!: 'All' | '1' | '2';

  @IsIn(['1', '2'])
  semestrduration!: '1' | '2';
}

import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class LpnuStudentScheduleQueryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(128)
  studygroup_abbrname!: string;

  @IsIn(['1', '2'])
  semestr!: '1' | '2';

  @IsIn(['1', '2'])
  semestrduration!: '1' | '2';
}

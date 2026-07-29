import { IsIn } from 'class-validator';

export class LpnuSyncGroupsSemesterDto {
  @IsIn(['All', '1', '2'])
  semestr!: 'All' | '1' | '2';

  @IsIn(['1', '2'])
  semestrduration!: '1' | '2';
}

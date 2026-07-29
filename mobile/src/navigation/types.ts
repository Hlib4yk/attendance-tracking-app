import type { RouteProp } from '@react-navigation/native';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: { inviteToken?: string } | undefined;
};

export type StudentTabParamList = {
  StudentHome: undefined;
  StudentSchedule: undefined;
  StudentAttendance: undefined;
};

export type TeacherAttendanceParams = {
  day?: string;
  period?: string;
  variant?: string;
  semestr?: string;
  semestrduration?: string;
};

export type TeacherTabParamList = {
  TeacherHome: undefined;
  TeacherAttendance: TeacherAttendanceParams | undefined;
  TeacherSchedule: undefined;
  ReportsStack: undefined;
  Analytics: undefined;
};

export type ReportsStackParamList = {
  ReportsList: undefined;
  SessionDetail: { sessionId: string; subjectName: string };
};

export type TeacherAttendanceRoute = RouteProp<TeacherTabParamList, 'TeacherAttendance'>;


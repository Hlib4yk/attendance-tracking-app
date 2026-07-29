export type RequestUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  teacherId?: string;
  studentId?: string;
  groupId?: string;
};

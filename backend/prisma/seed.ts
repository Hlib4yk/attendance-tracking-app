import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role, Status, Method } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function upsertStudentInGroup(
  email: string,
  name: string,
  groupId: string,
  passwordHash: string,
) {
  const emailKey = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email: emailKey },
    include: { student: true },
  });
  if (!existing) {
    await prisma.user.create({
      data: {
        email: emailKey,
        name,
        password: passwordHash,
        role: Role.STUDENT,
        student: { create: { groupId } },
      },
    });
    return 'created';
  }
  if (existing.role !== Role.STUDENT || !existing.student) {
    throw new Error(`Користувач ${emailKey} вже існує, але не студент — виправте вручну.`);
  }
  await prisma.user.update({
    where: { id: existing.id },
    data: {
      name,
      password: passwordHash,
      student: { update: { groupId } },
    },
  });
  return 'updated';
}

async function upsertTeacherLpnu(email: string, name: string, passwordHash: string) {
  const emailKey = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { email: emailKey },
    include: { teacher: true },
  });
  if (!existing) {
    await prisma.user.create({
      data: {
        email: emailKey,
        name,
        password: passwordHash,
        role: Role.TEACHER,
        teacher: { create: {} },
      },
    });
    return 'created';
  }
  if (existing.role !== Role.TEACHER || !existing.teacher) {
    throw new Error(`Користувач ${emailKey} вже існує, але не TEACHER — виправте вручну.`);
  }
  await prisma.user.update({
    where: { id: existing.id },
    data: { name, password: passwordHash },
  });
  return 'updated';
}

async function ensureStudent(email: string, name: string, groupId: string, passwordHash: string) {
  const emailKey = email.trim().toLowerCase();
  const exists = await prisma.user.findUnique({ where: { email: emailKey } });
  if (exists) return;
  await prisma.user.create({
    data: {
      email: emailKey,
      name,
      password: passwordHash,
      role: Role.STUDENT,
      student: { create: { groupId } },
    },
  });
}

async function seedSessionsAndAttendance(subjectId: string, groupIds: [string, string]) {
  const existing = await prisma.session.count({ where: { subjectId } });
  if (existing > 0) return;

  const students = await prisma.student.findMany({
    where: { groupId: { in: groupIds } },
    orderBy: { id: 'asc' },
  });

  for (let i = 0; i < 5; i++) {
    const session = await prisma.session.create({
      data: {
        subjectId,
        date: new Date(Date.now() - i * 86_400_000 - i * 3_600_000),
        confirmed: true,
      },
    });

    let studentIdx = 0;
    for (const st of students) {
      const roll = (studentIdx + i * 2) % 7;
      const status = roll === 0 ? Status.ABSENT : roll === 1 ? Status.LATE : Status.PRESENT;
      const method = roll % 3 === 0 ? Method.MANUAL : Method.AUTO;
      await prisma.attendance.create({
        data: {
          studentId: st.id,
          sessionId: session.id,
          status,
          method,
        },
      });
      studentIdx++;
    }
  }
}

async function main() {
  const adminPwd = await bcrypt.hash('Password123!', 10);

  let admin = await prisma.user.findUnique({ where: { email: 'admin@univ.edu' } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: 'admin@univ.edu',
        name: 'System Admin',
        password: adminPwd,
        role: Role.ADMIN,
      },
    });
  }

  let teacherUser = await prisma.user.findUnique({
    where: { email: 'teacher@univ.edu' },
    include: { teacher: true },
  });
  if (!teacherUser) {
    teacherUser = await prisma.user.create({
      data: {
        email: 'teacher@univ.edu',
        name: 'Dr. Teacher',
        password: adminPwd,
        role: Role.TEACHER,
        teacher: { create: {} },
      },
      include: { teacher: true },
    });
  }
  const teacher = teacherUser.teacher!;
  if (!teacher) {
    throw new Error('Teacher row missing after seed');
  }

  let g1 = await prisma.group.findFirst({ where: { name: 'CS-401' } });
  if (!g1) {
    g1 = await prisma.group.create({ data: { name: 'CS-401' } });
  }

  let g2 = await prisma.group.findFirst({ where: { name: 'CS-402' } });
  if (!g2) {
    g2 = await prisma.group.create({ data: { name: 'CS-402' } });
  }

  let gOi44 = await prisma.group.findFirst({ where: { name: 'ОІ-44' } });
  if (!gOi44) {
    gOi44 = await prisma.group.create({ data: { name: 'ОІ-44' } });
  }

  let gOi32 = await prisma.group.findFirst({ where: { name: 'ОІ-32' } });
  if (!gOi32) {
    gOi32 = await prisma.group.create({ data: { name: 'ОІ-32' } });
  }

  let subject = await prisma.subject.findFirst({
    where: { teacherId: teacher.id, name: 'Artificial Intelligence' },
  });
  if (!subject) {
    subject = await prisma.subject.create({
      data: {
        name: 'Artificial Intelligence',
        teacherId: teacher.id,
        groups: { connect: [{ id: g1.id }, { id: g2.id }, { id: gOi44.id }, { id: gOi32.id }] },
      },
    });
  } else {
    const full = await prisma.subject.findUnique({
      where: { id: subject.id },
      include: { groups: { select: { id: true } } },
    });
    const have = new Set(full?.groups.map((h) => h.id) ?? []);
    const toConnect = [g1.id, g2.id, gOi44.id, gOi32.id].filter((id) => !have.has(id));
    if (toConnect.length) {
      await prisma.subject.update({
        where: { id: subject.id },
        data: { groups: { connect: toConnect.map((id) => ({ id })) } },
      });
    }
  }

  const studentPwd = await bcrypt.hash('Student123!', 10);

  const roster: { email: string; name: string; groupId: string }[] = [
    { email: 'student@univ.edu', name: 'Oleksandr Student', groupId: g1.id },
    { email: 'maria.shevchenko@univ.edu', name: 'Maria Shevchenko', groupId: g1.id },
    { email: 'dmytro.bondar@univ.edu', name: 'Dmytro Bondarenko', groupId: g1.id },
    { email: 'olena.tkach@univ.edu', name: 'Olena Tkachenko', groupId: g1.id },
    { email: 'andriy.moroz@univ.edu', name: 'Andriy Moroz', groupId: g1.id },
    { email: 'iryna.kr@univ.edu', name: 'Iryna Kravchenko', groupId: g1.id },
    { email: 'ivan.oliynyk@univ.edu', name: 'Ivan Oliynyk', groupId: g2.id },
    { email: 'natalia.shevchuk@univ.edu', name: 'Natalia Shevchuk', groupId: g2.id },
    { email: 'serhiy.polyshchuk@univ.edu', name: 'Serhiy Polishchuk', groupId: g2.id },
    { email: 'tetiana.lysenko@univ.edu', name: 'Tetiana Lysenko', groupId: g2.id },
  ];

  for (const row of roster) {
    await ensureStudent(row.email, row.name, row.groupId, studentPwd);
  }

  const testLpnuPwd = await bcrypt.hash('TestLpnu123!', 10);
  const testLpnuState = await upsertStudentInGroup(
    'test@example.com',
    'Тест LPNU Розклад',
    gOi44.id,
    testLpnuPwd,
  );

  /** Додаткові студенти в ОІ-44 для журналу / attendance (пароль як у інших тестових студентів). */
  const oi44Roster: { email: string; name: string }[] = [
    { email: 'oi44.kovalenko@univ.edu', name: 'Коваленко Андрій Миколайович' },
    { email: 'oi44.boyko@univ.edu', name: 'Бойко Олена Вікторівна' },
    { email: 'oi44.melnyk@univ.edu', name: 'Мельник Ігор Сергійович' },
    { email: 'oi44.savchenko@univ.edu', name: 'Савченко Наталія Олександрівна' },
    { email: 'oi44.lytvyn@univ.edu', name: 'Литвин Владислав Тарасович' },
    { email: 'oi44.gnatiuk@univ.edu', name: 'Гнатюк Софія Романівна' },
  ];
  for (const row of oi44Roster) {
    await upsertStudentInGroup(row.email, row.name, gOi44.id, studentPwd);
  }

  const oi32Roster: { email: string; name: string }[] = [
    { email: 'oi32.romaniuk@univ.edu', name: 'Романюк Дмитро Олегович' },
    { email: 'oi32.kravets@univ.edu', name: 'Кравець Марія Петрівна' },
    { email: 'oi32.panchuk@univ.edu', name: 'Панчук Євген Васильович' },
    { email: 'oi32.dubenko@univ.edu', name: 'Дубенко Анна Ігорівна' },
    { email: 'oi32.shvets@univ.edu', name: 'Швець Олег Максимович' },
    { email: 'oi32.honcharenko@univ.edu', name: 'Гончаренко Катерина Володимирівна' },
  ];
  for (const row of oi32Roster) {
    await upsertStudentInGroup(row.email, row.name, gOi32.id, studentPwd);
  }

  const lpnuLecturerState = await upsertTeacherLpnu(
    'lyashynskyi.lpnu@univ.edu',
    'Лящинський Петро Борисович',
    adminPwd,
  );
  await seedSessionsAndAttendance(subject.id, [g1.id, g2.id]);

  const stCount = await prisma.student.count();
  const sessCount = await prisma.session.count();

  console.log('Seed OK:', {
    admin: 'admin@univ.edu / Password123!',
    teacher: 'teacher@univ.edu / Password123!',
    students: `Student123! — ${roster.length} акаунтів (див. roster у seed.ts)`,
    lpnuScheduleTest: {
      email: 'test@example.com',
      password: 'TestLpnu123!',
      group: 'ОІ-44',
      state: testLpnuState,
      groupOi44ExtraStudents: oi44Roster.map((r) => r.email),
      groupOi44Password: 'Student123!',
      hint: 'GET /schedule/lpnu/student?studygroup_abbrname=ОІ-44&semestr=2&semestrduration=1',
    },
    groupOi32: {
      password: 'Student123!',
      students: oi32Roster.map((r) => r.email),
    },
    lpnuLecturerTest: {
      email: 'lyashynskyi.lpnu@univ.edu',
      password: 'Password123!',
      name: 'Лящинський Петро Борисович',
      state: lpnuLecturerState,
      page: '/teacher/schedule',
      hint:
        'cd backend && npx prisma db seed. API: GET /schedule/lpnu/lecturer?teachername=Лящинський Петро Борисович&semestr=2&semestrduration=1',
    },
    registerStudentGroupId: g1.id,
    subjectId: subject.id,
    teacherUserId: teacherUser.id,
    totals: { students: stCount, sessions: sessCount },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

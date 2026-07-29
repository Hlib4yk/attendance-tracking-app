'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, MapPin, ChevronRight, AlertCircle } from 'lucide-react';
import { apiFetch, fileUrl } from '@/lib/api';

type Me = {
  user: { name: string; email: string };
  group: { name: string };
  profilePhotoUrl: string | null;
};

type SessionRow = {
  id: string;
  date: string;
  subject: { id: string; name: string; teacher?: { user?: { name: string } | null } | null };
};

type AttendancePayload = {
  bySubject: {
    subject: string;
    rate: number;
    totalClasses: number;
    attended: number;
    absent: number;
  }[];
};

const BAR_COLORS = ['bg-indigo-600', 'bg-amber-500', 'bg-green-500', 'bg-rose-500', 'bg-blue-500'];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function StudentDashboard() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [schedule, setSchedule] = useState<SessionRow[]>([]);
  const [attendance, setAttendance] = useState<AttendancePayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const [mRes, sRes, aRes] = await Promise.all([
        apiFetch('/student/me'),
        apiFetch('/student/schedule'),
        apiFetch('/student/attendance'),
      ]);
      if (mRes.status === 401) {
        router.replace('/login');
        return;
      }
      if (mRes.ok) setMe((await mRes.json()) as Me);
      if (sRes.ok) setSchedule((await sRes.json()) as SessionRow[]);
      if (aRes.ok) setAttendance((await aRes.json()) as AttendancePayload);
      setLoading(false);
    })();
  }, [router]);

  if (loading || !me) {
    return <p className="text-slate-500 font-medium px-4">Завантаження…</p>;
  }

  const firstName = me.user.name.split(/\s+/)[0] ?? me.user.name;
  const now = new Date();
  const todaySessions = schedule.filter((s) => sameDay(new Date(s.date), now));
  const bySub = attendance?.bySubject ?? [];
  const withClasses = bySub.filter((b) => b.totalClasses > 0);
  const avgRate =
    withClasses.length > 0
      ? Math.round(withClasses.reduce((acc, b) => acc + b.rate, 0) / withClasses.length)
      : null;
  const worst = withClasses.reduce(
    (w, b) => (!w || b.rate < w.rate ? b : w),
    null as (typeof bySub)[0] | null,
  );

  const photo = fileUrl(me.profilePhotoUrl);

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          {photo ? (
            <img src={photo} alt="" className="w-14 h-14 rounded-2xl object-cover border border-slate-200" />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-black">
              {firstName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Вітаємо, {firstName}!</h1>
            <p className="text-slate-500 mt-1">
              Група <span className="font-bold text-slate-800">{me.group.name}</span>
              {todaySessions.length > 0 ? (
                <>
                  {' '}
                  · сьогодні <span className="font-bold text-indigo-600">{todaySessions.length}</span> занять у
                  розкладі даних
                </>
              ) : (
                <> · на сьогодні занять у базі немає</>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-4 bg-white p-2 rounded-2xl border border-slate-200">
          <div className="px-6 py-2 text-center border-r border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Середній %</p>
            <p className="text-xl font-black text-indigo-600">{avgRate != null ? `${avgRate}%` : '—'}</p>
          </div>
          <div className="px-6 py-2 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Предметів</p>
            <p className="text-xl font-black text-slate-900">{bySub.length}</p>
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xl font-bold">Заняття сьогодні (з БД)</h3>
            <Link href="/student/schedule" className="text-sm font-bold text-indigo-600 flex items-center gap-1">
              Усі дати <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {todaySessions.length === 0 ? (
            <p className="text-slate-500 text-sm">Немає сесій на сьогодні. Перегляньте повний розклад.</p>
          ) : (
            <div className="space-y-6">
              {todaySessions.map((item, i) => (
                <div key={item.id} className="flex gap-6 group">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full border-2 ${i === 0 ? 'bg-indigo-600 border-indigo-200' : 'bg-slate-200 border-white'}`}
                    />
                    {i !== todaySessions.length - 1 && <div className="w-0.5 flex-1 bg-slate-100 my-2" />}
                  </div>
                  <div className="flex-1 pb-8 last:pb-0">
                    <p className="text-sm font-black text-slate-400 font-mono tracking-tighter mb-3">
                      {new Date(item.date).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-all">
                      <h4 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {item.subject.name}
                      </h4>
                      <div className="flex flex-wrap gap-6 mt-4">
                        <div className="flex items-center gap-2 text-slate-500 text-xs">
                          <MapPin className="w-3 h-3" />
                          Аудиторія не задана
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 text-xs">
                          <Clock className="w-3 h-3" />
                          {item.subject.teacher?.user?.name ?? 'Викладач'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-8">
          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
            <h3 className="text-xl font-bold mb-8">Успішність за предметами</h3>
            <div className="space-y-6">
              {bySub.slice(0, 4).map((subject, i) => (
                <div key={subject.subject} className="space-y-3">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-sm font-bold text-slate-900 leading-none mb-1">{subject.subject}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">
                        {subject.attended} / {subject.totalClasses} занять
                      </p>
                    </div>
                    <span
                      className={`text-sm font-black ${subject.rate < 80 ? 'text-rose-500' : 'text-indigo-600'}`}
                    >
                      {subject.rate}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                    <div
                      className={`h-full transition-all duration-1000 ${BAR_COLORS[i % BAR_COLORS.length]}`}
                      style={{ width: `${subject.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <Link
              href="/student/attendance"
              className="w-full mt-8 py-3 bg-slate-50 text-slate-600 rounded-xl font-bold text-sm block text-center hover:bg-slate-100 transition-colors"
            >
              Детальний звіт
            </Link>
          </div>

          {worst && worst.rate < 85 && (
            <div className="bg-slate-900 rounded-[2rem] p-10 text-white shadow-2xl shadow-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold">Підказка</h3>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-8">
                Найнижча відвідуваність зараз:{' '}
                <span className="text-white font-bold">{worst.subject}</span> ({worst.rate}%).
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

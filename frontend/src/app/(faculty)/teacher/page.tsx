'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, BookOpen, Users } from 'lucide-react';
import { apiFetch, getToken } from '@/lib/api';

type Me = {
  name?: string;
  email?: string;
  role?: string;
};

type SubjectRow = {
  id: string;
  name: string;
  groups: { id: string; name: string }[];
};

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    let cancelled = false;
    void (async () => {
      const meRes = await apiFetch('/auth/me');
      if (cancelled) return;
      if (meRes.status === 401) {
        router.replace('/login');
        return;
      }
      const meJson = (await meRes.json()) as Me | null;
      if (meJson?.role === 'STUDENT') {
        router.replace('/student');
        return;
      }
      if (meJson?.role === 'ADMIN') {
        router.replace('/admin');
        return;
      }
      if (meJson?.role !== 'TEACHER') {
        router.replace('/login');
        return;
      }
      setMe(meJson);
      const subRes = await apiFetch('/teacher/subjects');
      if (cancelled) return;
      if (subRes.ok) {
        setSubjects((await subRes.json()) as SubjectRow[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading || !me) {
    return <p className="text-slate-500 font-medium">Завантаження…</p>;
  }

  const firstName = (me.name ?? me.email ?? 'Викладач').split(/\s+/)[0];
  const uniqueGroups = new Map<string, string>();
  for (const s of subjects) {
    for (const g of s.groups) {
      uniqueGroups.set(g.id, g.name);
    }
  }
  const groupCount = uniqueGroups.size;

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-lg">
            {firstName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Вітаємо, {firstName}!</h1>
            <p className="text-slate-500 mt-1">
              Кабінет викладача · предметів у системі:{' '}
              <span className="font-bold text-slate-800">{subjects.length}</span>
              {groupCount > 0 ? (
                <>
                  {' '}
                  · груп: <span className="font-bold text-indigo-600">{groupCount}</span>
                </>
              ) : null}
            </p>
          </div>
        </div>
        <div className="flex gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
          <div className="px-6 py-2 text-center border-r border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Предмети</p>
            <p className="text-xl font-black text-indigo-600">{subjects.length}</p>
          </div>
          <div className="px-6 py-2 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Групи</p>
            <p className="text-xl font-black text-slate-900">{groupCount}</p>
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xl font-bold">Ваші предмети та групи</h3>
            <Link
              href="/teacher/schedule"
              className="text-sm font-bold text-indigo-600 flex items-center gap-1"
            >
              Розклад LPNU <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {subjects.length === 0 ? (
            <p className="text-slate-500 text-sm">
              Поки немає предметів. Після входу вони підтягуються з LPNU; або зверніться до адміністратора.
            </p>
          ) : (
            <ul className="space-y-6">
              {subjects.map((s, i) => (
                <li key={s.id} className="flex gap-6 group">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full border-2 ${i === 0 ? 'bg-indigo-600 border-indigo-200' : 'bg-slate-200 border-white'}`}
                    />
                    {i !== subjects.length - 1 && <div className="w-0.5 flex-1 bg-slate-100 my-2" />}
                  </div>
                  <div className="flex-1 pb-8 last:pb-0">
                    <div className="bg-slate-50 border border-slate-100 p-6 rounded-2xl group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-all">
                      <div className="flex items-start gap-3">
                        <BookOpen className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {s.name}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            <Users className="w-3 h-3 text-slate-400" />
                            {s.groups.length === 0 ? (
                              <span className="text-xs text-slate-500">Груп ще не прив’язано</span>
                            ) : (
                              <span className="text-xs text-slate-600 font-medium">
                                {s.groups.map((g) => g.name).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-8">
          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
            <h3 className="text-xl font-bold mb-6">Швидкі дії</h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/teacher/attendance"
                  className="block w-full py-3 px-4 rounded-xl bg-indigo-600 text-white font-bold text-sm text-center hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                >
                  Відмітити відвідуваність
                </Link>
              </li>
              <li>
                <Link
                  href="/teacher/schedule"
                  className="block w-full py-3 px-4 rounded-xl bg-slate-50 text-slate-700 font-bold text-sm text-center border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  Розклад LPNU
                </Link>
              </li>
              <li>
                <Link
                  href="/reports"
                  className="block w-full py-3 px-4 rounded-xl bg-slate-50 text-slate-700 font-bold text-sm text-center border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  Звіти
                </Link>
              </li>
              <li>
                <Link
                  href="/analytics"
                  className="block w-full py-3 px-4 rounded-xl bg-slate-50 text-slate-700 font-bold text-sm text-center border border-slate-200 hover:bg-slate-100 transition-colors"
                >
                  Аналітика
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

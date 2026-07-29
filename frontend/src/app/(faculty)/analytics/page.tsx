'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, getToken } from '@/lib/api';

type AnalyticsStudent = {
  id: string;
  name: string;
  group: string;
  attendanceRate: number;
  status: string;
};

type AnalyticsGroup = {
  name: string;
  groupId: string;
  students: AnalyticsStudent[];
  averageAttendance: number;
};

type StatCard = {
  label: string;
  value: string;
  change: string;
  color: string;
};

type AnalyticsPayload = {
  groups: AnalyticsGroup[];
  stats: StatCard[];
  autoRecognizedPercent: number | null;
  manualPercent: number | null;
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<AnalyticsGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<AnalyticsGroup | null>(null);
  const [stats, setStats] = useState<StatCard[]>([]);
  const [autoPct, setAutoPct] = useState<number | null>(null);
  const [manualPct, setManualPct] = useState<number | null>(null);
  const [userLabel, setUserLabel] = useState<string>('');
  const [meRole, setMeRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const meRes = await apiFetch('/auth/me');
      if (meRes.status === 401) {
        router.replace('/login');
        return;
      }
      if (!meRes.ok) {
        throw new Error('Не вдалося завантажити профіль');
      }
      const me = (await meRes.json()) as { role: string; name?: string; email?: string };
      setUserLabel(me.name ?? me.email ?? '');
      setMeRole(me.role);

      if (me.role !== 'ADMIN' && me.role !== 'TEACHER') {
        router.replace('/student');
        return;
      }

      const analyticsPath = me.role === 'ADMIN' ? '/analytics/admin' : '/analytics/teacher';
      const res = await apiFetch(analyticsPath);
      if (res.status === 401) {
        router.replace('/login');
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
        throw new Error(msg ?? 'Не вдалося завантажити аналітику');
      }
      const data = (await res.json()) as AnalyticsPayload;
      setGroups(data.groups);
      setStats(data.stats);
      setAutoPct(data.autoRecognizedPercent);
      setManualPct(data.manualPercent);
      if (data.groups[0]) {
        setSelectedGroup((prev) => {
          if (prev && data.groups.some((g) => g.groupId === prev.groupId)) {
            return data.groups.find((g) => g.groupId === prev.groupId)!;
          }
          return data.groups[0];
        });
      } else {
        setSelectedGroup(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleGroupChange = (groupId: string) => {
    const group = groups.find((g) => g.groupId === groupId);
    if (group) setSelectedGroup(group);
  };

  if (loading) {
    return (
      <div className="py-20 text-center font-medium text-slate-600">Завантаження аналітики…</div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-rose-600">{error}</p>
        <button type="button" className="text-indigo-600 font-bold" onClick={() => void load()}>
          Спробувати ще раз
        </button>
      </div>
    );
  }

  if (!selectedGroup && groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 text-slate-600">
        <p>Немає груп для відображення (налаштуйте предмети та студентів у адмінці).</p>
        <Link
          href={meRole === 'TEACHER' ? '/teacher' : meRole === 'ADMIN' ? '/admin' : '/teacher/attendance'}
          className="text-indigo-600 font-bold"
        >
          Назад
        </Link>
      </div>
    );
  }

  if (!selectedGroup) {
    return null;
  }

  const analyticsBody = (
    <>
      <header className="mb-12 md:flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Відвідуваність</h1>
          <p className="text-slate-500 mt-1">Дані з бази за вашими предметами та групами</p>
        </div>

        <div className="mt-6 md:mt-0 flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {groups.map((group) => (
            <button
              key={group.groupId}
              type="button"
              onClick={() => handleGroupChange(group.groupId)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                selectedGroup.groupId === group.groupId
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {group.name}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {stats.map((stat, i) => (
          <div
            key={i}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
          >
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">{stat.label}</p>
            <p className={`text-3xl font-black ${stat.color}`}>{stat.value}</p>
            <p className="text-xs font-medium text-slate-400 mt-2">{stat.change}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-xl font-bold">Група: {selectedGroup.name}</h3>
                <p className="text-slate-400 text-sm">
                  Середня відвідуваність:{' '}
                  <span className="font-bold text-indigo-600">{selectedGroup.averageAttendance}%</span>
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {selectedGroup.students.length === 0 ? (
                <p className="text-slate-500 text-sm">У групі ще немає студентів.</p>
              ) : (
                selectedGroup.students.map((student, i) => (
                  <div
                    key={student.id}
                    className="group flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-transparent hover:border-indigo-100 hover:bg-white transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center font-bold text-slate-400 text-xs">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{student.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          ID: {student.id.slice(0, 8)}…
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-12">
                      <div className="hidden md:block">
                        <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${
                              student.attendanceRate > 90
                                ? 'bg-green-500'
                                : student.attendanceRate > 80
                                  ? 'bg-indigo-500'
                                  : 'bg-rose-500'
                            }`}
                            style={{ width: `${student.attendanceRate}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right w-20">
                        <p
                          className={`text-sm font-black ${
                            student.attendanceRate > 90 ? 'text-green-600' : 'text-slate-900'
                          }`}
                        >
                          {student.attendanceRate}%
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{student.status}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
            <h3 className="text-lg font-bold mb-6">Розподіл обліку</h3>
            <div className="aspect-square relative flex items-center justify-center">
              <div className="w-full h-full rounded-full border-[1.5rem] border-slate-50 relative">
                <div className="absolute inset-0 rounded-full border-[1.5rem] border-indigo-600 border-t-transparent border-l-transparent rotate-45" />
                <div className="flex flex-col items-center">
                  <p className="text-4xl font-black text-slate-900">{selectedGroup.averageAttendance}%</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Середнє в групі</p>
                </div>
              </div>
            </div>
            <div className="mt-8 space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Авто (AI / розпізнавання)</span>
                <span className="font-bold">{autoPct != null ? `${autoPct}%` : '—'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Вручну</span>
                <span className="font-bold">{manualPct != null ? `${manualPct}%` : '—'}</span>
              </div>
            </div>
          </div>

          <div className="bg-indigo-600 rounded-[2rem] p-8 text-white shadow-xl shadow-indigo-200">
            <h3 className="text-lg font-bold mb-2">Примітка</h3>
            <p className="text-indigo-100 text-sm leading-relaxed">
              Відсотки рахуються від занять, які є в системі для цієї групи та предметів (для викладача — лише його
              предмети).
            </p>
          </div>
        </div>
      </div>
    </>
  );

  if (meRole === 'ADMIN') {
    return (
      <div className="min-h-screen bg-slate-50 font-sans">
        <nav className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-8">
            <Link href="/admin" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <span className="font-bold">Аналітика</span>
            </Link>
            <div className="flex gap-6 text-sm font-medium text-slate-500">
              <Link href="/admin" className="hover:text-indigo-600 transition-colors">
                Адмінка
              </Link>
              <span className="text-indigo-600">Статистика</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right mr-2 hidden md:block">
              <p className="text-xs font-bold text-slate-900">{userLabel || '—'}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase">поточний акаунт</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-200 ring-4 ring-slate-100" />
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-8 py-12">{analyticsBody}</main>
      </div>
    );
  }

  return <div className="max-w-7xl mx-auto w-full">{analyticsBody}</div>;
}

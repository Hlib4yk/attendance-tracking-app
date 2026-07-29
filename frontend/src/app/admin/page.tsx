'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, GraduationCap, Layers, Calendar, ArrowUpRight } from 'lucide-react';
import { apiFetch } from '@/lib/api';

type Stats = {
  teachers: number;
  students: number;
  groups: number;
  sessionsToday: number;
  sessionsTotal: number;
};

type ActivitySession = {
  id: string;
  date: string;
  confirmed: boolean;
  subject: { name: string; teacher?: { user?: { name: string } } | null };
};

function formatRelative(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'щойно';
  if (m < 60) return `${m} хв тому`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} год тому`;
  return d.toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' });
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivitySession[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [sRes, aRes] = await Promise.all([apiFetch('/admin/stats'), apiFetch('/admin/activity')]);
        if (!sRes.ok || !aRes.ok) {
          setError('Не вдалося завантажити дані');
          return;
        }
        setStats((await sRes.json()) as Stats);
        setActivity((await aRes.json()) as ActivitySession[]);
      } catch {
        setError('Помилка мережі');
      }
    })();
  }, []);

  if (error) {
    return <p className="text-rose-600 font-medium">{error}</p>;
  }

  if (!stats) {
    return <p className="text-slate-500 font-medium">Завантаження…</p>;
  }

  const cards = [
    {
      label: 'Викладачі',
      count: String(stats.teachers),
      hint: 'акаунти TEACHER',
      icon: GraduationCap,
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: 'Студенти',
      count: String(stats.students),
      hint: 'акаунти STUDENT',
      icon: Users,
      color: 'bg-green-50 text-green-600',
    },
    {
      label: 'Групи',
      count: String(stats.groups),
      hint: 'академічні групи',
      icon: Layers,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Заняття сьогодні',
      count: String(stats.sessionsToday),
      hint: `усього сесій у БД: ${stats.sessionsTotal}`,
      icon: Calendar,
      color: 'bg-rose-50 text-rose-600',
    },
  ];

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((stat, i) => (
          <div
            key={i}
            className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all group"
          >
            <div className={`p-4 rounded-2xl ${stat.color} w-fit mb-6`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-4xl font-black text-slate-900 tracking-tight">{stat.count}</p>
            <p className="text-xs text-slate-400 mt-2 font-medium">{stat.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[2rem] border border-slate-200 p-10 shadow-sm">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-2xl font-black text-slate-900">Останні заняття</h3>
            <span className="text-xs font-bold text-slate-400 uppercase">з журналу сесій</span>
          </div>
          <div className="space-y-6">
            {activity.length === 0 ? (
              <p className="text-slate-500 text-sm">Ще немає записаних занять.</p>
            ) : (
              activity.map((row, i) => (
                <div key={row.id} className="flex gap-6 relative">
                  {i !== activity.length - 1 && (
                    <div className="absolute left-6 top-10 bottom-[-24px] w-0.5 bg-slate-100" />
                  )}
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center border-4 border-white shadow-sm shrink-0">
                    <div className={`w-2 h-2 rounded-full ${row.confirmed ? 'bg-green-500' : 'bg-amber-500'}`} />
                  </div>
                  <div className="flex-1 pb-8 border-b border-slate-50 last:border-0 last:pb-0">
                    <div className="flex justify-between items-start mb-1 gap-4">
                      <p className="text-sm font-bold text-slate-900">{row.subject.name}</p>
                      <span className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">
                        {formatRelative(row.date)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">
                      {row.subject.teacher?.user?.name ?? 'Викладач'}{' '}
                      <span className="font-bold text-slate-700">
                        · {row.confirmed ? 'підтверджено' : 'очікує'}
                      </span>
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-indigo-600 rounded-[2rem] p-10 text-white shadow-2xl shadow-indigo-200">
            <h3 className="text-2xl font-black mb-6">Швидкі дії</h3>
            <div className="space-y-4">
              <Link
                href="/admin/students"
                className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-bold text-sm transition-all text-left px-6 border border-white/10 flex items-center justify-between group"
              >
                Студенти
                <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link
                href="/admin/groups"
                className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-bold text-sm transition-all text-left px-6 border border-white/10 flex items-center justify-between group"
              >
                Групи та предмети
                <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link
                href="/admin/teachers"
                className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-bold text-sm transition-all text-left px-6 border border-white/10 flex items-center justify-between group"
              >
                Викладачі
                <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

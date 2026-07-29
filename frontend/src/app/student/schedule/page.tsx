'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Clock, ExternalLink, RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { LpnuSlot } from '@/lib/lpnu-schedule';
import { LpnuScheduleGrouped } from '@/components/lpnu/LpnuScheduleGrouped';

type SessionRow = {
  id: string;
  date: string;
  confirmed: boolean;
  subject: { id: string; name: string; teacher?: { user?: { name: string } | null } | null };
};

type Me = {
  user: { name: string; email: string };
  group: { name: string };
};

type LpnuScheduleResponse = {
  source: 'student';
  slots: LpnuSlot[];
  params: Record<string, string>;
  fetchedAt: string;
  cached: boolean;
  expiresAt: string;
  officialUrl: string;
  message?: string;
};

export default function StudentSchedulePage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const [semestr, setSemestr] = useState<'1' | '2'>('2');
  const [semestrduration, setSemestrduration] = useState<'1' | '2'>('1');
  const [lpnu, setLpnu] = useState<LpnuScheduleResponse | null>(null);
  const [lpnuLoading, setLpnuLoading] = useState(false);
  const [lpnuError, setLpnuError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [mRes, sRes] = await Promise.all([apiFetch('/student/me'), apiFetch('/student/schedule')]);
      if (mRes.status === 401 || sRes.status === 401) {
        router.replace('/login');
        return;
      }
      if (mRes.ok) setMe((await mRes.json()) as Me);
      if (sRes.ok) {
        const data = (await sRes.json()) as SessionRow[];
        setSessions(data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      }
      setLoading(false);
    })();
  }, [router]);

  const loadLpnu = useCallback(async () => {
    if (!me?.group?.name) return;
    setLpnuLoading(true);
    setLpnuError(null);
    try {
      const q = new URLSearchParams({
        studygroup_abbrname: me.group.name,
        semestr,
        semestrduration,
      });
      const res = await apiFetch(`/schedule/lpnu/student?${q.toString()}`);
      const data = (await res.json().catch(() => ({}))) as LpnuScheduleResponse & { message?: string };
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
        throw new Error(msg ?? 'Не вдалося завантажити розклад LPNU');
      }
      setLpnu(data);
    } catch (e) {
      setLpnu(null);
      setLpnuError(e instanceof Error ? e.message : 'Помилка');
    } finally {
      setLpnuLoading(false);
    }
  }, [me?.group?.name, semestr, semestrduration]);

  useEffect(() => {
    if (!me?.group?.name) return;
    void loadLpnu();
  }, [me?.group?.name, semestr, semestrduration, loadLpnu]);

  if (loading) return <p className="text-slate-500 font-medium">Завантаження…</p>;

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">Розклад</h2>
          <p className="text-sm text-slate-500 mt-1">
            Нижче — заняття з бази вашого додатку та офіційний розклад групи з сайту НУ «Львівська політехніка».
          </p>
        </div>
      </div>

      <section>
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Заняття в системі</h3>
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm divide-y divide-slate-100">
          {sessions.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">Поки що немає записів у розкладі.</div>
          ) : (
            sessions.map((s) => (
              <div
                key={s.id}
                className="p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-4 justify-between hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <CalendarDays className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{s.subject.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {s.subject.teacher?.user?.name ?? 'Викладач'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-6 text-sm text-slate-600">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <Clock className="w-4 h-4 text-slate-400" />
                    {new Date(s.date).toLocaleString('uk-UA', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                      s.confirmed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {s.confirmed ? 'Відвідування зафіксовано' : 'Очікується'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Офіційний розклад (LPNU)</h3>
            <p className="text-sm text-slate-600 mt-1">
              Група: <span className="font-bold text-slate-900">{me?.group?.name ?? '—'}</span>
              {lpnu && (
                <span className="ml-2 text-xs text-slate-400">
                  {lpnu.cached ? '(з кешу)' : '(щойно з сайту)'} · оновлено{' '}
                  {new Date(lpnu.fetchedAt).toLocaleString('uk-UA', { timeStyle: 'short', dateStyle: 'short' })}
                </span>
              )}
            </p>
            <p className="text-sm text-slate-600 mt-2 max-w-2xl">
              Кілька занять на <span className="font-semibold text-slate-800">одну й ту саму пару</span> — це зазвичай
              підгрупи (лекція / практика в різних аудиторіях) або різні тижні. Такі варіанти показані{' '}
              <span className="font-semibold text-slate-800">поруч у спільному блоці</span>.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2">
              <label className="text-xs font-bold text-slate-500 uppercase sr-only">Семестр</label>
              <select
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium"
                value={semestr}
                onChange={(e) => setSemestr(e.target.value as '1' | '2')}
              >
                <option value="1">1 семестр</option>
                <option value="2">2 семестр</option>
              </select>
              <select
                className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium"
                value={semestrduration}
                onChange={(e) => setSemestrduration(e.target.value as '1' | '2')}
              >
                <option value="1">Перша половина семестру</option>
                <option value="2">Друга половина семестру</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => void loadLpnu()}
              disabled={lpnuLoading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${lpnuLoading ? 'animate-spin' : ''}`} />
              Оновити
            </button>
            {lpnu?.officialUrl && (
              <a
                href={lpnu.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700"
              >
                <ExternalLink className="w-4 h-4" />
                Сайт LPNU
              </a>
            )}
          </div>
        </div>

        {lpnuError && (
          <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-sm">{lpnuError}</div>
        )}

        {lpnuLoading && !lpnu?.slots?.length && (
          <p className="text-slate-500 text-sm py-8">Завантаження розкладу з LPNU…</p>
        )}

        {!lpnuLoading && lpnu && lpnu.slots.length === 0 && !lpnuError && (
          <div className="p-8 rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 text-sm">
            Для цієї групи та обраних параметрів на сайті LPNU немає даних (або змінився формат сторінки). Спробуйте
            інший семестр або відкрийте офіційне посилання.
          </div>
        )}

        <LpnuScheduleGrouped slots={lpnu?.slots ?? []} />
      </section>
    </div>
  );
}

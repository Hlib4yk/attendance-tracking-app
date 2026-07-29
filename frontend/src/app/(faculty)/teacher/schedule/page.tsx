'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Clock, ExternalLink, RefreshCw } from 'lucide-react';
import { apiFetch, getToken } from '@/lib/api';
import type { LpnuSlot } from '@/lib/lpnu-schedule';
import { LpnuScheduleGrouped } from '@/components/lpnu/LpnuScheduleGrouped';

type SessionRow = {
  id: string;
  date: string;
  confirmed: boolean;
  subject: { id: string; name: string };
  group?: { id: string; name: string } | null;
};

type Me = {
  id: string;
  email: string;
  name: string;
  role: string;
};

type LpnuScheduleResponse = {
  source: 'lecturer';
  slots: LpnuSlot[];
  params: Record<string, string>;
  fetchedAt: string;
  cached: boolean;
  expiresAt: string;
  officialUrl: string;
  message?: string;
};

type SubjectRow = {
  id: string;
  name: string;
  groups: { id: string; name: string }[];
};

type SyncGroupsResult = {
  linkedFromSchedule: string[];
  missingInDatabase: string[];
  codesDetectedInSchedule: { raw: string; normalized: string }[];
  subjectGroups: { id: string; name: string }[];
  lpnuCached: boolean;
  lpnuFetchedAt: string;
};

export default function TeacherSchedulePage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [syncSubjectId, setSyncSubjectId] = useState('');
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncGroupsResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [semestr, setSemestr] = useState<'All' | '1' | '2'>('2');
  const [semestrduration, setSemestrduration] = useState<'1' | '2'>('1');
  const [lpnu, setLpnu] = useState<LpnuScheduleResponse | null>(null);
  const [lpnuLoading, setLpnuLoading] = useState(false);
  const [lpnuError, setLpnuError] = useState<string | null>(null);

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
      if (!meJson || meJson.role !== 'TEACHER') {
        if (meJson?.role === 'STUDENT') router.replace('/student/schedule');
        else if (meJson?.role === 'ADMIN') router.replace('/admin');
        else router.replace('/login');
        return;
      }
      setMe(meJson);

      const subRes = await apiFetch('/teacher/subjects');
      if (cancelled) return;
      if (!subRes.ok) {
        setLoading(false);
        return;
      }
      const subjectsJson = (await subRes.json()) as SubjectRow[];
      setSubjects(subjectsJson);
      const sessionLists = await Promise.all(
        subjectsJson.map(async (s) => {
          const r = await apiFetch(`/teacher/subjects/${s.id}/sessions`);
          if (!r.ok) return [] as SessionRow[];
          const rows = (await r.json()) as {
            id: string;
            date: string;
            confirmed: boolean;
            group?: { id: string; name: string } | null;
          }[];
          return rows.map((row) => ({
            ...row,
            subject: { id: s.id, name: s.name },
          }));
        }),
      );
      if (!cancelled) {
        const flat = sessionLists.flat().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setSessions(flat);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const loadLpnu = useCallback(async () => {
    if (!me?.name) return;
    setLpnuLoading(true);
    setLpnuError(null);
    try {
      const q = new URLSearchParams({
        teachername: me.name,
        semestr,
        semestrduration,
      });
      const res = await apiFetch(`/schedule/lpnu/lecturer?${q.toString()}`);
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
  }, [me?.name, semestr, semestrduration]);

  useEffect(() => {
    if (!me?.name) return;
    void loadLpnu();
  }, [me?.name, semestr, semestrduration, loadLpnu]);

  useEffect(() => {
    if (!subjects.length) return;
    setSyncSubjectId((id) => (id && subjects.some((s) => s.id === id) ? id : subjects[0]!.id));
  }, [subjects]);

  const runSyncGroupsFromLpnu = useCallback(async () => {
    if (!syncSubjectId) return;
    setSyncBusy(true);
    setSyncError(null);
    setSyncResult(null);
    try {
      const res = await apiFetch(`/teacher/subjects/${syncSubjectId}/sync-groups-from-lpnu`, {
        method: 'POST',
        body: JSON.stringify({ semestr, semestrduration }),
      });
      const data = (await res.json().catch(() => ({}))) as SyncGroupsResult & { message?: string | string[] };
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
        throw new Error(typeof msg === 'string' ? msg : 'Не вдалося оновити групи');
      }
      setSyncResult(data);
      setSubjects((prev) =>
        prev.map((s) => (s.id === syncSubjectId ? { ...s, groups: data.subjectGroups } : s)),
      );
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Помилка');
    } finally {
      setSyncBusy(false);
    }
  }, [syncSubjectId, semestr, semestrduration]);

  if (loading) {
    return <p className="text-slate-500 font-medium">Завантаження…</p>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Розклад викладача</h1>
          <p className="text-sm text-slate-500 mt-1">
            Заняття в системі та офіційний розклад з порталу співробітників LPNU (ПІБ має збігатися з формою на сайті).
          </p>
        </div>

        <section>
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Заняття в системі</h2>
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
                        {s.group?.name ? `Група ${s.group.name}` : 'Група'}
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
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Офіційний розклад (LPNU)</h2>
              <p className="text-sm text-slate-600 mt-1">
                Викладач: <span className="font-bold text-slate-900">{me?.name ?? '—'}</span>
                {lpnu && (
                  <span className="ml-2 text-xs text-slate-400">
                    {lpnu.cached ? '(з кешу)' : '(щойно з сайту)'} · оновлено{' '}
                    {new Date(lpnu.fetchedAt).toLocaleString('uk-UA', { timeStyle: 'short', dateStyle: 'short' })}
                  </span>
                )}
              </p>
              <p className="text-sm text-slate-600 mt-2 max-w-2xl">
                Кілька занять на <span className="font-semibold text-slate-800">одну й ту саму пару</span> — це зазвичай
                підгрупи або різні тижні; показані <span className="font-semibold text-slate-800">поруч у спільному блоці</span>.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-2">
                <select
                  className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium"
                  value={semestr}
                  onChange={(e) => setSemestr(e.target.value as 'All' | '1' | '2')}
                >
                  <option value="All">Увесь навчальний рік</option>
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

          <div className="mb-6 p-5 rounded-2xl border border-indigo-100 bg-indigo-50/50 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Прив’язати групи з розкладу LPNU до предмета</h3>
            <p className="text-sm text-slate-600">
              У тексті розкладу (нижче) шукаються коди груп на кшталт <strong>ОІ-44</strong>. Якщо така група вже є в
              базі додатку, вона додається до обраного предмета. Поточні зв’язки предмет–група збережуться; додаються лише
              нові знайдені у розкладі за тими ж семестром і половиною, що обрані вище. Якщо у вас кілька дисциплін у
              системі, оберіть потрібну — зараз усі коди груп з цього розкладу аналізуються разом і прив’язуються до
              одного обраного предмета.
            </p>
            {subjects.length === 0 ? (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                У вас ще немає предмета у системі — спершу адміністратор має призначити вам дисципліну, або зареєструйтесь з
                запрошенням викладача.
              </p>
            ) : (
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:items-end">
                <div className="min-w-[200px]">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Предмет</label>
                  <select
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium"
                    value={syncSubjectId}
                    onChange={(e) => setSyncSubjectId(e.target.value)}
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => void runSyncGroupsFromLpnu()}
                  disabled={syncBusy || !syncSubjectId}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
                >
                  {syncBusy ? 'Синхронізація…' : 'Додати групи з LPNU'}
                </button>
              </div>
            )}
            {syncError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-sm">{syncError}</div>
            )}
            {syncResult && (
              <div className="text-sm space-y-2 text-slate-700 border border-slate-100 rounded-xl bg-white/80 p-4">
                <p>
                  <span className="font-bold text-slate-900">Додано з розкладу до предмета:</span>{' '}
                  {syncResult.linkedFromSchedule.length
                    ? syncResult.linkedFromSchedule.join(', ')
                    : '(немає збігів у базі або коди груп не знайдені в тексті)'}
                </p>
                {syncResult.missingInDatabase.length > 0 && (
                  <p className="text-amber-800">
                    <span className="font-bold">Немає в базі (створіть групу або перевірте написання):</span>{' '}
                    {syncResult.missingInDatabase.join(', ')}
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  Усього груп у предмета зараз: {syncResult.subjectGroups.map((g) => g.name).join(', ') || '—'}
                </p>
              </div>
            )}
          </div>

          {lpnuError && (
            <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-sm">{lpnuError}</div>
          )}

          {lpnuLoading && !lpnu?.slots?.length && (
            <p className="text-slate-500 text-sm py-8">Завантаження розкладу з LPNU…</p>
          )}

          {!lpnuLoading && lpnu && lpnu.slots.length === 0 && !lpnuError && (
            <div className="p-8 rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 text-sm">
              Для цього викладача та обраних параметрів на сайті LPNU немає даних (або змінився формат сторінки). Спробуйте
              інший семестр або перевірте відповідність ПІБ у профілі тому, що на staff.lpnu.ua.
            </div>
          )}

          <LpnuScheduleGrouped
            slots={lpnu?.slots ?? []}
            attendanceSemester={{ semestr, semestrduration }}
          />
        </section>
    </div>
  );
}

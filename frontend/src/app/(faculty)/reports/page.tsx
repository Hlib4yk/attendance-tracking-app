'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, getToken } from '@/lib/api';

type AnalyticsGroup = {
  name: string;
  groupId: string;
};

type SessionSummary = {
  id: string;
  date: string;
  subjectId: string;
  subjectName: string;
  confirmed: boolean;
  photoUrl: string | null;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  attendanceRecords: number;
};


export default function ReportsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<AnalyticsGroup[]>([]);
  const [groupId, setGroupId] = useState('');
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadGroups = useCallback(async () => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    setLoadingGroups(true);
    setError(null);
    try {
      const meRes = await apiFetch('/auth/me');
      if (meRes.status === 401) {
        router.replace('/login');
        return;
      }
      const me = (await meRes.json()) as { role: string };
      if (me.role !== 'TEACHER') {
        router.replace('/analytics');
        return;
      }
      const res = await apiFetch('/analytics/teacher');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
        throw new Error(msg ?? 'Не вдалося завантажити групи');
      }
      const data = (await res.json()) as { groups: { name: string; groupId: string }[] };
      const list = data.groups.map((g) => ({ name: g.name, groupId: g.groupId }));
      setGroups(list);
      if (list[0]) {
        setGroupId(list[0].groupId);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка');
    } finally {
      setLoadingGroups(false);
    }
  }, [router]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (!groupId) {
      setSessions([]);
      return;
    }
    let cancelled = false;
    setLoadingSessions(true);
    setError(null);
    void (async () => {
      try {
        const res = await apiFetch(`/teacher/groups/${groupId}/sessions`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message ?? 'Не вдалося завантажити заняття');
        if (!cancelled) setSessions(data as SessionSummary[]);
      } catch (e) {
        if (!cancelled) { setSessions([]); setError(e instanceof Error ? e.message : 'Помилка'); }
      } finally {
        if (!cancelled) setLoadingSessions(false);
      }
    })();
    return () => { cancelled = true; };
  }, [groupId]);

  if (loadingGroups) {
    return <p className="text-slate-600 font-medium py-12">Завантаження…</p>;
  }

  if (error && groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <p className="text-rose-600">{error}</p>
        <button type="button" className="text-indigo-600 font-bold" onClick={() => void loadGroups()}>
          Спробувати ще раз
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto w-full pb-8">
        <header className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Звіти</h1>
          <p className="text-slate-600 mt-2">
            Оберіть групу, потім заняття — покажемо, хто був присутній, а хто ні (за фінальним журналом сесії).
          </p>
        </header>

        {groups.length === 0 ? (
          <p className="text-slate-600">Немає прив’язаних груп. Додайте предмети та студентів у системі.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-8">
              {groups.map((g) => (
                <button
                  key={g.groupId}
                  type="button"
                  onClick={() => setGroupId(g.groupId)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    groupId === g.groupId
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>

            <div className="space-y-2">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Заняття</h2>
                {loadingSessions && <p className="text-sm text-slate-500">Завантаження…</p>}
                {!loadingSessions && sessions.length === 0 && (
                  <p className="text-sm text-slate-600">Ще немає занять для цієї групи.</p>
                )}
                {!loadingSessions && (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {sessions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => router.push(`/reports/sessions/${s.id}`)}
                        className="w-full text-left p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md transition-all group"
                      >
                        <div className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                          {s.subjectName}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {new Date(s.date).toLocaleString('uk-UA', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2 text-[11px] font-semibold">
                          <span className="text-emerald-700">П: {s.presentCount}</span>
                          <span className="text-rose-700">В: {s.absentCount}</span>
                          {s.lateCount > 0 && <span className="text-amber-800">З: {s.lateCount}</span>}
                          {s.photoUrl && (
                            <span className="text-indigo-500">📷</span>
                          )}
                          {!s.confirmed && (
                            <span className="text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">
                              чернетка
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
          </>
        )}
    </div>
  );
}

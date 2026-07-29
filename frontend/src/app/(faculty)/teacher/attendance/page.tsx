'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ImageUpload } from '@/components/attendance/ImageUpload';
import { weekParityLabel } from '@/lib/lpnu-schedule';
import { apiFetch, fileUrl, getToken } from '@/lib/api';

type SubjectRow = {
  id: string;
  name: string;
  groups: { id: string; name: string }[];
};

type SubjectOption = {
  subjectId: string;
  subjectName: string;
  groups: { id: string; name: string }[];
};

type SlotContextOk = {
  ok: true;
  ambiguousSubjects: boolean;
  subjects: SubjectOption[];
  slot: {
    day: string;
    period: number;
    weekParity: 'full' | 'chys' | 'znam';
    lines: string[];
    rawText: string;
  };
  lpnu: { cached: boolean; fetchedAt: string };
};

type SlotContextResponse =
  | SlotContextOk
  | {
      ok: false;
      reason: string;
      message: string;
      codesInSlot?: string[];
      slot?: { day: string; period: number; weekParity: string; lines: string[] };
    };

type RecognitionHit = {
  studentId: string;
  name: string;
  email: string;
  confidence: number;
};

type RecognizeResult = {
  sessionId: string;
  photoUrl?: string;
  engine?: string;
  processingMs?: number;
  recognizedCount: number;
  presentCount?: number;
  absentCount?: number;
  totalStudents?: number;
  recognizedStudentIds?: string[];
  recognitions?: RecognitionHit[];
  message?: string;
};

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE';

type RosterRow = {
  studentId: string;
  name: string;
  email: string;
  groupName?: string;
  status: AttendanceStatus;
  method: string;
};

function TeacherAttendancePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const day = searchParams.get('day');
  const periodRaw = searchParams.get('period');
  const variantRaw = searchParams.get('variant');
  const semestr = searchParams.get('semestr');
  const semestrduration = searchParams.get('semestrduration');

  const period = periodRaw != null ? parseInt(periodRaw, 10) : NaN;
  const variant = variantRaw != null ? parseInt(variantRaw, 10) : NaN;

  const hasSlotQuery =
    Boolean(day) &&
    Number.isFinite(period) &&
    Number.isFinite(variant) &&
    semestr != null &&
    ['All', '1', '2'].includes(semestr) &&
    semestrduration != null &&
    ['1', '2'].includes(semestrduration);

  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [sessionIdOverride, setSessionIdOverride] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<RecognizeResult | null>(null);
  const [roster, setRoster] = useState<RosterRow[] | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [entryMode, setEntryMode] = useState<'photo' | 'manual'>('photo');
  const [manualBusy, setManualBusy] = useState(false);

  const [slotContext, setSlotContext] = useState<SlotContextOk | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [slotLoading, setSlotLoading] = useState(false);

  const loadSubjects = useCallback(
    async (opts?: { skipDefaultPick?: boolean }) => {
      const res = await apiFetch('/teacher/subjects');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (!res.ok) {
        setLoadError('Could not load subjects');
        return;
      }
      const data = (await res.json()) as SubjectRow[];
      setSubjects(data);
      if (!opts?.skipDefaultPick && data[0]) {
        setSubjectId(data[0].id);
        const g = data[0].groups[0];
        setGroupId(g ? g.id : '');
      }
      setLoadError(null);
    },
    [router],
  );

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiFetch('/auth/me');
        if (cancelled) return;
        if (res.status === 401) {
          router.replace('/login');
          return;
        }
        const me = (await res.json()) as { role?: string } | null;
        const role = me?.role;
        if (role === 'STUDENT') {
          router.replace('/student');
          return;
        }
        if (role === 'ADMIN') {
          router.replace('/admin');
          return;
        }
        if (role !== 'TEACHER') {
          router.replace('/login');
          return;
        }
        setAuthChecked(true);
        await loadSubjects({ skipDefaultPick: hasSlotQuery });
      } catch {
        if (!cancelled) router.replace('/login');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, loadSubjects, hasSlotQuery]);

  useEffect(() => {
    if (!authChecked || !hasSlotQuery || !day || !Number.isFinite(period) || !Number.isFinite(variant) || !semestr || !semestrduration) {
      setSlotContext(null);
      setSlotError(null);
      setSlotLoading(false);
      return;
    }
    let cancelled = false;
    setSlotLoading(true);
    setSlotError(null);
    void (async () => {
      try {
        const qs = new URLSearchParams({
          day,
          period: String(period),
          variant: String(variant),
          semestr,
          semestrduration,
        });
        const res = await apiFetch(`/teacher/schedule-slot/attendance-context?${qs.toString()}`);
        const data = (await res.json()) as SlotContextResponse;
        if (cancelled) return;
        if (!res.ok) {
          setSlotContext(null);
          setSlotError(typeof (data as { message?: string }).message === 'string' ? (data as { message: string }).message : 'Не вдалося завантажити контекст пари.');
          return;
        }
        if (!data.ok) {
          setSlotContext(null);
          setSlotError(data.message);
          return;
        }
        setSlotContext(data);
        const first = data.subjects[0];
        if (first) {
          setSubjectId(first.subjectId);
          setGroupId(first.groups[0]?.id ?? '');
        }
      } catch {
        if (!cancelled) {
          setSlotContext(null);
          setSlotError('Помилка мережі при зверненні до розкладу.');
        }
      } finally {
        if (!cancelled) setSlotLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authChecked, hasSlotQuery, day, period, variant, semestr, semestrduration]);

  const subjectOptions: SubjectOption[] = useMemo(() => {
    if (slotContext?.ok) {
      return slotContext.subjects;
    }
    return subjects.map((s) => ({
      subjectId: s.id,
      subjectName: s.name,
      groups: s.groups,
    }));
  }, [slotContext, subjects]);

  const groupsForSubject = useMemo(
    () => subjectOptions.find((s) => s.subjectId === subjectId)?.groups ?? [],
    [subjectOptions, subjectId],
  );

  useEffect(() => {
    const g = groupsForSubject[0];
    if (!groupId || !groupsForSubject.some((x) => x.id === groupId)) {
      setGroupId(g ? g.id : '');
    }
  }, [subjectId, groupsForSubject, groupId]);

  useEffect(() => {
    const sid = result?.sessionId;
    if (!sid) {
      setRoster(null);
      return;
    }
    let cancelled = false;
    setRosterLoading(true);
    void (async () => {
      try {
        const res = await apiFetch(`/teacher/sessions/${sid}/attendance`);
        const data = (await res.json()) as { roster?: RosterRow[]; message?: string };
        if (!res.ok) {
          throw new Error(typeof data.message === 'string' ? data.message : 'Could not load roster');
        }
        if (!cancelled && data.roster) {
          setRoster(data.roster);
        }
      } catch {
        if (!cancelled) {
          setRoster(null);
          setError('Не вдалося завантажити список групи для редагування.');
        }
      } finally {
        if (!cancelled) setRosterLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [result?.sessionId]);

  const clearSlotFromUrl = () => {
    router.replace('/teacher/attendance');
    setSlotContext(null);
    setSlotError(null);
    void loadSubjects({ skipDefaultPick: false });
  };

  const startManualJournal = async () => {
    if (!subjectId || !groupId) {
      setError('Оберіть предмет і групу.');
      return;
    }
    setManualBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiFetch(`/teacher/subjects/${subjectId}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          date: new Date().toISOString(),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof body.message === 'string' ? body.message : 'Не вдалося створити заняття');
      }
      const sessionId = body.id as string;
      setResult({
        sessionId,
        message: 'Ручний журнал: усі студенти спочатку «відсутні». Відмітьте присутніх і збережіть.',
        recognizedCount: 0,
        presentCount: 0,
        absentCount: 0,
        totalStudents: 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка');
    } finally {
      setManualBusy(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!subjectId) {
      setError('Оберіть предмет');
      return;
    }
    const photoGroupIds = groupsForSubject.map((g) => g.id);
    if (photoGroupIds.length === 0) {
      setError('У обраного предмета немає груп');
      return;
    }
    setIsUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('image', file);
    formData.append('subjectId', subjectId);
    formData.append('groupIds', JSON.stringify(photoGroupIds));
    if (sessionIdOverride.trim()) {
      formData.append('sessionId', sessionIdOverride.trim());
    }

    try {
      const res = await apiFetch('/attendance/recognize', {
        method: 'POST',
        body: formData,
      });
      const data = (await res.json()) as RecognizeResult & { message?: string | string[]; error?: string };
      if (!res.ok) {
        const msg = typeof data.message === 'string' ? data.message : data.error ?? 'Failed to process image';
        throw new Error(msg);
      }
      setResult({
        sessionId: data.sessionId,
        photoUrl: data.photoUrl,
        engine: data.engine,
        processingMs: data.processingMs,
        recognizedCount: data.recognizedCount,
        presentCount: data.presentCount,
        absentCount: data.absentCount,
        totalStudents: data.totalStudents,
        recognizedStudentIds: data.recognizedStudentIds,
        recognitions: data.recognitions,
        message: typeof data.message === 'string' ? data.message : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsUploading(false);
    }
  };

  async function confirmAttendance() {
    if (!result?.sessionId || !roster) return;
    setConfirming(true);
    setError(null);
    try {
      const patch = await apiFetch(`/teacher/sessions/${result.sessionId}/attendance`, {
        method: 'PATCH',
        body: JSON.stringify({
          records: roster.map((r) => ({ studentId: r.studentId, status: r.status })),
        }),
      });
      const patchBody = await patch.json().catch(() => ({}));
      if (!patch.ok) {
        throw new Error(patchBody.message ?? 'Не вдалося зберегти правки');
      }
      if (patchBody.roster) {
        setRoster(patchBody.roster as RosterRow[]);
      }
      const res = await apiFetch(`/teacher/sessions/${result.sessionId}/confirm`, {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Підтвердження не вдалося');
      }
      setResult((r) => (r ? { ...r, message: 'Відвідуваність підтверджено.' } : r));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка підтвердження');
    } finally {
      setConfirming(false);
    }
  }

  function updateRosterStatus(studentId: string, status: AttendanceStatus) {
    setRoster((rows) =>
      rows ? rows.map((r) => (r.studentId === studentId ? { ...r, status } : r)) : rows,
    );
  }

  if (!authChecked) {
    return <p className="text-slate-500 font-medium">Перевірка доступу…</p>;
  }

  if (loadError) {
    return (
      <p className="text-slate-600">
        {loadError}{' '}
        <button type="button" className="text-indigo-600 font-bold ml-2" onClick={() => void loadSubjects()}>
          Повторити
        </button>
      </p>
    );
  }

  const hasActiveSession = Boolean(result?.sessionId);
  const multiGroupOnSlot = Boolean(slotContext?.ok && groupsForSubject.length > 1);

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500 w-full">
      <header className="text-left">
        <span className="text-indigo-600 font-semibold tracking-wide uppercase text-sm">Журнал відвідуваності</span>
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mt-2 tracking-tight">Облік на парі</h1>
        <p className="mt-4 text-lg text-slate-600 max-w-2xl">
          Клікніть пару в розкладі LPNU — підтягнуться групи з цього слота. <strong className="text-slate-800">Фото</strong>{' '}
          одразу перевіряє присутність у всіх групах цієї пари одним запитом; оберіть конкретну групу лише для режиму{' '}
          <strong className="text-slate-800">Вручну</strong>.
        </p>
      </header>

      {hasSlotQuery && (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-indigo-600 tracking-wider">Пара з розкладу</p>
              {slotLoading && <p className="text-sm text-slate-600 mt-1">Зв’язуємо з групами в системі…</p>}
              {!slotLoading && slotContext?.ok && (
                <p className="text-sm font-bold text-slate-900 mt-1">
                  {slotContext.slot.day}, пара {slotContext.slot.period} · {weekParityLabel(slotContext.slot.weekParity)}
                  {slotContext.ambiguousSubjects ? ' · оберіть предмет, якщо їх кілька' : null}
                </p>
              )}
              {!slotLoading && slotError && <p className="text-sm text-rose-700 mt-1">{slotError}</p>}
            </div>
            <button
              type="button"
              onClick={() => clearSlotFromUrl()}
              className="text-sm font-bold text-indigo-700 hover:text-indigo-900"
            >
              Звичайний режим (без пари)
            </button>
          </div>
          {slotContext?.ok && (
            <ul className="text-sm text-slate-700 space-y-1 border-t border-indigo-100 pt-3">
              {slotContext.slot.lines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          )}
          {multiGroupOnSlot && slotContext?.ok && (
            <p className="text-xs text-slate-600">
              На цій парі кілька груп — завантажте одне фото, щоб перевірити присутність у всіх них одночасно. Окремий вибір
              групи потрібен лише для ручного журналу.
            </p>
          )}
        </div>
      )}

      <section className="space-y-6 w-full">
        <div className={entryMode === 'manual' ? 'grid sm:grid-cols-2 gap-4' : 'grid gap-4'}>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Предмет</label>
            <select
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              disabled={!subjectOptions.length || hasActiveSession}
            >
              {subjectOptions.map((s) => (
                <option key={s.subjectId} value={s.subjectId}>
                  {s.subjectName}
                </option>
              ))}
            </select>
          </div>
          {entryMode === 'manual' ? (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Група</label>
              <select
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                disabled={!groupsForSubject.length || hasActiveSession}
              >
                {groupsForSubject.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
        {entryMode === 'photo' && groupsForSubject.length > 0 ? (
          <p className="text-sm text-slate-600">
            Фото обліковує{' '}
            {groupsForSubject.length === 1 ? (
              <>групу «{groupsForSubject[0].name}».</>
            ) : (
              <>
                <span className="font-semibold text-slate-800">усі {groupsForSubject.length} груп</span> цієї пари:
                <span className="text-slate-700"> {groupsForSubject.map((g) => g.name).join(', ')}</span>.
              </>
            )}
          </p>
        ) : null}

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Існуючий ID сесії (повторне фото) — необов’язково
          </label>
          <input
            className="w-full px-4 py-3 rounded-xl border border-slate-200 disabled:opacity-50"
            placeholder="Порожньо = нове заняття"
            value={sessionIdOverride}
            onChange={(e) => setSessionIdOverride(e.target.value)}
            disabled={hasActiveSession || entryMode === 'manual'}
          />
        </div>
      </section>

      {!hasActiveSession && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Спосіб обліку</p>
          <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-xl max-w-lg">
            <button
              type="button"
              onClick={() => setEntryMode('photo')}
              className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${
                entryMode === 'photo' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Фото аудиторії
            </button>
            <button
              type="button"
              onClick={() => setEntryMode('manual')}
              className={`flex-1 min-w-[140px] py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${
                entryMode === 'manual' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Вручну (без фото)
            </button>
          </div>
        </div>
      )}

      <section className="space-y-8">
        {entryMode === 'photo' && !hasActiveSession && (
          <ImageUpload onUpload={handleUpload} onReject={setError} isUploading={isUploading} />
        )}

        {entryMode === 'manual' && !hasActiveSession && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600 mb-4">
              Створюємо заняття без фото. Спочатку всі студенти позначені як відсутні — змініть статуси в таблиці після
              відкриття журналу.
            </p>
            <button
              type="button"
              disabled={manualBusy || !subjectId || !groupId}
              onClick={() => void startManualJournal()}
              className="px-6 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
            >
              {manualBusy ? 'Створення…' : 'Відкрити журнал групи'}
            </button>
          </div>
        )}

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-6 py-4 rounded-xl flex items-center gap-3">
            <p className="font-medium text-sm">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Результати</h2>
                <p className="text-slate-500 text-sm">Сесія: {result.sessionId}</p>
                {result.engine && (
                  <p className="text-slate-500 text-xs mt-0.5">
                    Рушій: <span className="font-mono">{result.engine}</span>
                    {result.processingMs != null ? ` · ${result.processingMs} мс` : ''}
                  </p>
                )}
                {result.message && <p className="text-slate-400 text-xs mt-1">{result.message}</p>}
              </div>
              <div className="px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-semibold uppercase">
                {result.engine ? 'Done' : 'Журнал'}
              </div>
            </div>

            {result.photoUrl && (
              <div className="mb-6 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fileUrl(result.photoUrl) ?? result.photoUrl}
                  alt="Знімок заняття"
                  className="w-full max-h-72 object-contain bg-black/5"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Присутні (за даними)</p>
                <p className="text-3xl font-black text-indigo-600">{result.presentCount ?? result.recognizedCount}</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Відсутні (за даними)</p>
                <p className="text-3xl font-black text-slate-800">{result.absentCount ?? '—'}</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Усього у списку (усі групи)</p>
                <p className="text-3xl font-black text-slate-800">{result.totalStudents ?? '—'}</p>
              </div>
            </div>
            {result.recognitions && result.recognitions.length > 0 && (
              <div className="mt-4 p-6 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">
                  Розпізнані в демо-режимі (зі «впевненістю»)
                </p>
                <ul className="space-y-2 text-sm">
                  {result.recognitions.map((r) => (
                    <li
                      key={r.studentId}
                      className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100/80 pb-2 last:border-0"
                    >
                      <span className="font-medium text-slate-900">{r.name}</span>
                      <span className="text-slate-500 text-xs">{r.email}</span>
                      <span className="text-indigo-600 font-mono text-xs">{(r.confidence * 100).toFixed(1)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 p-6 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">ID для відлагодження</p>
              <p className="text-xs font-mono text-slate-700 break-all">
                {(result.recognizedStudentIds ?? []).join(', ') || '—'}
              </p>
            </div>

            <div className="mt-8">
              <h3 className="text-sm font-bold text-slate-800 mb-3">Журнал — перевірте та виправте за потреби</h3>
              {rosterLoading && <p className="text-sm text-slate-500">Завантаження списку…</p>}
              {!rosterLoading && roster && roster.length === 0 && (
                <p className="text-sm text-amber-700">У цій групі ще немає студентів або список недоступний.</p>
              )}
              {!rosterLoading && roster && roster.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Студент</th>
                        <th className="px-4 py-3">Статус</th>
                        <th className="px-4 py-3 hidden md:table-cell">Джерело</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roster.map((row) => (
                        <tr key={row.studentId} className="border-t border-slate-100">
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">{row.name}</div>
                            <div className="text-xs text-slate-500">
                              {[row.groupName, row.email].filter(Boolean).join(' · ')}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              className="w-full sm:w-auto px-3 py-2 rounded-lg border border-slate-200 bg-white"
                              value={row.status}
                              onChange={(e) => updateRosterStatus(row.studentId, e.target.value as AttendanceStatus)}
                            >
                              <option value="PRESENT">Присутній</option>
                              <option value="ABSENT">Відсутній</option>
                              <option value="LATE">Запізнився</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-slate-500">
                            {row.method === 'AUTO' ? 'Авто' : 'Вручну'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                type="button"
                className="px-5 py-2 text-slate-600 font-medium hover:text-slate-800 transition-colors"
                onClick={() => {
                  setResult(null);
                  setRoster(null);
                }}
              >
                Скасувати
              </button>
              <button
                type="button"
                disabled={confirming || rosterLoading || !roster}
                onClick={() => void confirmAttendance()}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                {confirming ? 'Збереження…' : 'Зберегти правки та підтвердити'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default function TeacherAttendancePage() {
  return (
    <Suspense fallback={<p className="text-slate-500 font-medium">Завантаження…</p>}>
      <TeacherAttendancePageInner />
    </Suspense>
  );
}

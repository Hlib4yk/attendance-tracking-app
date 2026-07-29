'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch, fileUrl, getToken } from '@/lib/api';

type RosterRow = {
  studentId: string;
  name: string;
  email: string;
  groupName?: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE';
  method: 'AUTO' | 'MANUAL';
};

type SessionDetail = {
  id: string;
  date: string;
  confirmed: boolean;
  photoUrl: string | null;
  subject: { id: string; name: string };
  group?: { id: string; name: string } | null;
};

type ApiResponse = {
  session: SessionDetail;
  roster: RosterRow[];
};

function methodLabel(m: string) {
  return m === 'AUTO' ? 'Авто' : 'Вручну';
}

export default function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await apiFetch(`/teacher/sessions/${sessionId}/attendance`);
        if (res.status === 401) { router.replace('/login'); return; }
        if (res.status === 403 || res.status === 404) { router.replace('/reports'); return; }
        if (!res.ok) throw new Error('Не вдалося завантажити заняття');
        const json = (await res.json()) as ApiResponse;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Помилка');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [sessionId, router]);

  if (loading) {
    return <p className="py-16 text-center text-slate-500 font-medium">Завантаження…</p>;
  }

  if (error || !data) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-rose-600">{error ?? 'Не знайдено'}</p>
        <Link href="/reports" className="text-indigo-600 font-bold hover:underline text-sm">
          ← Назад до звітів
        </Link>
      </div>
    );
  }

  const { session, roster } = data;
  const present = roster.filter((r) => r.status === 'PRESENT');
  const late    = roster.filter((r) => r.status === 'LATE');
  const absent  = roster.filter((r) => r.status === 'ABSENT');
  const photo   = fileUrl(session.photoUrl);

  const dateStr = new Date(session.date).toLocaleString('uk-UA', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-8">

      {/* Header */}
      <div>
        <Link
          href="/reports"
          className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:underline mb-4"
        >
          ← Назад до звітів
        </Link>
        <h1 className="text-2xl font-black text-slate-900 leading-tight">
          {session.subject.name}
        </h1>
        <p className="text-slate-500 mt-1">{dateStr}</p>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          {session.group && (
            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">
              {session.group.name}
            </span>
          )}
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              session.confirmed
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {session.confirmed ? 'Підтверджено' : 'Чернетка'}
          </span>
          <span className="text-xs text-slate-500">
            Всього: {roster.length} · Присутніх: {present.length + late.length} · Відсутніх: {absent.length}
          </span>
        </div>
      </div>

      {/* Photo */}
      {photo && !imgError ? (
        <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
          <p className="px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 bg-white">
            Фото заняття
          </p>
          <img
            src={photo}
            alt="Фото аудиторії"
            className="w-full max-h-[480px] object-contain bg-slate-900"
            onError={() => setImgError(true)}
          />
        </div>
      ) : session.photoUrl && imgError ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5 text-sm text-slate-500">
          Фото заняття недоступне (файл не знайдено на сервері).
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center text-sm text-slate-400">
          Фото для цього заняття не завантажувалось
        </div>
      )}

      {/* Present */}
      {(present.length > 0 || late.length > 0) && (
        <section>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            Були присутні — {present.length + late.length}
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[...present, ...late].map((row) => (
              <div
                key={row.studentId}
                className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm"
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                    row.status === 'LATE'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {row.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900 text-sm truncate">{row.name}</p>
                  <p className="text-xs text-slate-400 truncate">{row.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {row.status === 'LATE' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                      Запізнився
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400">{methodLabel(row.method)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Absent */}
      {absent.length > 0 && (
        <section>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            Були відсутні — {absent.length}
          </h2>
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {absent.map((row, i) => (
              <div
                key={row.studentId}
                className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-slate-100' : ''}`}
              >
                <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-xs font-black text-rose-400 shrink-0">
                  {row.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-700 truncate">{row.name}</p>
                  <p className="text-xs text-slate-400 truncate">{row.email}</p>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">{methodLabel(row.method)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {roster.length === 0 && (
        <p className="text-slate-500 text-sm">Немає записів про відвідуваність для цього заняття.</p>
      )}
    </div>
  );
}

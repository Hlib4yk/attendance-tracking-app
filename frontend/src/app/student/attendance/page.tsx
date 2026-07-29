'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, CheckCircle2, XCircle, Search } from 'lucide-react';
import { apiFetch } from '@/lib/api';

type BySubject = {
  subject: string;
  rate: number;
  totalClasses: number;
  attended: number;
  absent: number;
};

type AttendancePayload = {
  bySubject: BySubject[];
  history: {
    id: string;
    status: string;
    session: { date: string; subject: { name: string } };
  }[];
};

const COLORS = ['bg-indigo-600', 'bg-amber-500', 'bg-green-500', 'bg-rose-500', 'bg-blue-500'];

function historyStatusLabel(status: string): string {
  switch (status) {
    case 'PRESENT':
      return 'Присутній';
    case 'ABSENT':
      return 'Відсутній';
    case 'LATE':
      return 'Запізнився';
    default:
      return status;
  }
}

function historyStatusClass(status: string): string {
  if (status === 'ABSENT') return 'text-rose-600';
  if (status === 'LATE') return 'text-amber-700';
  return 'text-emerald-700';
}

export default function StudentAttendancePage() {
  const router = useRouter();
  const [data, setData] = useState<AttendancePayload | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await apiFetch('/student/attendance');
      if (res.status === 401) {
        router.replace('/login');
        return;
      }
      if (res.ok) setData((await res.json()) as AttendancePayload);
      setLoading(false);
    })();
  }, [router]);

  const filtered = useMemo(() => {
    const list = data?.bySubject ?? [];
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((s) => s.subject.toLowerCase().includes(q));
  }, [data, search]);

  if (loading || !data) return <p className="text-slate-500 font-medium">Завантаження…</p>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Пошук предмета…"
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filtered.map((subject, i) => (
          <div
            key={subject.subject}
            className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all"
          >
            <div className="p-8 md:flex items-center justify-between gap-8">
              <div className="flex items-center gap-6 mb-6 md:mb-0">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center opacity-90 ${COLORS[i % COLORS.length]}`}
                >
                  <Calendar className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">{subject.subject}</h3>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">
                    Всього занять у системі: {subject.totalClasses}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-8 md:gap-16">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Відвідуваність</p>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black text-slate-900">{subject.rate}%</span>
                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${COLORS[i % COLORS.length]}`} style={{ width: `${subject.rate}%` }} />
                    </div>
                  </div>
                </div>

                <div className="flex gap-8">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Відмічено</p>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-lg font-bold text-slate-900">{subject.attended}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Пропуски</p>
                    <div className="flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-rose-500" />
                      <span className="text-lg font-bold text-slate-900">{subject.absent}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {data.history.length > 0 && (
        <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Останні записи відвідуваності</h3>
          <ul className="space-y-3 text-sm text-slate-600">
            {data.history.slice(0, 15).map((h) => (
              <li key={h.id} className="flex justify-between gap-4 border-b border-slate-50 pb-3 last:border-0">
                <span className="font-medium text-slate-900">{h.session.subject.name}</span>
                <span className="text-slate-500">
                  {new Date(h.session.date).toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
                <span className={`font-bold text-xs ${historyStatusClass(h.status)}`}>
                  {historyStatusLabel(h.status)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Search, GraduationCap } from 'lucide-react';
import { apiFetch } from '@/lib/api';

type StudentRow = {
  id: string;
  user: { id: string; name: string; email: string; createdAt: string };
  group: { id: string; name: string };
  _count: { attendance: number };
};

export default function StudentsPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/admin/students');
      if (!res.ok) throw new Error('Не вдалося завантажити студентів');
      setStudents((await res.json()) as StudentRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = students.filter(
    (s) =>
      s.user.name.toLowerCase().includes(search.toLowerCase()) ||
      s.user.email.toLowerCase().includes(search.toLowerCase()) ||
      s.id.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) return <p className="text-slate-500 font-medium">Завантаження…</p>;
  if (error) return <p className="text-rose-600">{error}</p>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <p className="text-sm text-slate-500">
        Додавання та редагування студентів у групі — у кабінеті{' '}
        <strong className="text-slate-700">викладача</strong> (після прив’язки предмета до групи). Тут лише перегляд.
      </p>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Пошук…"
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-200">
              <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Студент</th>
              <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Група</th>
              <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
              <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Відвідування (записів)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((student) => (
              <tr key={student.id} className="hover:bg-slate-50/50">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 opacity-40" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{student.user.name}</p>
                      <p className="text-xs text-slate-400 font-mono">id: {student.id.slice(0, 8)}…</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold">
                    {student.group.name}
                  </span>
                </td>
                <td className="px-8 py-5 text-sm text-slate-500">{student.user.email}</td>
                <td className="px-8 py-5">
                  <span className="text-sm font-black text-slate-900">{student._count.attendance}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-20 text-center text-slate-500 text-sm">Нічого не знайдено.</div>
        )}
      </div>
    </div>
  );
}

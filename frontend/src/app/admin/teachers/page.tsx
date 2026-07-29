'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Search, Mail, GraduationCap, BookOpen, KeyRound, Copy, Check } from 'lucide-react';
import { apiFetch } from '@/lib/api';

type ApiUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  teacher?: { id: string; subjects: { id: string; name: string }[] } | null;
};

type TeacherInviteRow = {
  id: string;
  invitedEmail: string;
  createdAt: string;
  expiresAt: string | null;
  usedAt: string | null;
  usedByUserId: string | null;
  usedByUser: { email: string; name: string } | null;
  createdByAdmin: { name: string; email: string };
};

export default function TeachersPage() {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [invites, setInvites] = useState<TeacherInviteRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteExpiresDays, setInviteExpiresDays] = useState('');
  const [inviteResult, setInviteResult] = useState<{
    emailSent: boolean;
    inviteUrl?: string;
    invitedEmail?: string;
    emailError?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ name: '', teacherUserId: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, invitesRes] = await Promise.all([
        apiFetch('/admin/users'),
        apiFetch('/admin/teacher-invites'),
      ]);
      if (!usersRes.ok) throw new Error('Не вдалося завантажити користувачів');
      if (!invitesRes.ok) throw new Error('Не вдалося завантажити запрошення');
      setUsers((await usersRes.json()) as ApiUser[]);
      setInvites((await invitesRes.json()) as TeacherInviteRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const teachers = users.filter((u) => u.role === 'TEACHER' && u.teacher);

  const filtered = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()),
  );

  async function createInvite(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setCopied(false);
    try {
      const trimmedDays = inviteExpiresDays.trim();
      const body: Record<string, string | number> = { email: inviteEmail.trim() };
      if (trimmedDays !== '') {
        const n = Number.parseInt(trimmedDays, 10);
        if (Number.isNaN(n) || n < 1 || n > 365) {
          alert('Термін має бути від 1 до 365 днів або порожнім');
          return;
        }
        body.expiresInDays = n;
      }
      const res = await apiFetch('/admin/teacher-invites', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
        throw new Error(msg || 'Помилка');
      }
      setInviteResult({
        emailSent: !!data.emailSent,
        inviteUrl: data.inviteUrl as string | undefined,
        invitedEmail: data.invitedEmail as string,
        emailError: data.emailError as string | undefined,
      });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Помилка');
    } finally {
      setSubmitting(false);
    }
  }

  async function copyInviteLink() {
    const url = inviteResult?.inviteUrl;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  async function createSubject(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectForm.teacherUserId) {
      alert('Оберіть викладача');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch('/admin/subjects', {
        method: 'POST',
        body: JSON.stringify({
          name: subjectForm.name,
          teacherUserId: subjectForm.teacherUserId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
        throw new Error(msg || 'Помилка');
      }
      setSubjectModalOpen(false);
      setSubjectForm({ name: '', teacherUserId: teachers[0]?.id ?? '' });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Помилка');
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (subjectModalOpen && teachers.length && !subjectForm.teacherUserId) {
      setSubjectForm((f) => ({ ...f, teacherUserId: teachers[0].id }));
    }
  }, [subjectModalOpen, teachers, subjectForm.teacherUserId]);

  if (loading) return <p className="text-slate-500 font-medium">Завантаження…</p>;
  if (error) return <p className="text-rose-600">{error}</p>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Пошук за ім’ям або email…"
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setSubjectModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-50"
          >
            <BookOpen className="w-4 h-4" />
            Новий предмет
          </button>
          <button
            type="button"
            onClick={() => {
              setInviteModalOpen(true);
              setInviteResult(null);
              setInviteEmail('');
              setInviteExpiresDays('');
              setCopied(false);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700"
          >
            <KeyRound className="w-4 h-4" />
            Запросити викладача
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-100 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-black text-slate-900">Запрошення викладачів (посилання на email)</h2>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-200">
              <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Статус</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Створив</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Створено</th>
              <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Діє до</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invites.map((inv) => {
              const expired = !!(inv.expiresAt && new Date(inv.expiresAt).getTime() < Date.now());
              const used = !!inv.usedAt;
              let status: string;
              if (used) status = 'Використано';
              else if (expired) status = 'Прострочено';
              else status = 'Активний';
              return (
                <tr key={inv.id} className="hover:bg-slate-50/50">
                  <td className="px-8 py-4 text-sm font-medium text-slate-900">{inv.invitedEmail}</td>
                  <td className="px-8 py-4 text-sm">
                    <span
                      className={
                        used
                          ? 'text-slate-500'
                          : expired
                            ? 'text-amber-600'
                            : 'text-emerald-600 font-bold'
                      }
                    >
                      {status}
                    </span>
                    {used && inv.usedByUser && (
                      <p className="text-xs text-slate-400 mt-1">
                        {inv.usedByUser.name} · {inv.usedByUser.email}
                      </p>
                    )}
                  </td>
                  <td className="px-8 py-4 text-sm text-slate-600">
                    {inv.createdByAdmin.name}
                    <span className="block text-xs text-slate-400">{inv.createdByAdmin.email}</span>
                  </td>
                  <td className="px-8 py-4 text-sm text-slate-500">
                    {new Date(inv.createdAt).toLocaleString('uk-UA')}
                  </td>
                  <td className="px-8 py-4 text-sm text-slate-500">
                    {inv.expiresAt ? new Date(inv.expiresAt).toLocaleString('uk-UA') : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {invites.length === 0 && (
          <div className="py-12 text-center text-slate-500 text-sm">Ще немає запрошень — надішліть перше.</div>
        )}
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-200">
              <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Викладач</th>
              <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Предмети</th>
              <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Створено</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((teacher) => (
              <tr key={teacher.id} className="hover:bg-slate-50/50">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold">
                      {teacher.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{teacher.name}</p>
                      <div className="flex items-center gap-1 text-slate-400 text-xs">
                        <Mail className="w-3 h-3" />
                        {teacher.email}
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-1">user: {teacher.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <div className="flex flex-wrap gap-2">
                    {(teacher.teacher?.subjects ?? []).length === 0 ? (
                      <span className="text-slate-400 text-sm">Немає предметів</span>
                    ) : (
                      teacher.teacher!.subjects.map((s) => (
                        <span
                          key={s.id}
                          className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold uppercase ring-1 ring-slate-200"
                        >
                          {s.name}
                        </span>
                      ))
                    )}
                  </div>
                </td>
                <td className="px-8 py-5 text-sm text-slate-500">
                  {new Date(teacher.createdAt).toLocaleDateString('uk-UA')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-20 text-center">
            <GraduationCap className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900">Немає викладачів</h3>
            <p className="text-slate-500 text-sm">Надішліть запрошення на email — після реєстрації з’явиться тут.</p>
          </div>
        )}
      </div>

      {inviteModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg p-10 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-900">Запрошення викладача</h3>
              <button
                type="button"
                onClick={() => setInviteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <form className="space-y-6" onSubmit={createInvite}>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email викладача</label>
                <p className="text-xs text-slate-400 mt-1 mb-2">На цю адресу надішлуться посилання для реєстрації.</p>
                <input
                  type="email"
                  required
                  className="mt-1 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teacher@university.edu"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Термін дії (днів), необов’язково
                </label>
                <p className="text-xs text-slate-400 mt-1 mb-2">Порожньо — без дати закінчення. Від 1 до 365.</p>
                <input
                  type="number"
                  min={1}
                  max={365}
                  placeholder="напр. 30"
                  className="mt-1 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  value={inviteExpiresDays}
                  onChange={(e) => setInviteExpiresDays(e.target.value)}
                />
              </div>
              {inviteResult && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 space-y-3">
                  {inviteResult.emailSent ? (
                    <p className="text-sm text-emerald-900">
                      Посилання надіслано на{' '}
                      <span className="font-bold">{inviteResult.invitedEmail ?? inviteEmail}</span>.
                    </p>
                  ) : (
                    <>
                      <p className="text-sm text-amber-900">
                        Пошту не надіслано. Можна скопіювати посилання нижче або виправити налаштування Resend.
                      </p>
                      {inviteResult.emailError && (
                        <p className="text-xs text-amber-950/90 font-mono bg-white/60 rounded-lg px-3 py-2 border border-amber-200/80 break-words">
                          {inviteResult.emailError}
                        </p>
                      )}
                      {inviteResult.inviteUrl && (
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs font-mono text-slate-800 break-all">{inviteResult.inviteUrl}</code>
                          <button
                            type="button"
                            onClick={() => void copyInviteLink()}
                            className="shrink-0 p-3 rounded-xl bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                            title="Копіювати посилання"
                          >
                            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Mail className="w-5 h-5" />
                {submitting ? 'Відправка…' : inviteResult ? 'Надіслати ще одне' : 'Надіслати запрошення'}
              </button>
            </form>
          </div>
        </div>
      )}

      {subjectModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-lg p-10 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-900">Новий предмет</h3>
              <button
                type="button"
                onClick={() => setSubjectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <form className="space-y-6" onSubmit={createSubject}>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Назва</label>
                <input
                  required
                  className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Викладач</label>
                <select
                  required
                  className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  value={subjectForm.teacherUserId}
                  onChange={(e) => setSubjectForm((f) => ({ ...f, teacherUserId: e.target.value }))}
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.email})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={submitting || teachers.length === 0}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg disabled:opacity-50"
              >
                {submitting ? 'Збереження…' : 'Створити предмет'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

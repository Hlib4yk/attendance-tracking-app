'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { apiFetch, setToken } from '@/lib/api';

type GroupOption = { id: string; name: string };

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteFromUrl = searchParams.get('invite')?.trim() ?? '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'STUDENT' | 'TEACHER'>(inviteFromUrl ? 'TEACHER' : 'STUDENT');
  const [groupId, setGroupId] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<'none' | 'loading' | 'ok' | 'bad'>(
    inviteFromUrl ? 'loading' : 'none',
  );

  useEffect(() => {
    void (async () => {
      try {
        const res = await apiFetch('/groups');
        if (res.ok) {
          const data = (await res.json()) as GroupOption[];
          setGroups(data);
        }
      } catch {
        /* ignore — backend may be offline */
      }
    })();
  }, []);

  useEffect(() => {
    if (!inviteFromUrl) {
      setInviteStatus('none');
      return;
    }
    setInviteStatus('loading');
    void (async () => {
      try {
        const res = await apiFetch(
          `/auth/teacher-invite-preview?token=${encodeURIComponent(inviteFromUrl)}`,
        );
        const data = (await res.json()) as { invitedEmail?: string; message?: string | string[] };
        if (res.ok && data.invitedEmail) {
          setEmail(data.invitedEmail);
          setRole('TEACHER');
          setInviteStatus('ok');
          setError(null);
        } else {
          const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
          setError(msg ?? 'Посилання запрошення недійсне або прострочене');
          setInviteStatus('bad');
        }
      } catch {
        setError('Не вдалося перевірити запрошення');
        setInviteStatus('bad');
      }
    })();
  }, [inviteFromUrl]);

  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, groupSearch]);

  useEffect(() => {
    if (role !== 'STUDENT' || groups.length === 0) return;
    if (filteredGroups.length === 0) {
      setGroupId('');
      return;
    }
    if (!groupId || !filteredGroups.some((g) => g.id === groupId)) {
      setGroupId(filteredGroups[0]!.id);
    }
  }, [role, groups, filteredGroups, groupId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (role === 'STUDENT') {
        if (!profilePhoto) {
          throw new Error('Додайте фото обличчя для профілю');
        }
        const fd = new FormData();
        fd.set('email', email.trim().toLowerCase());
        fd.set('password', password);
        fd.set('name', name);
        fd.set('groupId', groupId);
        fd.set('image', profilePhoto);
        const res = await apiFetch('/auth/register/student', {
          method: 'POST',
          body: fd,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
          throw new Error(msg ?? data.error ?? 'Registration failed');
        }
        setToken(data.access_token);
        router.push('/student');
        return;
      }

      const body: Record<string, unknown> = { email, password, name, role, inviteToken: inviteFromUrl };
      const res = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
        throw new Error(msg ?? data.error ?? 'Registration failed');
      }
      setToken(data.access_token);
      if (data.user?.role === 'STUDENT') router.push('/student');
      else if (data.user?.role === 'TEACHER') router.push('/teacher');
      else router.push('/attendance');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  const teacherFlow = !!inviteFromUrl;
  const canPickTeacher = teacherFlow;

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-[2rem] border border-slate-200 shadow-xl p-10 space-y-8">
        <div>
          <Link href="/" className="text-sm font-bold text-indigo-600 hover:underline">
            Back to home
          </Link>
          <h1 className="text-2xl font-black text-slate-900 mt-4">Create account</h1>
          <p className="text-slate-500 text-sm mt-2">
            {teacherFlow
              ? 'Ви відкрили запрошення викладача з email. Пароль та ім’я введіть нижче.'
              : 'Студенти обирають групу й завантажують фото обличчя — з нього будується еталон для розпізнавання. Викладачі — лише за посиланням з листа.'}
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-5">
          {error && (
            <div className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
              {error}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Role</label>
            <select
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white disabled:bg-slate-100 disabled:text-slate-500"
              value={role}
              disabled={teacherFlow}
              onChange={(e) => setRole(e.target.value as 'STUDENT' | 'TEACHER')}
            >
              <option value="STUDENT">Student</option>
              {canPickTeacher && <option value="TEACHER">Teacher</option>}
            </select>
            {!teacherFlow && (
              <p className="text-xs text-slate-400 mt-2">
                Роль «Викладач» з’явиться після переходу з посилання з вашого запрошення.
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full name</label>
            <input
              type="text"
              required
              minLength={2}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email</label>
            <input
              type="email"
              required
              readOnly={teacherFlow}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none read-only:bg-slate-50"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Password (min 8)
            </label>
            <input
              type="password"
              required
              minLength={8}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {role === 'STUDENT' && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Група</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="search"
                  autoComplete="off"
                  placeholder="Пошук за назвою, напр. ОІ-32…"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                  disabled={groups.length === 0}
                />
              </div>
              <select
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                disabled={groups.length === 0 || filteredGroups.length === 0}
              >
                {groups.length === 0 ? (
                  <option value="">Увімкніть API та створіть групи в адмінці</option>
                ) : filteredGroups.length === 0 ? (
                  <option value="">Немає груп за цим запитом — змініть пошук</option>
                ) : (
                  filteredGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))
                )}
              </select>
              {groups.length > 0 && groupSearch.trim() && (
                <p className="text-xs text-slate-500">
                  Знайдено: {filteredGroups.length} з {groups.length}
                </p>
              )}
            </div>
          )}
          {role === 'STUDENT' && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Фото обличчя (профіль)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-indigo-50 file:text-indigo-700 file:font-semibold"
                onChange={(e) => setProfilePhoto(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-slate-400 mt-2">
                Чітке фото обличчя спереду (JPEG / PNG / WebP, до 10 МБ). Потрібно для відмітки відвідуваності.
              </p>
            </div>
          )}
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-indigo-600 cursor-pointer"
            />
            <span className="text-xs text-slate-500 leading-snug">
              Я погоджуюсь на обробку моїх персональних даних (ім'я, email, фото обличчя) відповідно до{' '}
              <a href="/privacy-policy" target="_blank" className="text-indigo-600 hover:underline font-medium">
                Політики конфіденційності
              </a>{' '}
              з метою ідентифікації та обліку відвідуваності.
            </span>
          </label>
          <button
            type="submit"
            disabled={
              !consent ||
              loading ||
              inviteStatus === 'loading' ||
              (role === 'STUDENT' && (!groupId || !profilePhoto)) ||
              (role === 'TEACHER' && inviteStatus !== 'ok')
            }
            className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? 'Creating…' : 'Register'}
          </button>
        </form>
        <p className="text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="font-bold text-indigo-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-500 font-medium">
          Завантаження…
        </main>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}

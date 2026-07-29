'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Search, Layers, Users, Book, Trash2, Pencil, Link2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';

type GroupRow = {
  id: string;
  name: string;
  _count: { students: number };
  subjects: { id: string; name: string }[];
};

type SubjectRow = {
  id: string;
  name: string;
  groups: { id: string; name: string }[];
};

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [linkForGroup, setLinkForGroup] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [gRes, sRes] = await Promise.all([apiFetch('/admin/groups'), apiFetch('/admin/subjects')]);
      if (!gRes.ok || !sRes.ok) throw new Error('Не вдалося завантажити дані');
      const rawGroups = (await gRes.json()) as GroupRow[];
      setGroups(
        rawGroups.map((g) => ({
          ...g,
          subjects: g.subjects.filter((s, i, arr) => arr.findIndex((x) => x.id === s.id || x.name === s.name) === i),
        })),
      );
      setSubjects((await sRes.json()) as SubjectRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = groups.filter((g) => g.name.toLowerCase().includes(search.toLowerCase()));

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!createName.trim()) return;
    setCreating(true);
    try {
      const res = await apiFetch('/admin/groups', {
        method: 'POST',
        body: JSON.stringify({ name: createName.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Помилка');
      }
      setCreateName('');
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Помилка');
    } finally {
      setCreating(false);
    }
  }

  async function saveRename(id: string) {
    try {
      const res = await apiFetch(`/admin/groups/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (!res.ok) throw new Error('Не вдалося перейменувати');
      setEditId(null);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Помилка');
    }
  }

  async function removeGroup(id: string) {
    if (!confirm('Видалити групу? Має бути без студентів.')) return;
    const res = await apiFetch(`/admin/groups/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.message || 'Не вдалося видалити');
      return;
    }
    await load();
  }

  function subjectsAvailableToLink(groupId: string) {
    const linked = new Set(groups.find((g) => g.id === groupId)?.subjects.map((s) => s.id) ?? []);
    return subjects.filter((s) => !linked.has(s.id));
  }

  async function linkSubject(groupId: string) {
    const subjectId = linkForGroup[groupId];
    if (!subjectId) return;
    const res = await apiFetch(`/admin/subjects/${subjectId}/groups/${groupId}`, { method: 'POST' });
    if (!res.ok) {
      alert('Не вдалося прив’язати');
      return;
    }
    setLinkForGroup((m) => ({ ...m, [groupId]: '' }));
    await load();
  }

  async function unlinkSubject(subjectId: string, groupId: string) {
    const res = await apiFetch(`/admin/subjects/${subjectId}/groups/${groupId}`, { method: 'DELETE' });
    if (!res.ok) {
      alert('Не вдалося відв’язати');
      return;
    }
    await load();
  }

  if (loading) return <p className="text-slate-500 font-medium">Завантаження…</p>;
  if (error) return <p className="text-rose-600">{error}</p>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row gap-6 justify-between items-start">
        <form onSubmit={createGroup} className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-stretch sm:items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-bold text-slate-500 uppercase">Нова група</label>
            <input
              className="mt-1 w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm"
              placeholder="Назва (напр. CS-403)"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={creating || !createName.trim()}
            className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Створити
          </button>
        </form>
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Пошук груп…"
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.map((group) => (
          <div
            key={group.id}
            className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm hover:shadow-md transition-all min-w-0"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                <Layers className="w-7 h-7" />
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditId(group.id);
                    setEditName(group.name);
                  }}
                  className="p-2 text-slate-400 hover:text-indigo-600"
                  title="Перейменувати"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void removeGroup(group.id)}
                  className="p-2 text-slate-400 hover:text-rose-600"
                  title="Видалити"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {editId === group.id ? (
              <div className="mb-4 flex gap-2">
                <input
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => void saveRename(group.id)}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                >
                  OK
                </button>
              </div>
            ) : (
              <h3 className="text-2xl font-black text-slate-900 mb-1">{group.name}</h3>
            )}
            <p className="text-xs font-mono text-slate-400 mb-4">{group.id}</p>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 text-slate-600">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-bold">{group._count.students} студентів</span>
              </div>
              <div className="flex items-start gap-3 text-slate-600">
                <Book className="w-4 h-4 text-slate-400 mt-0.5" />
                <div className="text-sm">
                  {group.subjects.length === 0 ? (
                    <span className="text-slate-400">Немає предметів</span>
                  ) : (
                    <ul className="space-y-1">
                      {group.subjects.map((s) => (
                        <li key={s.id} className="flex items-center justify-between gap-2">
                          <span>{s.name}</span>
                          <button
                            type="button"
                            onClick={() => void unlinkSubject(s.id, group.id)}
                            className="text-[10px] font-bold text-rose-500 hover:underline"
                          >
                            відв’язати
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Прив’язати предмет</p>
              <div className="flex gap-2">
                <select
                  className="flex-1 min-w-0 px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white"
                  value={linkForGroup[group.id] ?? ''}
                  onChange={(e) => setLinkForGroup((m) => ({ ...m, [group.id]: e.target.value }))}
                >
                  <option value="">Оберіть предмет…</option>
                  {subjectsAvailableToLink(group.id).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void linkSubject(group.id)}
                  disabled={!linkForGroup[group.id]}
                  className="shrink-0 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold disabled:opacity-40 flex items-center gap-1"
                >
                  <Link2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
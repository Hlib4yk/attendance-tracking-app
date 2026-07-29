'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Users,
  GraduationCap,
  LayoutDashboard,
  Settings,
  LogOut,
  Layers,
} from 'lucide-react';
import { apiFetch, clearToken } from '@/lib/api';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [adminName, setAdminName] = useState('Admin');

  useEffect(() => {
    void (async () => {
      const res = await apiFetch('/auth/me');
      if (res.status === 401) {
        router.replace('/login');
        return;
      }
      const me = (await res.json()) as { role?: string; name?: string };
      if (me.role !== 'ADMIN') {
        router.replace('/');
        return;
      }
      if (me.name) setAdminName(me.name);
      setReady(true);
    })();
  }, [router]);

  const menuItems = [
    { name: 'Overview', icon: LayoutDashboard, path: '/admin' },
    { name: 'Teachers', icon: GraduationCap, path: '/admin/teachers' },
    { name: 'Students', icon: Users, path: '/admin/students' },
    { name: 'Groups', icon: Layers, path: '/admin/groups' },
  ];

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-bold">
        Checking access…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <div className="p-8 border-b border-slate-100 mb-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <span className="font-black text-slate-800 tracking-tight">AdminPanel</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                pathname === item.path
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-2">
          <button
            type="button"
            className="flex items-center gap-3 w-full px-4 py-3 text-slate-500 font-bold text-sm hover:bg-slate-50 rounded-xl transition-all"
          >
            <Settings className="w-5 h-5" />
            Settings
          </button>
          <button
            type="button"
            onClick={() => {
              clearToken();
              router.push('/login');
            }}
            className="flex items-center gap-3 w-full px-4 py-3 text-rose-500 font-bold text-sm hover:bg-rose-50 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto max-h-screen">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-900">
              {menuItems.find((m) => m.path === pathname)?.name || 'Admin Panel'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right mr-2">
              <p className="text-xs font-bold text-slate-900">{adminName}</p>
              <p className="text-[10px] text-green-500 font-bold uppercase">Administrator</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-indigo-100 border-2 border-white shadow-sm flex items-center justify-center text-indigo-700 font-black text-xs">
              {adminName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}

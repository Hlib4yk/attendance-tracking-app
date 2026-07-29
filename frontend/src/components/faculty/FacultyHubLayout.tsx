'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  CheckCircle,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Bell,
} from 'lucide-react';
import { apiFetch, clearToken, getToken } from '@/lib/api';

function pathTitle(pathname: string): string {
  if (pathname === '/teacher' || pathname === '/teacher/') return 'Dashboard';
  if (pathname.startsWith('/teacher/attendance')) return 'Attendance';
  if (pathname.startsWith('/teacher/schedule')) return 'My Schedule';
  if (pathname.startsWith('/reports')) return 'Reports';
  if (pathname.startsWith('/analytics')) return 'Analytics';
  return 'Faculty Portal';
}

function navActive(pathname: string, itemPath: string): boolean {
  if (itemPath === '/teacher') return pathname === '/teacher' || pathname === '/teacher/';
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

type MeRole = 'TEACHER' | 'ADMIN' | 'STUDENT' | 'OTHER' | null;

export function FacultyHubLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [headerName, setHeaderName] = useState('Teacher');
  const [roleLine, setRoleLine] = useState('Faculty');
  const [meRole, setMeRole] = useState<MeRole>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    void (async () => {
      try {
        const res = await apiFetch('/auth/me');
        if (res.status === 401) {
          router.replace('/login');
          return;
        }
        if (!res.ok) return;
        const data = (await res.json()) as { name?: string; email?: string; role?: string };
        if (data.role === 'STUDENT') {
          router.replace('/student');
          return;
        }
        if (data.role === 'ADMIN') {
          setMeRole('ADMIN');
          return;
        }
        if (data.role !== 'TEACHER') {
          router.replace('/login');
          return;
        }
        setMeRole('TEACHER');
        const n = data.name?.trim();
        if (n) {
          const short = n.split(/\s+/)[0];
          setHeaderName(short.length > 12 ? `${short.slice(0, 12)}…` : short);
        } else if (data.email) {
          setHeaderName(data.email.split('@')[0]);
        }
        setRoleLine('Teacher');
      } catch {
        // network error or navigation abort — silently ignore
      }
    })();
  }, [router]);

  if (meRole === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600 font-medium">
        Завантаження…
      </div>
    );
  }

  if (meRole === 'ADMIN') {
    return <>{children}</>;
  }

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/teacher' },
    { name: 'Attendance', icon: CheckCircle, path: '/teacher/attendance' },
    { name: 'My Schedule', icon: Calendar, path: '/teacher/schedule' },
    { name: 'Reports', icon: FileText, path: '/reports' },
    { name: 'Analytics', icon: BarChart3, path: '/analytics' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <div className="p-8 border-b border-slate-100 mb-8">
          <Link href="/teacher" className="flex items-center gap-3">
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
            <span className="font-black text-slate-800 tracking-tight">Attendance Master</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                navActive(pathname, item.path)
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
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto max-h-screen">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-900 leading-none">{pathTitle(pathname)}</h2>
          </div>
          <div className="flex items-center gap-6">
            <button
              type="button"
              className="relative p-2 text-slate-400 hover:text-indigo-600 transition-colors bg-slate-50 rounded-lg"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-600 rounded-full border-2 border-white" />
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-900 leading-none mb-1">{headerName}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{roleLine}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-indigo-50 border-2 border-white shadow-sm flex items-center justify-center text-indigo-600 font-black text-xs">
                {headerName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}

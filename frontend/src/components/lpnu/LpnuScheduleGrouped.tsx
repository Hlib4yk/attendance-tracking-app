'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { buildScheduleByDayAndPeriod, weekParityLabel, type LpnuSlot } from '@/lib/lpnu-schedule';

type AttendanceSemester = { semestr: 'All' | '1' | '2'; semestrduration: '1' | '2' };

type Props = {
  slots: LpnuSlot[];
  /** Якщо задано — клік по парі веде на журнал з обраним семестром (як у фільтрах розкладу). */
  attendanceSemester?: AttendanceSemester | null;
};

export function LpnuScheduleGrouped({ slots, attendanceSemester }: Props) {
  const scheduleByDayAndPeriod = useMemo(() => buildScheduleByDayAndPeriod(slots), [slots]);
  if (!scheduleByDayAndPeriod.length) return null;

  return (
    <div className="space-y-6">
      {scheduleByDayAndPeriod.map(({ day, periods }) => (
        <div key={day} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 font-black text-slate-900">{day}</div>
          <ul className="divide-y divide-slate-100">
            {periods.map(({ period, slots: periodSlots }) => {
              const isSplit = periodSlots.length > 1;
              return (
                <li key={`${day}-${period}`} className="p-5 md:p-6 hover:bg-slate-50/30">
                  <div className="mb-3">
                    <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                      Пара {period}
                    </span>
                    {isSplit && (
                      <span className="ml-2 text-[10px] font-bold uppercase text-slate-500">
                        {periodSlots.length} варіанти поруч
                      </span>
                    )}
                    {attendanceSemester && (
                      <span className="ml-2 text-[10px] font-bold text-indigo-600 uppercase tracking-wide">
                        Клік → журнал
                      </span>
                    )}
                  </div>
                  <div className={isSplit ? 'grid gap-4 grid-cols-1 md:grid-cols-2' : 'grid gap-4 grid-cols-1'}>
                    {periodSlots.map((slot, idx) => {
                      const href =
                        attendanceSemester &&
                        `/teacher/attendance?day=${encodeURIComponent(day)}&period=${period}&variant=${idx}&semestr=${attendanceSemester.semestr}&semestrduration=${attendanceSemester.semestrduration}`;
                      const inner = (
                        <>
                          {isSplit && (
                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                              Підгрупа / варіант {idx + 1}
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold uppercase text-slate-400 border border-slate-200 rounded px-2 py-0.5">
                              {weekParityLabel(slot.weekParity)}
                            </span>
                          </div>
                          <div className="space-y-1 text-sm text-slate-800">
                            {slot.lines.map((line, i) => (
                              <p key={i}>{line}</p>
                            ))}
                          </div>
                        </>
                      );
                      const shell =
                        'rounded-xl border border-slate-100 bg-slate-50/60 p-4 space-y-2 transition-all';
                      return href ? (
                        <Link
                          key={`${day}-${period}-${slot.weekParity}-${idx}`}
                          href={href}
                          className={`${shell} block cursor-pointer hover:border-indigo-200 hover:ring-2 hover:ring-indigo-100 hover:bg-white`}
                        >
                          {inner}
                        </Link>
                      ) : (
                        <div key={`${day}-${period}-${slot.weekParity}-${idx}`} className={shell}>
                          {inner}
                        </div>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

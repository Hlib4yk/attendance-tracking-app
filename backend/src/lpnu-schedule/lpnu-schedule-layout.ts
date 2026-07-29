import type { LpnuScheduleSlot } from './lpnu-schedule.parser';

export const LPNU_DAY_ORDER = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

/** День → пари; у кожній парі — усі слоти (підгрупи / різні тижні). Дзеркало логіки frontend/src/lib/lpnu-schedule.ts */
export function buildScheduleByDayAndPeriod(slots: LpnuScheduleSlot[]): {
  day: string;
  periods: { period: number; slots: LpnuScheduleSlot[] }[];
}[] {
  if (!slots.length) return [];
  const byDay = slots.reduce<Record<string, LpnuScheduleSlot[]>>((acc, s) => {
    acc[s.day] = acc[s.day] ? [...acc[s.day], s] : [s];
    return acc;
  }, {});
  const rows = Object.entries(byDay).map(([day, daySlots]) => {
    const byPeriod = daySlots.reduce<Record<number, LpnuScheduleSlot[]>>((acc, s) => {
      const p = s.period;
      acc[p] = acc[p] ? [...acc[p], s] : [s];
      return acc;
    }, {});
    const periods = Object.keys(byPeriod)
      .map(Number)
      .sort((a, b) => a - b)
      .map((period) => ({ period, slots: byPeriod[period]! }));
    return { day, periods };
  });
  return rows.sort((a, b) => {
    const ia = LPNU_DAY_ORDER.indexOf(a.day);
    const ib = LPNU_DAY_ORDER.indexOf(b.day);
    if (ia === -1 && ib === -1) return a.day.localeCompare(b.day, 'uk');
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

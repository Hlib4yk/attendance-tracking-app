export type LpnuSlot = {
  day: string;
  period: number;
  weekParity: 'full' | 'chys' | 'znam';
  lines: string[];
  rawText: string;
};

export const LPNU_DAY_ORDER = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

export function weekParityLabel(p: LpnuSlot['weekParity']): string {
  switch (p) {
    case 'chys':
      return 'чисельник';
    case 'znam':
      return 'знаменник';
    default:
      return 'щотижня';
  }
}

/** День → пари; у кожній парі — усі слоти (підгрупи / різні тижні). */
export function buildScheduleByDayAndPeriod(slots: LpnuSlot[]): {
  day: string;
  periods: { period: number; slots: LpnuSlot[] }[];
}[] {
  if (!slots.length) return [];
  const byDay = slots.reduce<Record<string, LpnuSlot[]>>((acc, s) => {
    acc[s.day] = acc[s.day] ? [...acc[s.day], s] : [s];
    return acc;
  }, {});
  const rows = Object.entries(byDay).map(([day, daySlots]) => {
    const byPeriod = daySlots.reduce<Record<number, LpnuSlot[]>>((acc, s) => {
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

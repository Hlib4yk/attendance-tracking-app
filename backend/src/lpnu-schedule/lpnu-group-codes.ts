import type { LpnuScheduleSlot } from './lpnu-schedule.parser';

/**
 * Скорочення груп LPNU: літери (укр/лат) + дефіс + номер (ОІ-34, ТК-12).
 * Не використовуємо `\b`: у JS воно лише для [A-Za-z0-9_], тому українські літери не дають «межі слова» і коди не знаходились.
 */
export const LPNU_GROUP_CODE_RE = /([A-Za-zА-Яа-яІіЇїЄєҐґ]{1,14}-\d{1,3})/gu;

/** Як у LPNU URL: без пробілів, верхній регістр (uk). */
export function normalizeLpnuGroupAbbrev(raw: string): string {
  return raw.trim().replace(/\s+/g, '').toLocaleUpperCase('uk');
}

export function extractGroupCodesFromSlot(slot: LpnuScheduleSlot): string[] {
  const texts = [slot.rawText, ...slot.lines].filter(Boolean);
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const text of texts) {
    for (const m of text.matchAll(new RegExp(LPNU_GROUP_CODE_RE.source, LPNU_GROUP_CODE_RE.flags))) {
      const norm = normalizeLpnuGroupAbbrev(m[1]);
      if (!norm || seen.has(norm)) continue;
      seen.add(norm);
      ordered.push(m[1].trim());
    }
  }
  return ordered;
}

export function extractGroupCodesFromLpnuSlots(slots: LpnuScheduleSlot[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const slot of slots) {
    for (const c of extractGroupCodesFromSlot(slot)) {
      const norm = normalizeLpnuGroupAbbrev(c);
      if (seen.has(norm)) continue;
      seen.add(norm);
      ordered.push(c);
    }
  }
  return ordered;
}

import type { LpnuScheduleSlot } from './lpnu-schedule.parser';
import {
  extractGroupCodesFromSlot,
  LPNU_GROUP_CODE_RE,
  normalizeLpnuGroupAbbrev,
} from './lpnu-group-codes';

export function normSubjectKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('uk');
}

function stripGroupCodes(text: string): string {
  return text.replace(LPNU_GROUP_CODE_RE, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Назва дисципліни з рядків слота (після прибирання кодів груп і «ауд.»).
 */
export function extractSubjectTitleFromSlot(slot: LpnuScheduleSlot): string {
  const lines = slot.lines.length ? slot.lines : [slot.rawText].filter(Boolean);
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    let cleaned = stripGroupCodes(t);
    cleaned = cleaned.replace(/\bауд\.?\s*[\w./-]+\b/gi, '').replace(/\s+/g, ' ').trim();
    if (cleaned.length >= 2 && cleaned.length <= 512) {
      return cleaned;
    }
  }
  const fromRaw = stripGroupCodes(slot.rawText);
  if (fromRaw.length >= 2 && fromRaw.length <= 512) {
    return fromRaw;
  }
  return '';
}

export type MergedLecturerBootstrap = {
  /** ключ — normSubjectKey */
  subjects: Map<string, { displayName: string; groupNorms: Set<string> }>;
  /** нормалізований код групи → підпис (як у розкладі) */
  groupNormToLabel: Map<string, string>;
};

export function buildMergedLecturerBootstrap(slots: LpnuScheduleSlot[]): MergedLecturerBootstrap {
  const subjects = new Map<string, { displayName: string; groupNorms: Set<string> }>();
  const groupNormToLabel = new Map<string, string>();

  for (const slot of slots) {
    const rawCodes = extractGroupCodesFromSlot(slot);
    for (const raw of rawCodes) {
      const norm = normalizeLpnuGroupAbbrev(raw);
      if (!norm) continue;
      if (!groupNormToLabel.has(norm)) {
        groupNormToLabel.set(norm, raw);
      }
    }

    const groupNorms = rawCodes.map(normalizeLpnuGroupAbbrev).filter(Boolean);
    let title = extractSubjectTitleFromSlot(slot).trim();
    if (!groupNorms.length && !title) continue;
    if (!title) {
      title = 'Навчання (LPNU)';
    }
    const key = normSubjectKey(title);
    if (!subjects.has(key)) {
      subjects.set(key, { displayName: title, groupNorms: new Set() });
    } else {
      const cur = subjects.get(key)!;
      if (title.length > cur.displayName.length) {
        cur.displayName = title;
      }
    }
    for (const g of groupNorms) {
      subjects.get(key)!.groupNorms.add(g);
    }
  }

  return { subjects, groupNormToLabel };
}

import { load } from 'cheerio';

export type LpnuScheduleSlot = {
  day: string;
  period: number;
  weekParity: 'full' | 'chys' | 'znam';
  lines: string[];
  rawText: string;
};

/**
 * Parses LPNU Drupal Views schedule HTML (student + lecturer pages use the same `.stud_schedule` blocks).
 */
export function parseLpnuScheduleHtml(html: string): LpnuScheduleSlot[] {
  const $ = load(html);
  const $container = $(
    '.view-students-schedule .view-content, .view-rozklad-zanyat-zi-studentamy .view-content',
  ).first();
  if (!$container.length) {
    return [];
  }

  let currentDay = '';
  let currentPeriod: number | null = null;
  const slots: LpnuScheduleSlot[] = [];

  $container.children().each((_, el) => {
    const $el = $(el);
    if ($el.hasClass('view-grouping-header')) {
      currentDay = $el.text().trim();
      return;
    }
    if ($el.is('h3')) {
      const n = parseInt($el.text().trim(), 10);
      currentPeriod = Number.isFinite(n) ? n : null;
      return;
    }
    if ($el.hasClass('stud_schedule')) {
      if (!currentDay || currentPeriod == null) return;
      const period = currentPeriod;
      $el.find('.group_content').each((__, gc) => {
        const $gc = $(gc);
        const wrapper = $gc.parent();
        const id = (wrapper.attr('id') ?? '').replace(/'/g, '');
        let weekParity: LpnuScheduleSlot['weekParity'] = 'full';
        if (id === 'group_chys') weekParity = 'chys';
        else if (id === 'group_znam') weekParity = 'znam';

        const rawHtml = $gc.html() ?? '';
        const lines = rawHtml
          .split(/<br\s*\/?>/i)
          .map((chunk) => {
            const frag = load('<body>' + chunk + '</body>');
            return frag('body').text().replace(/\s+/g, ' ').trim();
          })
          .filter(Boolean);

        const rawText = $gc.text().replace(/\s+/g, ' ').trim();
        if (!lines.length && !rawText) return;

        slots.push({
          day: currentDay,
          period,
          weekParity,
          lines: lines.length ? lines : [rawText],
          rawText: rawText || lines.join(' · '),
        });
      });
    }
  });

  return slots;
}

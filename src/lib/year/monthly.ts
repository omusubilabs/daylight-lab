/**
 * One representative day per month. The chart's hidden data table (docs/ui-spec.md,
 * accessibility) gives a screen reader the year's shape in twelve rows rather than in 365, and
 * mid-month is the honest sample: it is far from both solstices' turning points.
 */
import { monthName } from './calendar.ts';
import type { YearDay, YearSeries } from './series.ts';

const SAMPLE_DAY_OF_MONTH = 15;

export interface MonthlySample {
  readonly month: number;
  readonly label: string;
  readonly day: YearDay;
}

/**
 * Nearest to the 15th rather than exactly the 15th, so a sampled series — the reduced-resolution
 * one drawn while the slider moves — still yields a full twelve rows.
 */
export function monthlySamples(series: YearSeries): MonthlySample[] {
  const best = new Map<number, YearDay>();

  for (const day of series.days) {
    const previous = best.get(day.month);
    const closer =
      previous === undefined ||
      Math.abs(day.dayOfMonth - SAMPLE_DAY_OF_MONTH) <
        Math.abs(previous.dayOfMonth - SAMPLE_DAY_OF_MONTH);
    if (closer) best.set(day.month, day);
  }

  return [...best.entries()]
    .sort(([a], [b]) => a - b)
    .map(([month, day]) => ({ month, label: monthName(month), day }));
}

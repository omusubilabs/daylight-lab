/**
 * Day-of-year arithmetic for the fixed reference year. Everything here is UTC: a day index is an
 * index into the year's UTC midnights, and only the presentation layer ever asks what clock a
 * city was reading at one of them.
 */
import { MS_PER_DAY, utcMidnightMs } from '../solar/index.ts';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export interface CalendarDate {
  readonly month: number;
  readonly dayOfMonth: number;
}

export function dayCountInYear(year: number): number {
  return (utcMidnightMs(year + 1, 1, 1) - utcMidnightMs(year, 1, 1)) / MS_PER_DAY;
}

export function dateFromDayIndex(year: number, index: number): CalendarDate {
  const date = new Date(utcMidnightMs(year, 1, 1) + index * MS_PER_DAY);
  return { month: date.getUTCMonth() + 1, dayOfMonth: date.getUTCDate() };
}

/** `null` rather than a throw or a wrapped index: a malformed hash falls back to the default. */
export function dayIndexFromDate(year: number, month: number, dayOfMonth: number): number | null {
  if (!Number.isInteger(month) || !Number.isInteger(dayOfMonth)) return null;
  if (month < 1 || month > 12 || dayOfMonth < 1 || dayOfMonth > 31) return null;

  const index = (utcMidnightMs(year, month, dayOfMonth) - utcMidnightMs(year, 1, 1)) / MS_PER_DAY;
  if (!Number.isInteger(index) || index < 0 || index >= dayCountInYear(year)) return null;

  // 31 February resolves to 3 March rather than failing, so the round trip has to be checked.
  const round = dateFromDayIndex(year, index);
  return round.month === month && round.dayOfMonth === dayOfMonth ? index : null;
}

export function isoFromDayIndex(year: number, index: number): string {
  const { month, dayOfMonth } = dateFromDayIndex(year, index);
  return `${year}-${String(month).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;
}

export function dayIndexFromIso(year: number, iso: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match || Number(match[1]) !== year) return null;
  return dayIndexFromDate(year, Number(match[2]), Number(match[3]));
}

/** PageUp and PageDown move a month, and a month is not a fixed number of days. */
export function shiftMonths(year: number, index: number, delta: number): number {
  const { month, dayOfMonth } = dateFromDayIndex(year, index);
  const target = month + delta;
  if (target < 1) return 0;
  if (target > 12) return dayCountInYear(year) - 1;

  // 31 January stepped forward lands on 28 February rather than sliding into March.
  for (let day = dayOfMonth; day >= 1; day--) {
    const candidate = dayIndexFromDate(year, target, day);
    if (candidate !== null) return candidate;
  }
  return index;
}

export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? '';
}

export function formatMonthDay(year: number, index: number): string {
  const { month, dayOfMonth } = dateFromDayIndex(year, index);
  return `${monthName(month)} ${dayOfMonth}`;
}

export function formatLongDate(year: number, index: number): string {
  return `${formatMonthDay(year, index)}, ${year}`;
}

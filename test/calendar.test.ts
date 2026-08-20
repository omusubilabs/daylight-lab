import { describe, expect, it } from 'vitest';
import {
  dateFromDayIndex,
  dayCountInYear,
  dayIndexFromDate,
  dayIndexFromIso,
  formatLongDate,
  formatMonthDay,
  isoFromDayIndex,
  shiftMonths,
} from '../src/lib/year/index.ts';

const YEAR = 2026;

describe('day-of-year arithmetic', () => {
  it('counts the reference year and the next leap year', () => {
    expect(dayCountInYear(2026)).toBe(365);
    expect(dayCountInYear(2028)).toBe(366);
  });

  it('round-trips every day of the year through its ISO date', () => {
    for (let index = 0; index < dayCountInYear(YEAR); index++) {
      expect(dayIndexFromIso(YEAR, isoFromDayIndex(YEAR, index))).toBe(index);
    }
  });

  it('places the ends and the solstice where the calendar does', () => {
    expect(dayIndexFromDate(YEAR, 1, 1)).toBe(0);
    expect(dayIndexFromDate(YEAR, 12, 31)).toBe(364);
    expect(isoFromDayIndex(YEAR, 354)).toBe('2026-12-21');
    expect(dateFromDayIndex(YEAR, 354)).toEqual({ month: 12, dayOfMonth: 21 });
  });

  it('rejects a date that is not in this year rather than wrapping it', () => {
    expect(dayIndexFromDate(YEAR, 2, 30)).toBeNull();
    expect(dayIndexFromDate(YEAR, 13, 1)).toBeNull();
    expect(dayIndexFromDate(YEAR, 0, 1)).toBeNull();
    expect(dayIndexFromIso(YEAR, '2025-12-21')).toBeNull();
    expect(dayIndexFromIso(YEAR, '2026-2-3')).toBeNull();
    expect(dayIndexFromIso(YEAR, 'tomorrow')).toBeNull();
  });

  it('steps a month at a time without sliding past the short ones', () => {
    const jan31 = dayIndexFromDate(YEAR, 1, 31) ?? 0;
    expect(dateFromDayIndex(YEAR, shiftMonths(YEAR, jan31, 1))).toEqual({
      month: 2,
      dayOfMonth: 28,
    });

    const mar15 = dayIndexFromDate(YEAR, 3, 15) ?? 0;
    expect(dateFromDayIndex(YEAR, shiftMonths(YEAR, mar15, -1))).toEqual({
      month: 2,
      dayOfMonth: 15,
    });
  });

  it('stops at the ends of the year instead of leaving it', () => {
    expect(shiftMonths(YEAR, 5, -1)).toBe(0);
    expect(shiftMonths(YEAR, 360, 1)).toBe(364);
  });

  it('writes dates the way docs/content-en.md asks', () => {
    expect(formatMonthDay(YEAR, 354)).toBe('December 21');
    expect(formatLongDate(YEAR, 0)).toBe('January 1, 2026');
  });
});

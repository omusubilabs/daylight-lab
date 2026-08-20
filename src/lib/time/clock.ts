/**
 * The two clocks the chart can be drawn against (docs/solar-math.md §5.5). Local is the wall
 * clock, DST and all. Solar time is `minutesFromUtc + 4*longitude + eot`, which puts solar noon
 * at 12:00 by construction and cannot contain a DST step, because no zone is consulted at all.
 */
import { MINUTES_PER_DAY, MS_PER_MINUTE } from '../solar/index.ts';
import { localMinutesSinceMidnight } from './zone.ts';

export type ClockMode = 'local' | 'solar';

export interface ClockContext {
  readonly mode: ClockMode;
  readonly timeZone: string;
  /** Positive east. */
  readonly longitudeDeg: number;
  /** 00:00 UTC of the date the instant belongs to, which is what solar time is measured from. */
  readonly utcMidnightMs: number;
  readonly equationOfTimeMin: number;
}

export function clockMinutes(utcMs: number, context: ClockContext): number {
  if (context.mode === 'local') return localMinutesSinceMidnight(utcMs, context.timeZone);

  const fromUtcMidnight = (utcMs - context.utcMidnightMs) / MS_PER_MINUTE;
  const solar = fromUtcMidnight + 4 * context.longitudeDeg + context.equationOfTimeMin;
  return ((solar % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

// Constructing a formatter costs far more than formatting with one (docs/solar-math.md §6).
const abbreviations = new Map<string, Intl.DateTimeFormat>();

/**
 * Whatever the browser's zone database calls this offset — `GMT+2` for most zones, `AKST` for the
 * few with a name in CLDR. Never a value we compute (docs/solar-math.md §5, rule 3).
 */
export function zoneAbbreviation(utcMs: number, timeZone: string): string {
  let formatter = abbreviations.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' });
    abbreviations.set(timeZone, formatter);
  }
  const part = formatter.formatToParts(utcMs).find((p) => p.type === 'timeZoneName');
  return part ? part.value : '';
}

/** The suffix a readout time carries, so a solar-time reading is never mistaken for a wall clock. */
export function clockSuffix(utcMs: number, context: ClockContext): string {
  return context.mode === 'solar' ? 'solar' : zoneAbbreviation(utcMs, context.timeZone);
}

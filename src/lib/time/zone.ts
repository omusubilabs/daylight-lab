/**
 * The presentation boundary of docs/solar-math.md §5: everything upstream of here is UTC epoch
 * ms, everything downstream is a wall clock. Offsets are never named or arithmetic — `Intl` is
 * asked what the clock reads, because `Europe/Helsinki` is +2 or +3 depending on the date.
 */

export interface LocalClock {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
}

const PARTS_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  // `hour12: false` still renders midnight as 24:00 in some locales; h23 is the one that does not.
  hourCycle: 'h23',
};

/** A locale is pinned because the parts are read as numbers, not shown to anyone. */
const PARTS_LOCALE = 'en-US';

// Constructing a formatter costs far more than formatting with one, and the chart formats a full
// year per city on every slider frame (docs/solar-math.md §6).
const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(PARTS_LOCALE, { ...PARTS_OPTIONS, timeZone });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

export function localClock(utcMs: number, timeZone: string): LocalClock {
  const parts = formatterFor(timeZone).formatToParts(utcMs);
  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((p) => p.type === type);
    return part ? Number(part.value) : Number.NaN;
  };

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
  };
}

/** The y coordinate of the chart in local-clock mode: 0 at local midnight, 1440 at the next. */
export function localMinutesSinceMidnight(utcMs: number, timeZone: string): number {
  const { hour, minute } = localClock(utcMs, timeZone);
  return hour * 60 + minute;
}

/** docs/ui-spec.md — the readout is 24-hour `HH:MM`, never a bare number. */
export function formatLocalHhMm(utcMs: number, timeZone: string): string {
  const { hour, minute } = localClock(utcMs, timeZone);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

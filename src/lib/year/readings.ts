/**
 * The strings a day is rendered as, in one place because the visible readout and the hidden data
 * table (docs/ui-spec.md, accessibility) must never disagree about the same date. Pure: it takes a
 * computed day and returns text, so the wording is unit-tested without a DOM.
 */
import type { City } from '../../data/cities.ts';
import { formatAltitude, formatDuration, formatHhMm } from '../format.ts';
import { clockMinutes, clockSuffix } from '../time/index.ts';
import type { ClockMode } from '../time/index.ts';
import { clockContextFor } from './series.ts';
import type { YearDay } from './series.ts';

/**
 * A clock time, or the phrase that stands in its place. docs/ui-spec.md: when the Sun does not
 * rise or does not set, the readout says so rather than printing a time that did not happen.
 */
export interface Reading {
  readonly kind: 'time' | 'phrase';
  readonly text: string;
}

export interface DayReading {
  readonly sunrise: Reading;
  readonly sunset: Reading;
  readonly dayLength: string;
  readonly solarNoon: string;
  readonly maxAltitude: string;
  /** Which clock the times are on: a zone abbreviation, or `solar`. */
  readonly suffix: string;
}

const MIDNIGHT_SUN = 'Midnight sun';
const POLAR_NIGHT = 'Polar night';

function edgeReading(day: YearDay, edge: 'rise' | 'set', minutes: number): Reading {
  const event = day[edge];
  if (event.kind === 'alwaysAbove') return { kind: 'phrase', text: MIDNIGHT_SUN };
  if (event.kind === 'alwaysBelow') return { kind: 'phrase', text: POLAR_NIGHT };
  return { kind: 'time', text: formatHhMm(minutes) };
}

export function dayReading(city: City, day: YearDay, mode: ClockMode): DayReading {
  const clock = clockContextFor(city, day, mode);
  const at = (event: YearDay['rise']): number =>
    event.kind === 'event' ? clockMinutes(event.utcMs, clock) : 0;

  return {
    sunrise: edgeReading(day, 'rise', at(day.rise)),
    sunset: edgeReading(day, 'set', at(day.set)),
    dayLength: formatDuration(day.dayLengthMinutes),
    solarNoon: formatHhMm(day.solarNoonMinutes),
    maxAltitude: formatAltitude(day.maxAltitudeDeg),
    suffix: clockSuffix(day.solarNoonUtcMs, clock),
  };
}

/** The same reading with its clock named, for anywhere the column header cannot carry it. */
export function withSuffix(reading: Reading, suffix: string): string {
  return reading.kind === 'time' ? `${reading.text} ${suffix}` : reading.text;
}

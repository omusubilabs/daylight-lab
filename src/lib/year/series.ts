import type { City } from '../../data/cities.ts';
import {
  MS_PER_DAY,
  ZENITH_DEG,
  dayEvents,
  maxAltitudeDeg,
  minAltitudeDeg,
  utcMidnightMs,
} from '../solar/index.ts';
import type { DayEvents, DayQuery, SolarEvent, ThresholdName } from '../solar/index.ts';
import { clockMinutes, localClock } from '../time/index.ts';
import type { ClockContext, ClockMode } from '../time/index.ts';
import { dayCountInYear } from './calendar.ts';

const MINUTES_PER_DAY = 1440;

/** Minutes since local midnight of the two edges of one band on one day. */
export interface Band {
  readonly morning: number;
  readonly evening: number;
}

export interface YearDay {
  readonly index: number;
  readonly utcMidnightMs: number;
  readonly month: number;
  readonly dayOfMonth: number;
  /** Signed minutes east of UTC, read at local noon. Changes twice a year wherever DST applies. */
  readonly utcOffsetMinutes: number;
  /** The wall clock jumped between the previous day and this one, so a path must not span them. */
  readonly clockBreak: boolean;
  readonly solarNoonUtcMs: number;
  readonly solarNoonMinutes: number;
  readonly declinationDeg: number;
  readonly equationOfTimeMin: number;
  readonly maxAltitudeDeg: number;
  readonly minAltitudeDeg: number;
  readonly dayLengthMinutes: number;
  readonly rise: SolarEvent;
  readonly set: SolarEvent;
  readonly bands: Readonly<Record<ThresholdName, Band>>;
}

export interface YearSeries {
  readonly city: City;
  readonly year: number;
  readonly obliquityDeg: number;
  readonly clockMode: ClockMode;
  /** Days in the year. `days` may hold fewer, sampled evenly across the same span. */
  readonly dayCount: number;
  readonly days: readonly YearDay[];
}

export interface YearOptions {
  readonly clockMode?: ClockMode;
  /**
   * Keep roughly one day in `sampleStep` while the slider is moving. The x positions of a sampled
   * series are identical to a full one, so the chart geometry does not know the difference
   * (docs/ui-spec.md, performance targets).
   */
  readonly sampleStep?: number;
}

/**
 * A solar event lands on the same calendar date as its solar noon, but its wall clock can fall on
 * the far side of local midnight — a June sunrise at 23:50 belongs to the top of the chart, not the
 * bottom. Both edges are unwrapped onto noon's side of midnight, then clamped to the chart, which
 * is what makes a polar band fill to the edge instead of leaving a hole (docs/ui-spec.md).
 */
function morningMinutes(utcMs: number, clock: ClockContext, noonMinutes: number): number {
  const raw = clockMinutes(utcMs, clock);
  return Math.max(raw > noonMinutes ? raw - MINUTES_PER_DAY : raw, 0);
}

function eveningMinutes(utcMs: number, clock: ClockContext, noonMinutes: number): number {
  const raw = clockMinutes(utcMs, clock);
  return Math.min(raw < noonMinutes ? raw + MINUTES_PER_DAY : raw, MINUTES_PER_DAY);
}

function band(events: DayEvents, clock: ClockContext, noonMinutes: number): Band {
  const { rise, set } = events;
  if (rise.kind !== 'event' || set.kind !== 'event') {
    if (rise.kind === 'alwaysAbove') return { morning: 0, evening: MINUTES_PER_DAY };
    // Nothing crosses the threshold, so the band pinches shut where the Sun came closest.
    return { morning: noonMinutes, evening: noonMinutes };
  }

  return {
    morning: morningMinutes(rise.utcMs, clock, noonMinutes),
    evening: eveningMinutes(set.utcMs, clock, noonMinutes),
  };
}

/**
 * `Intl` reports a wall clock, never an offset (docs/solar-math.md §5), so the offset is recovered
 * by differencing — including the date, because 12:00 UTC is a different day in Anchorage.
 */
function utcOffsetMinutesAtNoon(dayMidnightMs: number, timeZone: string): number {
  const noonUtcMs = dayMidnightMs + MS_PER_DAY / 2;
  const clock = localClock(noonUtcMs, timeZone);
  const dateShiftDays = Math.round(
    (utcMidnightMs(clock.year, clock.month, clock.day) - dayMidnightMs) / MS_PER_DAY,
  );
  return dateShiftDays * MINUTES_PER_DAY + clock.hour * 60 + clock.minute - 720;
}

/** The context a city's day needs to place an instant on whichever clock is being drawn. */
export function clockContextFor(
  city: City,
  day: { readonly utcMidnightMs: number; readonly equationOfTimeMin: number },
  mode: ClockMode,
): ClockContext {
  return {
    mode,
    timeZone: city.timeZone,
    longitudeDeg: city.longitudeDeg,
    utcMidnightMs: day.utcMidnightMs,
    equationOfTimeMin: day.equationOfTimeMin,
  };
}

function computeDay(
  city: City,
  obliquityDeg: number,
  dayMidnightMs: number,
  index: number,
  mode: ClockMode,
  previousOffset: number | undefined,
): YearDay {
  const query: DayQuery = {
    utcMidnightMs: dayMidnightMs,
    latitudeDeg: city.latitudeDeg,
    longitudeDeg: city.longitudeDeg,
    obliquityDeg,
  };

  const sunrise = dayEvents(query, ZENITH_DEG.sunrise);
  const civil = dayEvents(query, ZENITH_DEG.civil);
  const nautical = dayEvents(query, ZENITH_DEG.nautical);
  const astronomical = dayEvents(query, ZENITH_DEG.astronomical);

  const clock = clockContextFor(
    city,
    { utcMidnightMs: dayMidnightMs, equationOfTimeMin: sunrise.equationOfTimeMin },
    mode,
  );
  const noonMinutes = clockMinutes(sunrise.solarNoonUtcMs, clock);
  const offset = utcOffsetMinutesAtNoon(dayMidnightMs, city.timeZone);
  const date = new Date(dayMidnightMs);

  return {
    index,
    utcMidnightMs: dayMidnightMs,
    month: date.getUTCMonth() + 1,
    dayOfMonth: date.getUTCDate(),
    utcOffsetMinutes: offset,
    // Solar time is built from longitude and the equation of time, so DST cannot reach it
    // (docs/solar-math.md §5.5) and the path must stay unbroken across a clock change.
    clockBreak: mode === 'local' && previousOffset !== undefined && offset !== previousOffset,
    solarNoonUtcMs: sunrise.solarNoonUtcMs,
    solarNoonMinutes: noonMinutes,
    declinationDeg: sunrise.declinationDeg,
    equationOfTimeMin: sunrise.equationOfTimeMin,
    maxAltitudeDeg: maxAltitudeDeg(city.latitudeDeg, sunrise.declinationDeg),
    minAltitudeDeg: minAltitudeDeg(city.latitudeDeg, sunrise.declinationDeg),
    dayLengthMinutes: sunrise.minutesAboveZenith,
    rise: sunrise.rise,
    set: sunrise.set,
    bands: {
      sunrise: band(sunrise, clock, noonMinutes),
      civil: band(civil, clock, noonMinutes),
      nautical: band(nautical, clock, noonMinutes),
      astronomical: band(astronomical, clock, noonMinutes),
    },
  };
}

/**
 * Sample positions that always keep the first and last day, so a sampled series spans exactly the
 * same x range as a full one and a drop in resolution never rescales the chart.
 */
function sampleIndices(dayCount: number, step: number): number[] {
  if (step <= 1 || dayCount < 3) return Array.from({ length: dayCount }, (_, i) => i);

  const count = Math.max(2, Math.ceil(dayCount / step));
  return Array.from({ length: count }, (_, i) => Math.round((i * (dayCount - 1)) / (count - 1)));
}

export function yearSeries(
  city: City,
  obliquityDeg: number,
  year: number,
  options: YearOptions = {},
): YearSeries {
  const clockMode = options.clockMode ?? 'local';
  const startMs = utcMidnightMs(year, 1, 1);
  const dayCount = dayCountInYear(year);

  const days: YearDay[] = [];
  let previousOffset: number | undefined;

  for (const index of sampleIndices(dayCount, options.sampleStep ?? 1)) {
    const day = computeDay(
      city,
      obliquityDeg,
      startMs + index * MS_PER_DAY,
      index,
      clockMode,
      previousOffset,
    );
    days.push(day);
    previousOffset = day.utcOffsetMinutes;
  }

  return { city, year, obliquityDeg, clockMode, dayCount, days };
}

/**
 * One day at full precision, for the scrubbed readout. The chart may be drawing a sampled year
 * that does not contain this day at all, and the readout must never show a neighbour's figures.
 */
export function dayAt(
  city: City,
  obliquityDeg: number,
  year: number,
  index: number,
  options: YearOptions = {},
): YearDay {
  const mode = options.clockMode ?? 'local';
  const startMs = utcMidnightMs(year, 1, 1);
  const dayMidnightMs = startMs + index * MS_PER_DAY;
  const previousOffset =
    mode === 'local' && index > 0
      ? utcOffsetMinutesAtNoon(dayMidnightMs - MS_PER_DAY, city.timeZone)
      : undefined;

  return computeDay(city, obliquityDeg, dayMidnightMs, index, mode, previousOffset);
}

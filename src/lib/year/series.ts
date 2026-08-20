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
import { localClock, localMinutesSinceMidnight } from '../time/index.ts';

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
  readonly solarNoonMinutes: number;
  readonly declinationDeg: number;
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
  readonly days: readonly YearDay[];
}

/**
 * A solar event lands on the same calendar date as its solar noon, but its wall clock can fall on
 * the far side of local midnight — a June sunrise at 23:50 belongs to the top of the chart, not the
 * bottom. Both edges are unwrapped onto noon's side of midnight, then clamped to the chart, which
 * is what makes a polar band fill to the edge instead of leaving a hole (docs/ui-spec.md).
 */
function morningMinutes(utcMs: number, timeZone: string, noonMinutes: number): number {
  const raw = localMinutesSinceMidnight(utcMs, timeZone);
  return Math.max(raw > noonMinutes ? raw - MINUTES_PER_DAY : raw, 0);
}

function eveningMinutes(utcMs: number, timeZone: string, noonMinutes: number): number {
  const raw = localMinutesSinceMidnight(utcMs, timeZone);
  return Math.min(raw < noonMinutes ? raw + MINUTES_PER_DAY : raw, MINUTES_PER_DAY);
}

function band(events: DayEvents, timeZone: string, noonMinutes: number): Band {
  const { rise, set } = events;
  if (rise.kind !== 'event' || set.kind !== 'event') {
    if (rise.kind === 'alwaysAbove') return { morning: 0, evening: MINUTES_PER_DAY };
    // Nothing crosses the threshold, so the band pinches shut where the Sun came closest.
    return { morning: noonMinutes, evening: noonMinutes };
  }

  return {
    morning: morningMinutes(rise.utcMs, timeZone, noonMinutes),
    evening: eveningMinutes(set.utcMs, timeZone, noonMinutes),
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

export function yearSeries(city: City, obliquityDeg: number, year: number): YearSeries {
  const startMs = utcMidnightMs(year, 1, 1);
  const dayCount = (utcMidnightMs(year + 1, 1, 1) - startMs) / MS_PER_DAY;

  const days: YearDay[] = [];
  let previousOffset: number | undefined;

  for (let index = 0; index < dayCount; index++) {
    const dayMidnightMs = startMs + index * MS_PER_DAY;
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

    const noonMinutes = localMinutesSinceMidnight(sunrise.solarNoonUtcMs, city.timeZone);
    const offset = utcOffsetMinutesAtNoon(dayMidnightMs, city.timeZone);
    const date = new Date(dayMidnightMs);

    days.push({
      index,
      utcMidnightMs: dayMidnightMs,
      month: date.getUTCMonth() + 1,
      dayOfMonth: date.getUTCDate(),
      utcOffsetMinutes: offset,
      clockBreak: previousOffset !== undefined && offset !== previousOffset,
      solarNoonMinutes: noonMinutes,
      declinationDeg: sunrise.declinationDeg,
      maxAltitudeDeg: maxAltitudeDeg(city.latitudeDeg, sunrise.declinationDeg),
      minAltitudeDeg: minAltitudeDeg(city.latitudeDeg, sunrise.declinationDeg),
      dayLengthMinutes: sunrise.minutesAboveZenith,
      rise: sunrise.rise,
      set: sunrise.set,
      bands: {
        sunrise: band(sunrise, city.timeZone, noonMinutes),
        civil: band(civil, city.timeZone, noonMinutes),
        nautical: band(nautical, city.timeZone, noonMinutes),
        astronomical: band(astronomical, city.timeZone, noonMinutes),
      },
    });

    previousOffset = offset;
  }

  return { city, year, obliquityDeg, days };
}

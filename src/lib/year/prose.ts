/**
 * Sentence assembly for the reactive prose (docs/design-direction.md §5.7). Pure: it takes a tilt
 * and returns text, mirroring `readings.ts`'s split between number and wording so both are
 * unit-tested without a DOM.
 *
 * The two cities named in the copy are Tampere and Niigata specifically, not whichever city is
 * currently in slot A or B — the design direction's "city names stay fixed" call. So this module
 * looks them up by id rather than taking `City` arguments.
 */
import { cityById } from '../../data/cities.ts';
import { ZENITH_DEG } from '../solar/index.ts';
import type { ClockMode } from '../time/index.ts';
import { formatAltitude, formatDuration, formatHhMm } from '../format.ts';
import { dayIndexFromDate, formatMonthDay } from './calendar.ts';
import { dayReading } from './readings.ts';
import { dayAt, yearSeries } from './series.ts';
import type { YearDay } from './series.ts';

const TAMPERE = cityById('tampere')!;
const NIIGATA = cityById('niigata')!;

/** Altitude the chart's civil band ends at (docs/solar-math.md §3), as the negative reading below
 * the horizon the copy talks in, rather than the zenith angle the solar layer works in. */
const CIVIL_TWILIGHT_ALTITUDE_DEG = 90 - ZENITH_DEG.civil;

const MINUTES_PER_DAY = 1440;

function unsigned(altitudeDeg: number): string {
  return formatAltitude(Math.abs(altitudeDeg));
}

/**
 * §1 ¶3. Two branches: an ordinary short day, or December already gone all the way to a polar
 * night (reachable above ~28.5° tilt, since Tampere sits at 61.5°N). June never reaches the
 * mirror case here — that is what §3 is about — so there is no third branch to cover.
 */
export function decemberClause(tiltDeg: number, year: number, clockMode: ClockMode): string {
  const index = dayIndexFromDate(year, 12, 21) ?? 0;
  const day = dayAt(TAMPERE, tiltDeg, year, index, { clockMode });
  const reading = dayReading(TAMPERE, day, clockMode);

  if (reading.sunrise.kind === 'phrase') {
    return (
      `none of it does. The Sun never comes up, staying ${unsigned(day.maxAltitudeDeg)} below ` +
      `the horizon all day. That is a polar night, and ${reading.dayLength} of daylight.`
    );
  }

  // Refraction lets the disc graze into a technical sunrise (docs/solar-math.md §7) in a band
  // just above the polar-night tilt where the geometric peak is still below the horizon, so the
  // wording is chosen from the sign actually computed rather than assumed from the branch.
  const above = day.maxAltitudeDeg >= 0;
  return (
    `very little of it does. The Sun rises at ${reading.sunrise.text}, climbs to ` +
    `${unsigned(day.maxAltitudeDeg)} ${above ? 'above' : 'below'} the horizon, and sets again at ` +
    `${reading.sunset.text}. That is ${reading.dayLength} of daylight.`
  );
}

/** §2 ¶2 — Tampere's local-clock solar noon on December 21, pinned to local clock: see the note on
 * `equationOfTimePeakMinutes` below for why. */
export function decemberSolarNoon(tiltDeg: number, year: number): string {
  const index = dayIndexFromDate(year, 12, 21) ?? 0;
  const day = dayAt(TAMPERE, tiltDeg, year, index, { clockMode: 'local' });
  return formatHhMm(day.solarNoonMinutes);
}

/**
 * §2 ¶3. Always computed on the local clock, whatever the page's clock-mode toggle currently
 * shows: the paragraph's whole point is the gap between local and solar noon, and under the
 * solar-time toggle that gap is zero by construction (§1 ¶4's "what must not move" reasoning,
 * design-direction.md §5.7).
 */
export function equationOfTimePeakMinutes(tiltDeg: number, year: number): string {
  const days = yearSeries(NIIGATA, tiltDeg, year, { clockMode: 'local' }).days;
  const peak = Math.max(...days.map((day) => Math.abs(day.equationOfTimeMin)));
  return String(Math.round(peak));
}

export interface SolarNoonRange {
  readonly min: string;
  readonly max: string;
}

export function niigataSolarNoonRange(tiltDeg: number, year: number): SolarNoonRange {
  const days = yearSeries(NIIGATA, tiltDeg, year, { clockMode: 'local' }).days;
  const minutes = days.map((day) => day.solarNoonMinutes);
  return { min: formatHhMm(Math.min(...minutes)), max: formatHhMm(Math.max(...minutes)) };
}

/**
 * §3 ¶1. Mirrors `decemberClause`: an ordinary short night, or June already gone all the way to
 * midnight sun (reachable above the same ~28.5° tilt). The night length is read off the day
 * length rather than fetched from the following day, which is accurate to within a minute or two
 * near a DST change — well inside the minute-level honesty the methods note already claims.
 */
export function juneClause(tiltDeg: number, year: number, clockMode: ClockMode): string {
  const index = dayIndexFromDate(year, 6, 21) ?? 0;
  const day = dayAt(TAMPERE, tiltDeg, year, index, { clockMode });
  const reading = dayReading(TAMPERE, day, clockMode);

  if (reading.sunset.kind === 'phrase') {
    return (
      `The Sun does not set at all. At its lowest it is still ${unsigned(day.minAltitudeDeg)} ` +
      `above the horizon: this is already the midnight sun.`
    );
  }

  const nightMinutes = Math.max(0, MINUTES_PER_DAY - day.dayLengthMinutes);
  const below = day.minAltitudeDeg <= 0;
  return (
    `The Sun sets at ${reading.sunset.text} and rises again at ${reading.sunrise.text}, ` +
    `${formatDuration(nightMinutes)} later. In between it does not go far down. At its lowest it ` +
    `is ${unsigned(day.minAltitudeDeg)} ${below ? 'below' : 'above'} the horizon.`
  );
}

/** The run of consecutive days whose lowest point stays inside civil twilight — this is what a
 * white night is, whether or not any day in the run also happens to be a midnight-sun day. */
export interface TwilightRun {
  readonly count: number;
  readonly fromIndex: number;
  readonly toIndex: number;
}

export function longestCivilTwilightRun(days: readonly YearDay[]): TwilightRun | null {
  let best: TwilightRun | null = null;
  let runStart = 0;
  let runLength = 0;

  for (const day of days) {
    if (day.minAltitudeDeg > CIVIL_TWILIGHT_ALTITUDE_DEG) {
      if (runLength === 0) runStart = day.index;
      runLength += 1;
      if (!best || runLength > best.count) {
        best = { count: runLength, fromIndex: runStart, toIndex: day.index };
      }
    } else {
      runLength = 0;
    }
  }

  return best;
}

/**
 * §3 ¶2, the first claim that inverts (design-direction.md §5.7): "not midnight sun, but a night
 * that never finishes darkening" is only true while June 21 itself stays under the midnight-sun
 * threshold. Three branches: no such run at all, an ordinary white-night run, or the run has
 * swallowed June 21 into genuine midnight sun.
 */
export function whiteNightsClause(tiltDeg: number, year: number, clockMode: ClockMode): string {
  const series = yearSeries(TAMPERE, tiltDeg, year, { clockMode });
  const run = longestCivilTwilightRun(series.days);
  const threshold = Math.abs(CIVIL_TWILIGHT_ALTITUDE_DEG);
  const juneIndex = dayIndexFromDate(year, 6, 21) ?? 0;
  const juneIsMidnightSun = series.days[juneIndex]?.set.kind === 'alwaysAbove';

  if (!run) {
    return (
      `Civil twilight ends at ${threshold}° below. At this tilt Tampere's nights clear that mark ` +
      `every night of the year: there is no white-night season to find.`
    );
  }

  const from = formatMonthDay(year, run.fromIndex);
  const to = formatMonthDay(year, run.toIndex);

  if (juneIsMidnightSun) {
    return (
      `Civil twilight ends at ${threshold}° below, and at this tilt Tampere is well past even ` +
      `that. From ${from} to ${to}, ${run.count} days running, the Sun never sets at all. This is ` +
      `midnight sun, not merely white nights.`
    );
  }

  return (
    `Civil twilight ends at ${threshold}° below. Tampere never gets there. From ${from} to ${to}, ` +
    `${run.count} nights running, the sky stays inside civil twilight until sunrise and the chart ` +
    `never reaches its night color. That is what white nights are: not midnight sun, but a night ` +
    `that never finishes darkening.`
  );
}

/**
 * §3 ¶3, the second claim that inverts: past 28.5° tilt the Arctic Circle sits south of Tampere,
 * not north of it, and "Tampere gets no midnight sun on any date of the year" stops being true.
 */
export function polarCircleClause(tiltDeg: number, year: number, clockMode: ClockMode): string {
  const circleLatitudeDeg = 90 - tiltDeg;
  const gapDeg = TAMPERE.latitudeDeg - circleLatitudeDeg;
  const gapKm = Math.round(Math.abs(gapDeg) * 111.32);

  if (gapDeg < 0) {
    return (
      `None of this needs the Arctic Circle, which is another ${Math.abs(gapDeg).toFixed(1)}° ` +
      `north at ${circleLatitudeDeg.toFixed(1)}°N, some ${gapKm} km away. Tampere gets no ` +
      `midnight sun on any date of the year at this tilt.`
    );
  }

  const midnightSunDays = yearSeries(TAMPERE, tiltDeg, year, { clockMode }).days.filter(
    (day) => day.set.kind === 'alwaysAbove',
  ).length;

  return (
    `At this tilt Tampere is inside the Arctic Circle, ${gapDeg.toFixed(1)}° past it — the circle ` +
    `itself sits at ${circleLatitudeDeg.toFixed(1)}°N, ${gapKm} km to the south. Tampere gets true ` +
    `midnight sun on ${midnightSunDays} dates this year, not just white nights.`
  );
}

/** §3 ¶4 — always negative in range, since Niigata's 37.9°N never reaches the polar circle even
 * at the maximum 45° tilt (`90 - 45 = 45 > 37.9`), so there is no branch to cover here. */
export function niigataJuneMinAltitude(
  tiltDeg: number,
  year: number,
  clockMode: ClockMode,
): string {
  const index = dayIndexFromDate(year, 6, 21) ?? 0;
  const day = dayAt(NIIGATA, tiltDeg, year, index, { clockMode });
  return unsigned(day.minAltitudeDeg);
}

export interface ReactiveProse {
  readonly 'dec-clause': string;
  readonly 'tampere-dec-noon': string;
  readonly 'eot-peak': string;
  readonly 'niigata-noon-min': string;
  readonly 'niigata-noon-max': string;
  readonly 'jun-clause': string;
  readonly 'twilight-clause': string;
  readonly 'polar-circle-clause': string;
  readonly 'niigata-jun-min-alt': string;
}

export function computeReactiveProse(
  tiltDeg: number,
  year: number,
  clockMode: ClockMode,
): ReactiveProse {
  const noonRange = niigataSolarNoonRange(tiltDeg, year);

  return {
    'dec-clause': decemberClause(tiltDeg, year, clockMode),
    'tampere-dec-noon': decemberSolarNoon(tiltDeg, year),
    'eot-peak': equationOfTimePeakMinutes(tiltDeg, year),
    'niigata-noon-min': noonRange.min,
    'niigata-noon-max': noonRange.max,
    'jun-clause': juneClause(tiltDeg, year, clockMode),
    'twilight-clause': whiteNightsClause(tiltDeg, year, clockMode),
    'polar-circle-clause': polarCircleClause(tiltDeg, year, clockMode),
    'niigata-jun-min-alt': niigataJuneMinAltitude(tiltDeg, year, clockMode),
  };
}

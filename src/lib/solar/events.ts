import { ZENITH_DEG } from './constants.ts';
import { MINUTES_PER_DAY, julianCenturyAtLocalNoon, minutesToUtcMs } from './julian.ts';
import { acosDeg, cosDeg, sinDeg, sunPosition } from './position.ts';

/** docs/solar-math.md §3 — never `null`, never `NaN`. */
export type SolarEvent =
  | { readonly kind: 'event'; readonly utcMs: number }
  | { readonly kind: 'alwaysAbove' }
  | { readonly kind: 'alwaysBelow' };

export interface DayQuery {
  /** Epoch ms of 00:00 UTC on the date being asked about. */
  readonly utcMidnightMs: number;
  readonly latitudeDeg: number;
  /** Positive east. */
  readonly longitudeDeg: number;
  readonly obliquityDeg: number;
}

export interface DayEvents {
  readonly declinationDeg: number;
  readonly equationOfTimeMin: number;
  readonly solarNoonUtcMs: number;
  readonly rise: SolarEvent;
  readonly set: SolarEvent;
  /** 0 when the Sun stays below the threshold all day, 1440 when it stays above. */
  readonly minutesAboveZenith: number;
}

type HourAngle =
  | { readonly kind: 'hourAngle'; readonly deg: number }
  | { readonly kind: 'alwaysAbove' }
  | { readonly kind: 'alwaysBelow' };

/** docs/solar-math.md §3 */
export function hourAngleDeg(
  latitudeDeg: number,
  declinationDeg: number,
  zenithDeg: number,
): HourAngle {
  const cosH =
    (cosDeg(zenithDeg) - sinDeg(latitudeDeg) * sinDeg(declinationDeg)) /
    (cosDeg(latitudeDeg) * cosDeg(declinationDeg));

  if (cosH > 1) return { kind: 'alwaysBelow' };
  if (cosH < -1) return { kind: 'alwaysAbove' };
  return { kind: 'hourAngle', deg: acosDeg(cosH) };
}

/** docs/solar-math.md §3 — minutes from UTC midnight, with no timezone offset applied. */
export function solarNoonUtcMinutes(longitudeDeg: number, equationOfTimeMin: number): number {
  return 720 - 4 * longitudeDeg - equationOfTimeMin;
}

export function dayEvents(query: DayQuery, zenithDeg: number = ZENITH_DEG.sunrise): DayEvents {
  const { utcMidnightMs, latitudeDeg, longitudeDeg, obliquityDeg } = query;

  const t = julianCenturyAtLocalNoon(utcMidnightMs, longitudeDeg);
  const { declinationDeg, equationOfTimeMin } = sunPosition(t, obliquityDeg);

  const noonMin = solarNoonUtcMinutes(longitudeDeg, equationOfTimeMin);
  const solarNoonUtcMs = minutesToUtcMs(utcMidnightMs, noonMin);
  const h = hourAngleDeg(latitudeDeg, declinationDeg, zenithDeg);

  if (h.kind !== 'hourAngle') {
    return {
      declinationDeg,
      equationOfTimeMin,
      solarNoonUtcMs,
      rise: { kind: h.kind },
      set: { kind: h.kind },
      minutesAboveZenith: h.kind === 'alwaysAbove' ? MINUTES_PER_DAY : 0,
    };
  }

  return {
    declinationDeg,
    equationOfTimeMin,
    solarNoonUtcMs,
    rise: { kind: 'event', utcMs: minutesToUtcMs(utcMidnightMs, noonMin - 4 * h.deg) },
    set: { kind: 'event', utcMs: minutesToUtcMs(utcMidnightMs, noonMin + 4 * h.deg) },
    minutesAboveZenith: 8 * h.deg,
  };
}

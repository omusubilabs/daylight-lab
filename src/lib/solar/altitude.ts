import type { DayQuery } from './events.ts';
import { MINUTES_PER_DAY, julianCenturyAtLocalNoon } from './julian.ts';
import { asinDeg, cosDeg, sinDeg, sunPosition, wrap } from './position.ts';

/** docs/solar-math.md §4 */
export function solarAltitudeDeg(query: DayQuery, minutesFromUtcMidnight: number): number {
  const t = julianCenturyAtLocalNoon(query.utcMidnightMs, query.longitudeDeg);
  const { declinationDeg, equationOfTimeMin } = sunPosition(t, query.obliquityDeg);

  const trueSolarTimeMin = wrap(
    minutesFromUtcMidnight + equationOfTimeMin + 4 * query.longitudeDeg,
    MINUTES_PER_DAY,
  );
  const hourAngle = trueSolarTimeMin / 4 - 180;

  return asinDeg(
    sinDeg(query.latitudeDeg) * sinDeg(declinationDeg) +
      cosDeg(query.latitudeDeg) * cosDeg(declinationDeg) * cosDeg(hourAngle),
  );
}

/** docs/solar-math.md §4 — closed form at solar noon; do not recover it by sampling. */
export function maxAltitudeDeg(latitudeDeg: number, declinationDeg: number): number {
  return 90 - Math.abs(latitudeDeg - declinationDeg);
}

/** docs/solar-math.md §4 — at solar midnight; negative means below the horizon. */
export function minAltitudeDeg(latitudeDeg: number, declinationDeg: number): number {
  return Math.abs(latitudeDeg + declinationDeg) - 90;
}

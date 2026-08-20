export const MS_PER_DAY = 86_400_000;
export const MS_PER_MINUTE = 60_000;
export const MINUTES_PER_DAY = 1440;

/** docs/solar-math.md §1 */
export function julianDay(epochMs: number): number {
  return epochMs / MS_PER_DAY + 2440587.5;
}

/** docs/solar-math.md §1 */
export function julianCentury(jd: number): number {
  return (jd - 2451545.0) / 36525;
}

/**
 * docs/solar-math.md §1 — the century must be evaluated at local solar noon of the date, not at
 * 00:00 UTC, or every event picks up a small systematic error the fixtures do not allow for.
 */
export function julianCenturyAtLocalNoon(utcMidnightMs: number, longitudeDeg: number): number {
  return julianCentury(julianDay(utcMidnightMs + MS_PER_DAY * (0.5 - longitudeDeg / 360)));
}

/** `Date.UTC` is a pure calendar function; it never reads the host clock (CLAUDE.md rule 3). */
export function utcMidnightMs(year: number, month: number, day: number): number {
  return Date.UTC(year, month - 1, day);
}

export function minutesToUtcMs(midnightMs: number, minutesFromUtcMidnight: number): number {
  return midnightMs + minutesFromUtcMidnight * MS_PER_MINUTE;
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export function sinDeg(deg: number): number {
  return Math.sin(deg * DEG_TO_RAD);
}

export function cosDeg(deg: number): number {
  return Math.cos(deg * DEG_TO_RAD);
}

export function tanDeg(deg: number): number {
  return Math.tan(deg * DEG_TO_RAD);
}

export function asinDeg(x: number): number {
  return Math.asin(x) * RAD_TO_DEG;
}

export function acosDeg(x: number): number {
  return Math.acos(x) * RAD_TO_DEG;
}

export function wrap(value: number, period: number): number {
  return ((value % period) + period) % period;
}

export interface SunPosition {
  readonly declinationDeg: number;
  readonly equationOfTimeMin: number;
}

/**
 * docs/solar-math.md §2 — NOAA series, with the caller's tilt substituted for the mean-obliquity
 * polynomial. Declination and the equation of time are returned together because both depend on
 * `obliquityDeg`; computing the equation of time from a constant is the bug §2 calls out.
 */
export function sunPosition(julianCentury: number, obliquityDeg: number): SunPosition {
  const t = julianCentury;

  const meanLongitudeDeg = wrap(280.46646 + t * (36000.76983 + t * 0.0003032), 360);
  const meanAnomalyDeg = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const eccentricity = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);

  const centerDeg =
    sinDeg(meanAnomalyDeg) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    sinDeg(2 * meanAnomalyDeg) * (0.019993 - 0.000101 * t) +
    sinDeg(3 * meanAnomalyDeg) * 0.000289;

  const trueLongitudeDeg = meanLongitudeDeg + centerDeg;
  const apparentLongitudeDeg = trueLongitudeDeg - 0.00569 - 0.00478 * sinDeg(125.04 - 1934.136 * t);

  const epsilonDeg = obliquityDeg + 0.00256 * cosDeg(125.04 - 1934.136 * t);

  const declinationDeg = asinDeg(sinDeg(epsilonDeg) * sinDeg(apparentLongitudeDeg));

  const y = tanDeg(epsilonDeg / 2) ** 2;
  const meanLongitudeRad = meanLongitudeDeg * DEG_TO_RAD;
  const meanAnomalyRad = meanAnomalyDeg * DEG_TO_RAD;
  const equationOfTimeMin =
    4 *
    RAD_TO_DEG *
    (y * Math.sin(2 * meanLongitudeRad) -
      2 * eccentricity * Math.sin(meanAnomalyRad) +
      4 * eccentricity * y * Math.sin(meanAnomalyRad) * Math.cos(2 * meanLongitudeRad) -
      0.5 * y * y * Math.sin(4 * meanLongitudeRad) -
      1.25 * eccentricity * eccentricity * Math.sin(2 * meanAnomalyRad));

  return { declinationDeg, equationOfTimeMin };
}

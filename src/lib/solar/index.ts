export { EARTH_OBLIQUITY_DEG, ZENITH_DEG } from './constants.ts';
export type { ThresholdName } from './constants.ts';

export {
  MINUTES_PER_DAY,
  MS_PER_DAY,
  MS_PER_MINUTE,
  julianCentury,
  julianCenturyAtLocalNoon,
  julianDay,
  minutesToUtcMs,
  utcMidnightMs,
} from './julian.ts';

export { sunPosition } from './position.ts';
export type { SunPosition } from './position.ts';

export { dayEvents, hourAngleDeg, solarNoonUtcMinutes } from './events.ts';
export type { DayEvents, DayQuery, SolarEvent } from './events.ts';

export { maxAltitudeDeg, minAltitudeDeg, solarAltitudeDeg } from './altitude.ts';

/**
 * The whole app state, which is also the whole share link (docs/product-spec.md). Everything here
 * is pure: normalizing is what makes a malformed hash fall back to a default instead of throwing.
 */
import { DEFAULT_CITY_A_ID, DEFAULT_CITY_B_ID, cityById } from '../data/cities.ts';
import { EARTH_OBLIQUITY_DEG } from '../lib/solar/index.ts';
import type { ClockMode } from '../lib/time/index.ts';
import { dayCountInYear, dayIndexFromDate } from '../lib/year/index.ts';

/** Fixed so screenshots, share links and golden tests stay stable (docs/product-spec.md). */
export const REFERENCE_YEAR = 2026;

export const TILT_MIN_DEG = 0;
export const TILT_MAX_DEG = 45;
export const TILT_STEP_DEG = 0.01;

export const DAY_COUNT = dayCountInYear(REFERENCE_YEAR);

/** The December solstice: the question the product exists to answer, open on arrival. */
const DEFAULT_DAY_INDEX = dayIndexFromDate(REFERENCE_YEAR, 12, 21) ?? 0;

export interface AppState {
  readonly tiltDeg: number;
  readonly cityAId: string;
  readonly cityBId: string;
  readonly dayIndex: number;
  readonly clockMode: ClockMode;
}

export const DEFAULT_STATE: AppState = {
  tiltDeg: EARTH_OBLIQUITY_DEG,
  cityAId: DEFAULT_CITY_A_ID,
  cityBId: DEFAULT_CITY_B_ID,
  dayIndex: DEFAULT_DAY_INDEX,
  clockMode: 'local',
};

export function clampTilt(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_STATE.tiltDeg;
  const clamped = Math.min(Math.max(value, TILT_MIN_DEG), TILT_MAX_DEG);
  // The slider's step is 0.01°, and binary floats would otherwise leak 23.440000000000001 into a
  // share link.
  return Number(clamped.toFixed(2));
}

export function clampDayIndex(index: number): number {
  if (!Number.isFinite(index)) return DEFAULT_STATE.dayIndex;
  return Math.min(Math.max(Math.round(index), 0), DAY_COUNT - 1);
}

export function resolveCityId(id: string | null | undefined, fallback: string): string {
  return id && cityById(id) ? id : fallback;
}

export function resolveClockMode(mode: string | null | undefined): ClockMode {
  return mode === 'solar' ? 'solar' : 'local';
}

export function sameState(a: AppState, b: AppState): boolean {
  return (
    a.tiltDeg === b.tiltDeg &&
    a.cityAId === b.cityAId &&
    a.cityBId === b.cityBId &&
    a.dayIndex === b.dayIndex &&
    a.clockMode === b.clockMode
  );
}

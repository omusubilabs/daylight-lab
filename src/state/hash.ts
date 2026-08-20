/**
 * The URL hash is the only persistence the product has (docs/product-spec.md). Unknown keys are
 * ignored and malformed values fall back to the default, so no share link can throw.
 */
import { dayIndexFromIso, isoFromDayIndex } from '../lib/year/index.ts';
import {
  DEFAULT_STATE,
  REFERENCE_YEAR,
  clampDayIndex,
  clampTilt,
  resolveCityId,
  resolveClockMode,
} from './appState.ts';
import type { AppState } from './appState.ts';

export function parseHash(hash: string): AppState {
  const params = new URLSearchParams(hash.replace(/^#/, ''));

  const tilt = params.get('tilt');
  const date = params.get('date');
  const dayIndex = date === null ? null : dayIndexFromIso(REFERENCE_YEAR, date);

  return {
    tiltDeg: tilt === null || tilt.trim() === '' ? DEFAULT_STATE.tiltDeg : clampTilt(Number(tilt)),
    cityAId: resolveCityId(params.get('a'), DEFAULT_STATE.cityAId),
    cityBId: resolveCityId(params.get('b'), DEFAULT_STATE.cityBId),
    dayIndex: dayIndex === null ? DEFAULT_STATE.dayIndex : clampDayIndex(dayIndex),
    clockMode: resolveClockMode(params.get('clock')),
  };
}

export function formatHash(state: AppState): string {
  const tilt = String(clampTilt(state.tiltDeg));
  const date = isoFromDayIndex(REFERENCE_YEAR, clampDayIndex(state.dayIndex));

  return `#tilt=${tilt}&a=${state.cityAId}&b=${state.cityBId}&date=${date}&clock=${state.clockMode}`;
}

import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE, REFERENCE_YEAR, clampDayIndex, clampTilt } from '../src/state/appState.ts';
import type { AppState } from '../src/state/appState.ts';
import { formatHash, parseHash } from '../src/state/hash.ts';
import { dayIndexFromDate } from '../src/lib/year/index.ts';

const solstice = dayIndexFromDate(REFERENCE_YEAR, 12, 21) ?? 0;

const STATES: AppState[] = [
  DEFAULT_STATE,
  { tiltDeg: 0, cityAId: 'tromso', cityBId: 'ushuaia', dayIndex: 0, clockMode: 'solar' },
  { tiltDeg: 45, cityAId: 'sydney', cityBId: 'nairobi', dayIndex: 364, clockMode: 'local' },
  { tiltDeg: 7.25, cityAId: 'naha', cityBId: 'naha', dayIndex: solstice, clockMode: 'solar' },
];

describe('the hash is the share link', () => {
  it('round-trips every part of the state', () => {
    for (const state of STATES) {
      expect(parseHash(formatHash(state)), formatHash(state)).toEqual(state);
    }
  });

  it('writes the shape docs/product-spec.md documents', () => {
    expect(formatHash(DEFAULT_STATE)).toBe(
      '#tilt=23.44&a=tampere&b=niigata&date=2026-12-21&clock=local',
    );
  });

  it('survives a reload of the URL it just wrote, hash character for hash character', () => {
    const once = formatHash(DEFAULT_STATE);
    expect(formatHash(parseHash(once))).toBe(once);
  });

  it('ignores keys it does not know', () => {
    expect(parseHash('#tilt=30&zoom=4&theme=neon&a=tokyo')).toEqual({
      ...DEFAULT_STATE,
      tiltDeg: 30,
      cityAId: 'tokyo',
    });
  });

  it('falls back to the default for anything malformed, and never throws', () => {
    const junk = [
      '',
      '#',
      '#tilt=&a=&b=&date=&clock=',
      '#tilt=NaN&a=atlantis&b=%%%&date=not-a-date&clock=sidereal',
      '#tilt=abc&date=2026-02-30',
      '#tilt=-12&date=2025-12-21',
      '#tilt=900&date=2026-13-01',
      '#a=tampere&a=tokyo',
    ];
    for (const hash of junk) {
      expect(() => parseHash(hash), hash).not.toThrow();
    }
    expect(parseHash('#tilt=NaN&a=atlantis&b=%%%&date=not-a-date&clock=sidereal')).toEqual(
      DEFAULT_STATE,
    );
    // A date outside the reference year is not this year's chart, so it is not a usable date.
    expect(parseHash('#date=2025-12-21').dayIndex).toBe(DEFAULT_STATE.dayIndex);
  });

  it('clamps a tilt outside the slider rather than dropping it', () => {
    expect(parseHash('#tilt=-5').tiltDeg).toBe(0);
    expect(parseHash('#tilt=90').tiltDeg).toBe(45);
    expect(clampTilt(23.440000000000001)).toBe(23.44);
    // Infinity is malformed rather than large, so it falls back instead of pinning to the end.
    expect(clampTilt(Number.POSITIVE_INFINITY)).toBe(DEFAULT_STATE.tiltDeg);
    expect(clampTilt(Number.NaN)).toBe(DEFAULT_STATE.tiltDeg);
  });

  it('keeps a day index inside the year', () => {
    expect(clampDayIndex(-4)).toBe(0);
    expect(clampDayIndex(9999)).toBe(364);
    expect(clampDayIndex(Number.NaN)).toBe(DEFAULT_STATE.dayIndex);
  });
});

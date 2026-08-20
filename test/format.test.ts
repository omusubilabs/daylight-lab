import { describe, expect, it } from 'vitest';
import {
  formatAltitude,
  formatDuration,
  formatHhMm,
  formatLatitude,
  formatTilt,
} from '../src/lib/format.ts';

describe('readout formatting', () => {
  it('writes a 24-hour clock, zero-padded on both fields', () => {
    expect(formatHhMm(0)).toBe('00:00');
    expect(formatHhMm(7 * 60 + 5)).toBe('07:05');
    expect(formatHhMm(23 * 60 + 59)).toBe('23:59');
  });

  it('rolls the last minute of the day round to midnight rather than printing 24:00', () => {
    expect(formatHhMm(1440)).toBe('00:00');
    expect(formatHhMm(1439.7)).toBe('00:00');
    expect(formatHhMm(-30)).toBe('23:30');
  });

  it('writes durations as Xh Ym, never a bare number', () => {
    expect(formatDuration(341)).toBe('5h 41m');
    expect(formatDuration(0)).toBe('0h 00m');
    expect(formatDuration(1440)).toBe('24h 00m');
  });

  it('carries the hemisphere on a latitude and the symbol on every degree', () => {
    expect(formatLatitude(61.4978)).toBe('61.5°N');
    expect(formatLatitude(-54.8019)).toBe('54.8°S');
    expect(formatLatitude(0)).toBe('0.0°N');
    expect(formatAltitude(5.14)).toBe('5.1°');
    expect(formatAltitude(-11.53)).toBe('-11.5°');
  });

  it('trims the slider precision that a whole-degree tilt does not need', () => {
    expect(formatTilt(23.44)).toBe('23.44°');
    expect(formatTilt(0)).toBe('0°');
    expect(formatTilt(40)).toBe('40°');
    expect(formatTilt(20.5)).toBe('20.5°');
  });
});

import { describe, expect, it } from 'vitest';
import { cityById } from '../src/data/cities.ts';
import type { City } from '../src/data/cities.ts';
import { EARTH_OBLIQUITY_DEG } from '../src/lib/solar/index.ts';
import { yearSeries } from '../src/lib/year/index.ts';
import type { YearDay } from '../src/lib/year/index.ts';

const YEAR = 2026;

function city(id: string): City {
  const found = cityById(id);
  if (!found) throw new Error(`unknown city id: ${id}`);
  return found;
}

const tampere = city('tampere');
const niigata = city('niigata');

function onDate(days: readonly YearDay[], month: number, dayOfMonth: number): YearDay {
  const day = days.find((d) => d.month === month && d.dayOfMonth === dayOfMonth);
  if (!day) throw new Error(`no day ${month}-${dayOfMonth} in the series`);
  return day;
}

describe('year series', () => {
  it('covers every day of the reference year', () => {
    const series = yearSeries(tampere, EARTH_OBLIQUITY_DEG, YEAR);
    expect(series.days).toHaveLength(365);
    expect(series.days[0]?.month).toBe(1);
    expect(series.days[364]?.month).toBe(12);
    expect(series.days[364]?.dayOfMonth).toBe(31);
  });

  it('breaks Tampere at both EU clock changes and never breaks Niigata', () => {
    const north = yearSeries(tampere, EARTH_OBLIQUITY_DEG, YEAR).days.filter((d) => d.clockBreak);
    const east = yearSeries(niigata, EARTH_OBLIQUITY_DEG, YEAR).days.filter((d) => d.clockBreak);

    expect(north.map((d) => [d.month, d.dayOfMonth])).toEqual([
      [3, 29],
      [10, 25],
    ]);
    expect(east).toHaveLength(0);
  });

  it('steps Tampere sunrise by about an hour across the March clock change', () => {
    const days = yearSeries(tampere, EARTH_OBLIQUITY_DEG, YEAR).days;
    const before = onDate(days, 3, 28).bands.sunrise.morning;
    const after = onDate(days, 3, 29).bands.sunrise.morning;

    expect(after - before).toBeGreaterThan(50);
    expect(after - before).toBeLessThan(62);
  });

  it('keeps Niigata solar noon near 11:44 with no seam in March', () => {
    const days = yearSeries(niigata, EARTH_OBLIQUITY_DEG, YEAR).days;
    for (const day of days) {
      expect(day.solarNoonMinutes).toBeGreaterThan(11 * 60 + 25);
      expect(day.solarNoonMinutes).toBeLessThan(12 * 60 + 5);
    }
    expect(
      Math.abs(
        onDate(days, 3, 29).bands.sunrise.morning - onDate(days, 3, 28).bands.sunrise.morning,
      ),
    ).toBeLessThan(5);
  });

  it('nests the bands and keeps every edge inside the chart, at every tilt', () => {
    for (const tilt of [0, 23.44, 40]) {
      for (const id of ['tromso', 'tampere', 'niigata', 'singapore', 'sydney', 'ushuaia']) {
        const series = yearSeries(city(id), tilt, YEAR);
        for (const day of series.days) {
          const { sunrise, civil, nautical, astronomical } = day.bands;
          const label = `${id} ${tilt}° ${day.month}-${day.dayOfMonth}`;

          for (const band of [sunrise, civil, nautical, astronomical]) {
            expect(Number.isFinite(band.morning), label).toBe(true);
            expect(band.morning, label).toBeGreaterThanOrEqual(0);
            expect(band.evening, label).toBeLessThanOrEqual(1440);
            expect(band.morning, label).toBeLessThanOrEqual(band.evening);
          }

          expect(civil.morning, label).toBeLessThanOrEqual(sunrise.morning);
          expect(nautical.morning, label).toBeLessThanOrEqual(civil.morning);
          expect(astronomical.morning, label).toBeLessThanOrEqual(nautical.morning);
          expect(civil.evening, label).toBeGreaterThanOrEqual(sunrise.evening);
          expect(nautical.evening, label).toBeGreaterThanOrEqual(civil.evening);
          expect(astronomical.evening, label).toBeGreaterThanOrEqual(nautical.evening);
        }
      }
    }
  });

  it('fills Tampere to both chart edges at 40° tilt, and to neither at 23.44°', () => {
    const extreme = yearSeries(tampere, 40, YEAR).days;
    const midsummer = onDate(extreme, 6, 21).bands.sunrise;
    expect(midsummer.morning).toBe(0);
    expect(midsummer.evening).toBe(1440);

    const midwinter = onDate(extreme, 12, 21).bands.sunrise;
    expect(midwinter.morning).toBe(midwinter.evening);

    const actual = yearSeries(tampere, EARTH_OBLIQUITY_DEG, YEAR).days;
    expect(onDate(actual, 6, 21).bands.sunrise.morning).toBeGreaterThan(0);
    expect(onDate(actual, 12, 21).bands.sunrise.evening).toBeLessThan(1440);
  });

  it('flattens every city to a ~12h band at 0° tilt', () => {
    for (const id of ['tromso', 'tampere', 'niigata', 'sydney']) {
      const days = yearSeries(city(id), 0, YEAR).days;
      const lengths = days.map((day) => day.dayLengthMinutes);
      expect(Math.max(...lengths) - Math.min(...lengths)).toBeLessThan(2);
    }
  });
});

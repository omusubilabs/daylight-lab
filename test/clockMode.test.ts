import { describe, expect, it } from 'vitest';
import { cityById } from '../src/data/cities.ts';
import type { City } from '../src/data/cities.ts';
import { EARTH_OBLIQUITY_DEG } from '../src/lib/solar/index.ts';
import { clockMinutes } from '../src/lib/time/index.ts';
import { clockContextFor, dayAt, yearSeries } from '../src/lib/year/index.ts';

const YEAR = 2026;

function city(id: string): City {
  const found = cityById(id);
  if (!found) throw new Error(`unknown city id: ${id}`);
  return found;
}

const tampere = city('tampere');
const niigata = city('niigata');

const solar = { clockMode: 'solar' } as const;
const local = { clockMode: 'local' } as const;

describe('solar time (docs/solar-math.md §5.5)', () => {
  it('puts solar noon at 12:00 every day of the year, which is the point of the mode', () => {
    for (const id of ['tampere', 'niigata', 'naha', 'anchorage', 'ushuaia']) {
      for (const day of yearSeries(city(id), EARTH_OBLIQUITY_DEG, YEAR, solar).days) {
        expect(day.solarNoonMinutes, `${id} ${day.month}-${day.dayOfMonth}`).toBeCloseTo(720, 6);
      }
    }
  });

  it('has no clock break anywhere, because no zone is ever consulted', () => {
    const days = yearSeries(tampere, EARTH_OBLIQUITY_DEG, YEAR, solar).days;
    expect(days.filter((day) => day.clockBreak)).toHaveLength(0);
    expect(
      yearSeries(tampere, EARTH_OBLIQUITY_DEG, YEAR, local).days.filter((day) => day.clockBreak),
    ).toHaveLength(2);
  });

  it('hangs sunrise and sunset symmetrically about noon', () => {
    for (const day of yearSeries(tampere, EARTH_OBLIQUITY_DEG, YEAR, solar).days) {
      if (day.rise.kind !== 'event') continue;
      const { morning, evening } = day.bands.sunrise;
      expect(morning + evening, `${day.month}-${day.dayOfMonth}`).toBeCloseTo(1440, 6);
    }
  });

  it('changes only the clock, never the geometry', () => {
    const inLocal = yearSeries(niigata, EARTH_OBLIQUITY_DEG, YEAR, local).days;
    const inSolar = yearSeries(niigata, EARTH_OBLIQUITY_DEG, YEAR, solar).days;

    inLocal.forEach((day, index) => {
      const other = inSolar[index];
      expect(other?.dayLengthMinutes).toBeCloseTo(day.dayLengthMinutes, 9);
      expect(other?.maxAltitudeDeg).toBeCloseTo(day.maxAltitudeDeg, 9);
      expect(other?.declinationDeg).toBeCloseTo(day.declinationDeg, 9);
    });
  });

  it('keeps the local clock as the default, so an old share link reads the same', () => {
    const days = yearSeries(tampere, EARTH_OBLIQUITY_DEG, YEAR).days;
    expect(days[0]?.solarNoonMinutes).not.toBeCloseTo(720, 3);
  });

  it('still lands Niigata solar noon near 11:44 on the local clock', () => {
    const day = dayAt(niigata, EARTH_OBLIQUITY_DEG, YEAR, 100, local);
    const context = clockContextFor(niigata, day, 'local');
    expect(clockMinutes(day.solarNoonUtcMs, context)).toBeCloseTo(day.solarNoonMinutes, 9);
    expect(day.solarNoonMinutes).toBeGreaterThan(11 * 60 + 25);
    expect(day.solarNoonMinutes).toBeLessThan(12 * 60 + 5);
  });
});

describe('a single day solved on its own', () => {
  it('matches the same day inside the full year, in either clock', () => {
    for (const options of [local, solar]) {
      const series = yearSeries(tampere, EARTH_OBLIQUITY_DEG, YEAR, options);
      for (const index of [0, 87, 180, 297, 364]) {
        expect(dayAt(tampere, EARTH_OBLIQUITY_DEG, YEAR, index, options)).toEqual(
          series.days[index],
        );
      }
    }
  });

  it('sees the clock change on the day it happens, with no year around it', () => {
    const marchChange = dayAt(tampere, EARTH_OBLIQUITY_DEG, YEAR, 87, local);
    expect([marchChange.month, marchChange.dayOfMonth]).toEqual([3, 29]);
    expect(marchChange.clockBreak).toBe(true);
    expect(dayAt(tampere, EARTH_OBLIQUITY_DEG, YEAR, 86, local).clockBreak).toBe(false);
  });
});

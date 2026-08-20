import { describe, expect, it } from 'vitest';
import { cityById } from '../src/data/cities.ts';
import type { City } from '../src/data/cities.ts';
import { EARTH_OBLIQUITY_DEG } from '../src/lib/solar/index.ts';
import {
  dayAt,
  dayIndexFromDate,
  dayReading,
  monthlySamples,
  withSuffix,
  yearSeries,
} from '../src/lib/year/index.ts';

const YEAR = 2026;

function city(id: string): City {
  const found = cityById(id);
  if (!found) throw new Error(`unknown city id: ${id}`);
  return found;
}

function dayIndex(month: number, dayOfMonth: number): number {
  const index = dayIndexFromDate(YEAR, month, dayOfMonth);
  if (index === null) throw new Error(`no ${month}-${dayOfMonth} in ${YEAR}`);
  return index;
}

function readingOn(id: string, month: number, dayOfMonth: number, mode: 'local' | 'solar') {
  const target = city(id);
  const options = { clockMode: mode } as const;
  return dayReading(
    target,
    dayAt(target, EARTH_OBLIQUITY_DEG, YEAR, dayIndex(month, dayOfMonth), options),
    mode,
  );
}

const DECEMBER_SOLSTICE = [12, 21] as const;
const JUNE_SOLSTICE = [6, 21] as const;

describe('day readings', () => {
  it('renders the December solstice figures the page opens on', () => {
    const reading = readingOn('tampere', ...DECEMBER_SOLSTICE, 'local');

    expect(reading.sunrise).toEqual({ kind: 'time', text: '09:42' });
    expect(reading.sunset).toEqual({ kind: 'time', text: '15:03' });
    expect(reading.dayLength).toBe('5h 21m');
    expect(reading.solarNoon).toBe('12:23');
    expect(reading.maxAltitude).toBe('5.1°');
  });

  it('names the polar cases instead of printing a time that did not happen', () => {
    const polarNight = readingOn('tromso', ...DECEMBER_SOLSTICE, 'local');
    const midnightSun = readingOn('tromso', ...JUNE_SOLSTICE, 'local');

    expect(polarNight.sunrise).toEqual({ kind: 'phrase', text: 'Polar night' });
    expect(polarNight.sunset.text).toBe('Polar night');
    expect(polarNight.dayLength).toBe('0h 00m');
    expect(midnightSun.sunrise).toEqual({ kind: 'phrase', text: 'Midnight sun' });
    expect(midnightSun.dayLength).toBe('24h 00m');
  });

  it('appends the clock to a time but never to a phrase', () => {
    const tampere = readingOn('tampere', ...DECEMBER_SOLSTICE, 'local');
    const tromso = readingOn('tromso', ...DECEMBER_SOLSTICE, 'local');

    expect(withSuffix(tampere.sunrise, tampere.suffix)).toBe(`09:42 ${tampere.suffix}`);
    expect(tampere.suffix).not.toBe('');
    expect(withSuffix(tromso.sunrise, tromso.suffix)).toBe('Polar night');
  });

  it('marks solar-time readings as solar, with noon at 12:00 (docs/solar-math.md §5.5)', () => {
    const reading = readingOn('niigata', ...DECEMBER_SOLSTICE, 'solar');

    expect(reading.suffix).toBe('solar');
    expect(reading.solarNoon).toBe('12:00');
    // Removing the clock cannot change how long the Sun is up.
    expect(reading.dayLength).toBe(readingOn('niigata', ...DECEMBER_SOLSTICE, 'local').dayLength);
  });

  it("puts Niigata's local solar noon before 12:00, as its longitude requires", () => {
    expect(readingOn('niigata', ...DECEMBER_SOLSTICE, 'local').solarNoon).toBe('11:41');
  });
});

describe('monthly samples for the hidden data table', () => {
  const series = yearSeries(city('tampere'), EARTH_OBLIQUITY_DEG, YEAR, { clockMode: 'local' });

  it('returns one row per month, in order, close to mid-month', () => {
    const samples = monthlySamples(series);

    expect(samples.map((sample) => sample.month)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(samples[0]?.label).toBe('January');
    expect(samples[11]?.label).toBe('December');
    for (const sample of samples) expect(sample.day.dayOfMonth).toBe(15);
  });

  it('still returns twelve rows from the sampled series drawn during a drag', () => {
    const draft = yearSeries(city('tampere'), EARTH_OBLIQUITY_DEG, YEAR, {
      clockMode: 'local',
      sampleStep: 2,
    });
    const samples = monthlySamples(draft);

    expect(samples).toHaveLength(12);
    for (const sample of samples)
      expect(Math.abs(sample.day.dayOfMonth - 15)).toBeLessThanOrEqual(1);
  });

  it('carries the DST change into the rows, so the table cannot hide it', () => {
    const suffixes = monthlySamples(series).map(
      (sample) => dayReading(series.city, sample.day, 'local').suffix,
    );

    expect(new Set(suffixes).size).toBe(2);
  });
});

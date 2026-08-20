import { describe, expect, it } from 'vitest';
import {
  EARTH_OBLIQUITY_DEG,
  MS_PER_MINUTE,
  dayEvents,
  utcMidnightMs,
} from '../src/lib/solar/index.ts';
import type { SolarEvent } from '../src/lib/solar/index.ts';

// docs/solar-math.md §8a — the fixture is written by a human from the NOAA Solar Calculator and
// may not exist yet. A glob tolerates the missing file; a static import would not compile.
const loaded = import.meta.glob('./fixtures/noaa-golden.json', {
  eager: true,
  import: 'default',
});
const fixture = Object.values(loaded)[0];

const POLAR = ['alwaysAbove', 'alwaysBelow'] as const;
type Polar = (typeof POLAR)[number];

interface GoldenCase {
  readonly city: string;
  readonly latitudeDeg: number;
  readonly longitudeDeg: number;
  readonly date: string;
  readonly toleranceSeconds: number;
  readonly sunriseUtc: string;
  readonly solarNoonUtc: string;
  readonly sunsetUtc: string;
}

function fail(message: string): never {
  throw new Error(`test/fixtures/noaa-golden.json: ${message}`);
}

function parseHeader(raw: unknown): { source: string; retrieved: string; cases: GoldenCase[] } {
  if (typeof raw !== 'object' || raw === null) fail('expected a JSON object');
  const file = raw as Record<string, unknown>;

  const source = file['source'];
  const retrieved = file['retrieved'];
  if (typeof source !== 'string' || source.length === 0)
    fail('"source" must name where the values came from');
  if (typeof retrieved !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(retrieved))
    fail('"retrieved" must be the retrieval date as YYYY-MM-DD');

  const cases = file['cases'];
  if (!Array.isArray(cases)) fail('"cases" must be an array');
  // A header-only file would otherwise pass trivially and unblock M2 with nothing verified.
  if (cases.length === 0) fail('"cases" is empty; add the readings from NOAA');

  return { source, retrieved, cases: cases.map(parseCase) };
}

function parseCase(raw: unknown, index: number): GoldenCase {
  if (typeof raw !== 'object' || raw === null) fail(`case ${index} is not an object`);
  const entry = raw as Record<string, unknown>;
  const label = `case ${index} (${String(entry['city'])} ${String(entry['date'])})`;

  const text = (key: string): string => {
    const value = entry[key];
    if (value === null) fail(`${label} has no "${key}" yet; read it off NOAA and fill it in`);
    if (typeof value !== 'string') fail(`${label}: "${key}" must be a string`);
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(value) && !POLAR.includes(value as Polar))
      fail(`${label}: "${key}" must be HH:MM, HH:MM:SS, "alwaysAbove" or "alwaysBelow"`);
    return value;
  };

  const number = (key: string): number => {
    const value = entry[key];
    if (typeof value !== 'number' || !Number.isFinite(value))
      fail(`${label}: "${key}" must be a number`);
    return value;
  };

  const date = entry['date'];
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    fail(`${label}: "date" must be YYYY-MM-DD`);
  const city = entry['city'];
  if (typeof city !== 'string' || city.length === 0) fail(`${label}: "city" must be a name`);

  return {
    city,
    date,
    latitudeDeg: number('latitudeDeg'),
    longitudeDeg: number('longitudeDeg'),
    toleranceSeconds: number('toleranceSeconds'),
    sunriseUtc: text('sunriseUtc'),
    solarNoonUtc: text('solarNoonUtc'),
    sunsetUtc: text('sunsetUtc'),
  };
}

function midnightMsOf(date: string): number {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  return utcMidnightMs(year, month, day);
}

/**
 * NOAA reports a UTC wall clock, and east of Greenwich sunrise falls on the previous UTC date —
 * Niigata rises around 20:33 UTC of the day before. So a recorded clock is resolved to whichever
 * day puts it nearest the reference instant, and every comparison is anchored on solar noon.
 */
function clockNear(referenceMs: number, midnightMs: number, clock: string): number {
  const [hours, minutes, seconds = 0] = clock.split(':').map(Number) as [number, number, number?];
  const sameDay = midnightMs + ((hours * 60 + minutes) * 60 + seconds) * 1000;
  const dayMs = 24 * 60 * MS_PER_MINUTE;
  return sameDay + Math.round((referenceMs - sameDay) / dayMs) * dayMs;
}

function secondsApart(a: number, b: number): number {
  return Math.abs(a - b) / 1000;
}

if (fixture === undefined) {
  describe.skip('§8a golden fixtures — not written yet, see docs/solar-math.md §8a', () => {
    it('waits for a human to record the NOAA readings', () => {});
  });
} else {
  const { cases } = parseHeader(fixture);

  describe('§8a golden fixtures', () => {
    it('records a tolerance no looser than §8a allows', () => {
      for (const item of cases) {
        const allowed = Math.abs(item.latitudeDeg) >= 60 ? 120 : 60;
        expect(item.toleranceSeconds, `${item.city} ${item.date}`).toBeLessThanOrEqual(allowed);
      }
    });

    it.each(cases.map((item) => [`${item.city} ${item.date}`, item] as const))(
      'matches NOAA at %s',
      (label, item) => {
        const midnightMs = midnightMsOf(item.date);
        const day = dayEvents({
          utcMidnightMs: midnightMs,
          latitudeDeg: item.latitudeDeg,
          longitudeDeg: item.longitudeDeg,
          obliquityDeg: EARTH_OBLIQUITY_DEG,
        });

        const noonMs = clockNear(day.solarNoonUtcMs, midnightMs, item.solarNoonUtc);

        const check = (name: string, expectedClock: string, actual: SolarEvent) => {
          if (POLAR.includes(expectedClock as Polar)) {
            expect(actual.kind, `${label} ${name}`).toBe(expectedClock);
            return;
          }
          if (actual.kind !== 'event') {
            expect.fail(`${label} ${name}: expected ${expectedClock} UTC, got ${actual.kind}`);
          }
          expect(
            secondsApart(actual.utcMs, clockNear(noonMs, midnightMs, expectedClock)),
            `${label} ${name}`,
          ).toBeLessThanOrEqual(item.toleranceSeconds);
        };

        check('sunrise', item.sunriseUtc, day.rise);
        check('sunset', item.sunsetUtc, day.set);
        check('solar noon', item.solarNoonUtc, { kind: 'event', utcMs: day.solarNoonUtcMs });
      },
    );

    // Catches a transcription slip inside the fixture itself, without consulting our own model.
    it('reports a solar noon that sits midway between the sunrise and sunset recorded', () => {
      for (const item of cases) {
        if (POLAR.includes(item.sunriseUtc as Polar) || POLAR.includes(item.sunsetUtc as Polar))
          continue;
        const midnightMs = midnightMsOf(item.date);
        const noonMs = clockNear(midnightMs, midnightMs, item.solarNoonUtc);
        const midpoint =
          (clockNear(noonMs, midnightMs, item.sunriseUtc) +
            clockNear(noonMs, midnightMs, item.sunsetUtc)) /
          2;
        expect(secondsApart(midpoint, noonMs), `${item.city} ${item.date}`).toBeLessThanOrEqual(90);
      }
    });
  });
}

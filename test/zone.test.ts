import { describe, expect, it } from 'vitest';
import { cityById } from '../src/data/cities.ts';
import { formatLocalHhMm, localClock, localMinutesSinceMidnight } from '../src/lib/time/index.ts';
import { utcMidnightMs } from '../src/lib/solar/index.ts';

const TAMPERE = cityById('tampere')!;
const NIIGATA = cityById('niigata')!;
const ANCHORAGE = cityById('anchorage')!;

const JANUARY = utcMidnightMs(2026, 1, 15);
const JULY = utcMidnightMs(2026, 7, 15);

// At 00:00 UTC the local clock reads the offset back, which is how these tests observe DST
// without ever computing an offset (docs/solar-math.md §5, rule 3).
describe('daylight saving time is the zone database’s business, not ours', () => {
  it('shifts Tampere between January and July', () => {
    expect(localMinutesSinceMidnight(JANUARY, TAMPERE.timeZone)).toBe(120);
    expect(localMinutesSinceMidnight(JULY, TAMPERE.timeZone)).toBe(180);
  });

  it('leaves Niigata alone all year, because Japan has no DST', () => {
    expect(localMinutesSinceMidnight(JANUARY, NIIGATA.timeZone)).toBe(540);
    expect(localMinutesSinceMidnight(JULY, NIIGATA.timeZone)).toBe(540);
  });

  it('steps Tampere by an hour across the last Sunday of March', () => {
    const beforeMs = Date.UTC(2026, 2, 29, 0, 0);
    const afterMs = Date.UTC(2026, 2, 29, 2, 0);
    expect(localMinutesSinceMidnight(beforeMs, TAMPERE.timeZone)).toBe(2 * 60);
    expect(localMinutesSinceMidnight(afterMs, TAMPERE.timeZone)).toBe(5 * 60);
  });
});

describe('local clock conversion', () => {
  it('rolls the calendar date forward east of UTC and back west of it', () => {
    const instant = Date.UTC(2026, 0, 15, 22, 30);
    expect(localClock(instant, NIIGATA.timeZone)).toEqual({
      year: 2026,
      month: 1,
      day: 16,
      hour: 7,
      minute: 30,
    });
    expect(localClock(instant, ANCHORAGE.timeZone)).toEqual({
      year: 2026,
      month: 1,
      day: 15,
      hour: 13,
      minute: 30,
    });
  });

  it('reports local midnight as 00:00, not 24:00', () => {
    const tokyoMidnight = Date.UTC(2026, 0, 14, 15, 0);
    expect(localMinutesSinceMidnight(tokyoMidnight, NIIGATA.timeZone)).toBe(0);
    expect(formatLocalHhMm(tokyoMidnight, NIIGATA.timeZone)).toBe('00:00');
  });

  it('zero-pads both fields', () => {
    expect(formatLocalHhMm(Date.UTC(2026, 0, 15, 7, 5), 'Atlantic/Reykjavik')).toBe('07:05');
  });
});

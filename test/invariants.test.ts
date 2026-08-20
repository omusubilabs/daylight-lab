import { describe, expect, it } from 'vitest';
import {
  EARTH_OBLIQUITY_DEG,
  MS_PER_DAY,
  ZENITH_DEG,
  dayEvents,
  maxAltitudeDeg,
  minAltitudeDeg,
  minutesToUtcMs,
  solarAltitudeDeg,
  utcMidnightMs,
} from '../src/lib/solar/index.ts';
import type { DayQuery } from '../src/lib/solar/index.ts';
import { CITIES, cityById } from '../src/data/cities.ts';
import type { City } from '../src/data/cities.ts';
import { localMinutesSinceMidnight } from '../src/lib/time/index.ts';

const TAMPERE = cityById('tampere')!;
const NIIGATA = cityById('niigata')!;
const SYDNEY = cityById('sydney')!;

const MARCH_EQUINOX = utcMidnightMs(2026, 3, 20);
const JUNE_SOLSTICE = utcMidnightMs(2026, 6, 21);
const SEPTEMBER_EQUINOX = utcMidnightMs(2026, 9, 23);
const DECEMBER_SOLSTICE = utcMidnightMs(2026, 12, 21);

const YEAR_START = utcMidnightMs(2026, 1, 1);

// §8b.3 sweeps synthetic latitudes, so this takes coordinates rather than a whole `City`.
type Site = Pick<City, 'latitudeDeg' | 'longitudeDeg'>;

function query(site: Site, midnightMs: number, obliquityDeg: number): DayQuery {
  return {
    utcMidnightMs: midnightMs,
    latitudeDeg: site.latitudeDeg,
    longitudeDeg: site.longitudeDeg,
    obliquityDeg,
  };
}

function everyDayOf2026(): number[] {
  return Array.from({ length: 365 }, (_, i) => YEAR_START + i * MS_PER_DAY);
}

function firstOfEachMonth2026(): number[] {
  return Array.from({ length: 12 }, (_, i) => utcMidnightMs(2026, i + 1, 1));
}

describe('§8b.1 zero tilt removes the seasons', () => {
  it('holds day length constant across the year at every latitude', () => {
    for (const city of CITIES) {
      const lengths = everyDayOf2026().map(
        (ms) => dayEvents(query(city, ms, 0)).minutesAboveZenith,
      );
      const spread = Math.max(...lengths) - Math.min(...lengths);
      expect(spread, city.name).toBeLessThan(2);
    }
  });

  it('gives every latitude a day slightly longer than 12h, ~12h07m at or below 40°', () => {
    for (const city of CITIES) {
      const minutes = dayEvents(query(city, JUNE_SOLSTICE, 0)).minutesAboveZenith;
      expect(minutes, city.name).toBeGreaterThan(720);
      expect(minutes, city.name).toBeLessThan(741);
      if (Math.abs(city.latitudeDeg) <= 40) {
        expect(Math.abs(minutes - 727), city.name).toBeLessThanOrEqual(2);
      }
    }
  });
});

// §8b.2. Fails if `y = tan²(ε/2)` was computed from a constant instead of the tilt parameter.
describe('§8b.2 the equation of time follows the tilt', () => {
  it('collapses to the eccentricity term at zero tilt', () => {
    const peak = (obliquityDeg: number) =>
      Math.max(
        ...everyDayOf2026().map((ms) =>
          Math.abs(dayEvents(query(NIIGATA, ms, obliquityDeg)).equationOfTimeMin),
        ),
      );

    expect(peak(0)).toBeLessThan(8);
    expect(peak(EARTH_OBLIQUITY_DEG)).toBeGreaterThan(14);
  });
});

describe('§8b.3 equinox day length', () => {
  it('is 12h ± 10min at or below 35° and never shorter than 12h below 65°', () => {
    for (const midnightMs of [MARCH_EQUINOX, SEPTEMBER_EQUINOX]) {
      for (let latitudeDeg = -64; latitudeDeg <= 64; latitudeDeg += 4) {
        const city = { name: `lat ${latitudeDeg}`, latitudeDeg, longitudeDeg: 0 };
        const minutes = dayEvents(query(city, midnightMs, EARTH_OBLIQUITY_DEG)).minutesAboveZenith;
        const label = `${city.name} @ ${new Date(midnightMs).toISOString().slice(0, 10)}`;

        expect(minutes, label).toBeGreaterThan(720);
        expect(minutes - 720, label).toBeLessThan(Math.abs(latitudeDeg) <= 35 ? 10 : 20);
      }
    }
  });
});

describe('§8b.4 noon symmetry', () => {
  it('puts solar noon midway between sunrise and sunset', () => {
    for (const city of CITIES) {
      for (const midnightMs of firstOfEachMonth2026()) {
        const day = dayEvents(query(city, midnightMs, EARTH_OBLIQUITY_DEG));
        if (day.rise.kind !== 'event' || day.set.kind !== 'event') continue;

        const midpoint = (day.rise.utcMs + day.set.utcMs) / 2;
        expect(Math.abs(midpoint - day.solarNoonUtcMs), city.name).toBeLessThan(30_000);
      }
    }
  });
});

describe('§8b.5 a 40° tilt puts Tampere inside the polar circle', () => {
  it('returns polar day and polar night at 40°, and ordinary events at 23.44°', () => {
    expect(dayEvents(query(TAMPERE, JUNE_SOLSTICE, 40)).rise.kind).toBe('alwaysAbove');
    expect(dayEvents(query(TAMPERE, DECEMBER_SOLSTICE, 40)).rise.kind).toBe('alwaysBelow');

    expect(dayEvents(query(TAMPERE, JUNE_SOLSTICE, EARTH_OBLIQUITY_DEG)).rise.kind).toBe('event');
    expect(dayEvents(query(TAMPERE, DECEMBER_SOLSTICE, EARTH_OBLIQUITY_DEG)).rise.kind).toBe(
      'event',
    );
  });
});

describe('§8b.6 Tampere white nights', () => {
  it('keeps the midnight Sun within 6° of the horizon on the June solstice', () => {
    const day = dayEvents(query(TAMPERE, JUNE_SOLSTICE, EARTH_OBLIQUITY_DEG));
    const lowest = minAltitudeDeg(TAMPERE.latitudeDeg, day.declinationDeg);

    expect(lowest).toBeGreaterThan(-6);
    expect(lowest).toBeLessThan(-4);
    expect(
      dayEvents(query(TAMPERE, JUNE_SOLSTICE, EARTH_OBLIQUITY_DEG), ZENITH_DEG.astronomical).rise
        .kind,
    ).toBe('alwaysAbove');
  });
});

// §8b.7 runs end to end: curated city data, the solar core, and the presentation boundary.
describe('§8b.7 Niigata solar noon', () => {
  it('falls between 11:35 and 11:55 Japan time on the equinoxes', () => {
    for (const midnightMs of [MARCH_EQUINOX, SEPTEMBER_EQUINOX]) {
      const day = dayEvents(query(NIIGATA, midnightMs, EARTH_OBLIQUITY_DEG));
      const localMinutes = localMinutesSinceMidnight(day.solarNoonUtcMs, NIIGATA.timeZone);

      expect(localMinutes).toBeGreaterThanOrEqual(11 * 60 + 35);
      expect(localMinutes).toBeLessThanOrEqual(11 * 60 + 55);
    }
  });
});

describe('§8b.8 the hemispheres move in opposite directions', () => {
  it('lengthens Tampere and shortens Sydney from the March equinox to the June solstice', () => {
    const days = Math.round((JUNE_SOLSTICE - MARCH_EQUINOX) / MS_PER_DAY);
    const lengthOn = (city: City, index: number) =>
      dayEvents(query(city, MARCH_EQUINOX + index * MS_PER_DAY, EARTH_OBLIQUITY_DEG))
        .minutesAboveZenith;

    for (let i = 1; i <= days; i++) {
      expect(lengthOn(TAMPERE, i) - lengthOn(TAMPERE, i - 1), `Tampere day ${i}`).toBeGreaterThan(
        -1e-6,
      );
      expect(lengthOn(SYDNEY, i) - lengthOn(SYDNEY, i - 1), `Sydney day ${i}`).toBeLessThan(1e-6);
    }
  });
});

describe('§8b.9 no NaN anywhere in the tilt sweep', () => {
  it('returns a finite time or a polar variant for every tilt, date, city and threshold', () => {
    for (const city of CITIES) {
      for (const midnightMs of firstOfEachMonth2026()) {
        for (let obliquityDeg = 0; obliquityDeg <= 45; obliquityDeg += 0.5) {
          const q = query(city, midnightMs, obliquityDeg);

          for (const zenithDeg of Object.values(ZENITH_DEG)) {
            const day = dayEvents(q, zenithDeg);
            const label = `${city.name} ${new Date(midnightMs).toISOString().slice(0, 10)} tilt ${obliquityDeg} zenith ${zenithDeg}`;

            expect(day.declinationDeg, label).not.toBeNaN();
            expect(day.equationOfTimeMin, label).not.toBeNaN();
            expect(Number.isFinite(day.solarNoonUtcMs), label).toBe(true);
            expect(Number.isFinite(day.minutesAboveZenith), label).toBe(true);

            for (const event of [day.rise, day.set]) {
              if (event.kind === 'event') {
                expect(Number.isFinite(event.utcMs), label).toBe(true);
              } else {
                expect(['alwaysAbove', 'alwaysBelow'], label).toContain(event.kind);
              }
            }
          }

          const day = dayEvents(q);
          expect(maxAltitudeDeg(city.latitudeDeg, day.declinationDeg), city.name).not.toBeNaN();
          expect(minAltitudeDeg(city.latitudeDeg, day.declinationDeg), city.name).not.toBeNaN();
          for (const minutes of [0, 360, 720, 1080, 1439]) {
            expect(solarAltitudeDeg(q, minutes), city.name).not.toBeNaN();
            expect(Number.isFinite(minutesToUtcMs(midnightMs, minutes)), city.name).toBe(true);
          }
        }
      }
    }
  });
});

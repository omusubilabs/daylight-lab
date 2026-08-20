import { describe, expect, it } from 'vitest';
import {
  decemberClause,
  decemberSolarNoon,
  equationOfTimePeakMinutes,
  juneClause,
  longestCivilTwilightRun,
  niigataJuneMinAltitude,
  niigataSolarNoonRange,
  polarCircleClause,
  whiteNightsClause,
} from '../src/lib/year/prose.ts';
import { yearSeries } from '../src/lib/year/series.ts';
import { cityById } from '../src/data/cities.ts';
import { EARTH_OBLIQUITY_DEG } from '../src/lib/solar/index.ts';

const YEAR = 2026;
const TAMPERE = cityById('tampere')!;

describe('december clause (§1 ¶3)', () => {
  it('reads the ordinary short day at the default tilt', () => {
    expect(decemberClause(EARTH_OBLIQUITY_DEG, YEAR, 'local')).toBe(
      'very little of it does. The Sun rises at 09:42, climbs to 5.1° above the horizon, and ' +
        'sets again at 15:03. That is 5h 21m of daylight.',
    );
  });

  it('switches to a polar night once Tampere goes under (~28.5° tilt)', () => {
    expect(decemberClause(40, YEAR, 'local')).toBe(
      'none of it does. The Sun never comes up, staying 11.5° below the horizon all day. That is ' +
        'a polar night, and 0h 00m of daylight.',
    );
  });

  it('never claims a negative altitude is "above the horizon" through the refraction-graze band', () => {
    for (let tilt = 28; tilt <= 29; tilt += 0.05) {
      const clause = decemberClause(Number(tilt.toFixed(2)), YEAR, 'local');
      expect(clause, `tilt ${tilt}`).not.toMatch(/-[\d.]+° above/);
    }
  });
});

describe('june clause (§3 ¶1)', () => {
  it('reads the ordinary short night at the default tilt', () => {
    expect(juneClause(EARTH_OBLIQUITY_DEG, YEAR, 'local')).toBe(
      'The Sun sets at 23:11 and rises again at 03:41, 4h 30m later. In between it does not go ' +
        'far down. At its lowest it is 5.1° below the horizon.',
    );
  });

  it('switches to midnight sun once Tampere clears the polar circle', () => {
    expect(juneClause(40, YEAR, 'local')).toBe(
      'The Sun does not set at all. At its lowest it is still 11.5° above the horizon: this is ' +
        'already the midnight sun.',
    );
  });

  it('never claims a positive altitude is "below the horizon" through the refraction-graze band', () => {
    for (let tilt = 28; tilt <= 29; tilt += 0.05) {
      const clause = juneClause(Number(tilt.toFixed(2)), YEAR, 'local');
      expect(clause, `tilt ${tilt}`).not.toMatch(/-?0\.0° below|[\d.]+° below.*above/);
    }
  });
});

describe('the equation-of-time and solar-noon figures (§2)', () => {
  it('grows with tilt, since the obliquity term of the equation of time does', () => {
    const at0 = Number(equationOfTimePeakMinutes(0, YEAR));
    const atDefault = Number(equationOfTimePeakMinutes(EARTH_OBLIQUITY_DEG, YEAR));
    const at40 = Number(equationOfTimePeakMinutes(40, YEAR));
    expect(at0).toBeLessThan(atDefault);
    expect(atDefault).toBeLessThan(at40);
  });

  it('reads Tampere solar noon and Niigata solar noon range at the default tilt', () => {
    expect(decemberSolarNoon(EARTH_OBLIQUITY_DEG, YEAR)).toBe('12:23');
    expect(niigataSolarNoonRange(EARTH_OBLIQUITY_DEG, YEAR)).toEqual({
      min: '11:27',
      max: '11:58',
    });
  });
});

describe('longest civil twilight run', () => {
  it('finds no run at all when the whole year clears civil twilight comfortably', () => {
    const days = yearSeries(TAMPERE, 0, YEAR, { clockMode: 'local' }).days;
    expect(longestCivilTwilightRun(days)).toBeNull();
  });

  it('finds the white-night run at the default tilt', () => {
    const days = yearSeries(TAMPERE, EARTH_OBLIQUITY_DEG, YEAR, { clockMode: 'local' }).days;
    const run = longestCivilTwilightRun(days);
    expect(run?.count).toBe(33);
  });
});

describe('white nights clause (§3 ¶2, the first inverting claim)', () => {
  it('names 33 nights from June 5 to July 7 at the default tilt', () => {
    expect(whiteNightsClause(EARTH_OBLIQUITY_DEG, YEAR, 'local')).toContain(
      'From June 5 to July 7, 33 nights running',
    );
  });

  it('says there is no white-night season at 0° tilt, rather than a 0-night claim', () => {
    expect(whiteNightsClause(0, YEAR, 'local')).toBe(
      "Civil twilight ends at 6° below. At this tilt Tampere's nights clear that mark every " +
        'night of the year: there is no white-night season to find.',
    );
  });

  it('calls it midnight sun rather than white nights once June 21 is inside the run', () => {
    expect(whiteNightsClause(40, YEAR, 'local')).toContain(
      'This is midnight sun, not merely white nights.',
    );
    expect(whiteNightsClause(40, YEAR, 'local')).not.toContain('not midnight sun');
  });
});

describe('polar circle clause (§3 ¶3, the second inverting claim)', () => {
  it('places the circle north of Tampere at the default tilt', () => {
    expect(polarCircleClause(EARTH_OBLIQUITY_DEG, YEAR, 'local')).toBe(
      'None of this needs the Arctic Circle, which is another 5.1° north at 66.6°N, some 564 km ' +
        'away. Tampere gets no midnight sun on any date of the year at this tilt.',
    );
  });

  it('flips to Tampere being inside the circle once tilt passes ~28.5°', () => {
    const clause = polarCircleClause(40, YEAR, 'local');
    expect(clause).toContain('Tampere is inside the Arctic Circle');
    expect(clause).not.toContain('gets no midnight sun');
  });
});

describe("niigata's june minimum altitude (§3 ¶4)", () => {
  it('reads 28.7° at the default tilt and never crosses the horizon within the sliders range', () => {
    expect(niigataJuneMinAltitude(EARTH_OBLIQUITY_DEG, YEAR, 'local')).toBe('28.7°');
    for (let tilt = 0; tilt <= 45; tilt += 1) {
      expect(niigataJuneMinAltitude(tilt, YEAR, 'local')).not.toContain('-');
    }
  });
});

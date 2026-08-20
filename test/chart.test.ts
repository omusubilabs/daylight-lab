import { describe, expect, it } from 'vitest';
import {
  PLOT_VIEW,
  bandPath,
  hourRules,
  linePath,
  monthTicks,
  plotViewX,
} from '../src/chart/geometry.ts';
import type { BandPoint, LinePoint } from '../src/chart/geometry.ts';
import { cityById } from '../src/data/cities.ts';
import { EARTH_OBLIQUITY_DEG } from '../src/lib/solar/index.ts';
import { yearSeries } from '../src/lib/year/index.ts';
import type { YearSeries } from '../src/lib/year/index.ts';

const YEAR = 2026;

function city(id: string) {
  const found = cityById(id);
  if (!found) throw new Error(`unknown city id: ${id}`);
  return found;
}

function toBandPoints(series: YearSeries): BandPoint[] {
  return series.days.map((day) => ({
    morning: day.bands.sunrise.morning,
    evening: day.bands.sunrise.evening,
    clockBreak: day.clockBreak,
  }));
}

function toLinePoints(series: YearSeries): LinePoint[] {
  return series.days.map((day) => ({
    minutes: day.rise.kind === 'event' ? day.bands.sunrise.morning : null,
    clockBreak: day.clockBreak,
  }));
}

/** Every `M`..`Z` run, so a subpath count is a count of genuine discontinuities. */
function subpaths(d: string): string[] {
  return d
    .split('M')
    .filter(Boolean)
    .map((part) => `M${part}`);
}

function pointsOf(d: string): { x: number; y: number }[] {
  return [...d.matchAll(/(-?[\d.]+),(-?[\d.]+)/g)].map((match) => ({
    x: Number(match[1]),
    y: Number(match[2]),
  }));
}

describe('band paths', () => {
  const points: BandPoint[] = [
    { morning: 300, evening: 1200, clockBreak: false },
    { morning: 290, evening: 1210, clockBreak: false },
    { morning: 280, evening: 1220, clockBreak: false },
  ];

  it('closes one subpath that runs out along the morning edge and back along the evening', () => {
    expect(bandPath(points)).toBe(
      'M0.0,300.0L500.0,290.0L1000.0,280.0L1000.0,1220.0L500.0,1210.0L0.0,1200.0Z',
    );
  });

  it('spans the full plot width whatever the day count', () => {
    const d = bandPath(points);
    const xs = pointsOf(d).map((p) => p.x);
    expect(Math.min(...xs)).toBe(0);
    expect(Math.max(...xs)).toBe(PLOT_VIEW.width);
  });

  it('starts a new closed subpath at a clock break instead of interpolating across it', () => {
    const broken = points.map((point, index) => ({ ...point, clockBreak: index === 1 }));
    const parts = subpaths(bandPath(broken));
    expect(parts).toHaveLength(2);
    for (const part of parts) expect(part.endsWith('Z')).toBe(true);
  });

  it('abuts the two subpaths at the midnight between them, leaving no gap to see through', () => {
    const broken = points.map((point, index) => ({ ...point, clockBreak: index === 1 }));
    const [before, after] = subpaths(bandPath(broken));
    const midnight = plotViewX(0.5, points.length);

    expect(Math.max(...pointsOf(before ?? '').map((p) => p.x))).toBe(midnight);
    expect(Math.min(...pointsOf(after ?? '').map((p) => p.x))).toBe(midnight);
  });

  it('steps vertically at that midnight rather than sloping into the new clock', () => {
    const broken = points.map((point, index) => ({ ...point, clockBreak: index === 1 }));
    const midnight = plotViewX(0.5, points.length);
    const [before, after] = subpaths(bandPath(broken));

    const morningsAt = (d: string): number[] =>
      pointsOf(d)
        .filter((p) => p.x === midnight)
        .map((p) => p.y);

    // Same x, two different morning edges: the step is a vertical jump, not a one-day slope.
    expect(morningsAt(before ?? '')).toEqual([300, 1200]);
    expect(morningsAt(after ?? '')).toEqual([290, 1210]);
  });
});

describe('line paths', () => {
  it('breaks where the event stops happening and never bridges the gap', () => {
    const points: LinePoint[] = [
      { minutes: 300, clockBreak: false },
      { minutes: 280, clockBreak: false },
      { minutes: null, clockBreak: false },
      { minutes: null, clockBreak: false },
      { minutes: 285, clockBreak: false },
      { minutes: 305, clockBreak: false },
    ];
    expect(subpaths(linePath(points))).toHaveLength(2);
  });

  it('drops a segment too short to draw rather than emitting a stray moveto', () => {
    const points: LinePoint[] = [
      { minutes: 300, clockBreak: false },
      { minutes: null, clockBreak: false },
      { minutes: 280, clockBreak: false },
      { minutes: null, clockBreak: false },
    ];
    expect(linePath(points)).toBe('');
  });
});

describe('axes', () => {
  it('ticks every month once, labelled J..D and centred inside the month', () => {
    const days = yearSeries(city('tampere'), EARTH_OBLIQUITY_DEG, YEAR).days;
    const ticks = monthTicks(days);

    expect(ticks).toHaveLength(12);
    expect(ticks.map((tick) => tick.label).join('')).toBe('JFMAMJJASOND');
    expect(ticks[0]?.startIndex).toBe(0);
    expect(ticks[0]?.labelIndex).toBe(15);
    expect(ticks[1]?.startIndex).toBe(31);
  });

  it('rules the clock every three hours from 00:00 to 24:00', () => {
    expect(hourRules()).toEqual([0, 3, 6, 9, 12, 15, 18, 21, 24]);
  });

  it('places the first and last day on the plot edges', () => {
    expect(plotViewX(0, 365)).toBe(0);
    expect(plotViewX(364, 365)).toBe(PLOT_VIEW.width);
  });
});

describe('the rendered year', () => {
  it('draws Tampere as three closed bands, one per stretch of unbroken clock', () => {
    const series = yearSeries(city('tampere'), EARTH_OBLIQUITY_DEG, YEAR);
    const parts = subpaths(bandPath(toBandPoints(series)));

    expect(parts).toHaveLength(3);
    for (const part of parts) {
      expect(part.startsWith('M')).toBe(true);
      expect(part.endsWith('Z')).toBe(true);
    }
  });

  it('leaves no unpainted day between the three Tampere bands', () => {
    const series = yearSeries(city('tampere'), EARTH_OBLIQUITY_DEG, YEAR);
    const parts = subpaths(bandPath(toBandPoints(series)));
    const ends = parts.map((part) => Math.max(...pointsOf(part).map((p) => p.x)));
    const starts = parts.map((part) => Math.min(...pointsOf(part).map((p) => p.x)));

    expect(starts[1]).toBe(ends[0]);
    expect(starts[2]).toBe(ends[1]);
  });

  it('draws Niigata as one unbroken band and one unbroken sunrise line', () => {
    const series = yearSeries(city('niigata'), EARTH_OBLIQUITY_DEG, YEAR);
    expect(subpaths(bandPath(toBandPoints(series)))).toHaveLength(1);
    expect(subpaths(linePath(toLinePoints(series)))).toHaveLength(1);
  });

  it('leaves no hole in a polar band: at 40° tilt Tampere reaches both edges', () => {
    const series = yearSeries(city('tampere'), 40, YEAR);
    const ys = pointsOf(bandPath(toBandPoints(series))).map((point) => point.y);

    expect(Math.min(...ys)).toBe(0);
    expect(Math.max(...ys)).toBe(PLOT_VIEW.height);
    for (const y of ys) {
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(PLOT_VIEW.height);
    }
  });

  it('breaks the polar-night sunrise line at 40° tilt but keeps the band closed', () => {
    const series = yearSeries(city('tampere'), 40, YEAR);
    expect(subpaths(linePath(toLinePoints(series))).length).toBeGreaterThan(1);
    for (const part of subpaths(bandPath(toBandPoints(series)))) {
      expect(part.endsWith('Z')).toBe(true);
    }
  });
});

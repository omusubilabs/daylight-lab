import type { ThresholdName } from '../lib/solar/index.ts';
import type { YearSeries } from '../lib/year/index.ts';
import {
  FRAME,
  PLOT,
  PLOT_VIEW,
  bandPath,
  frameX,
  frameY,
  hourLabel,
  hourRules,
  linePath,
  monthTicks,
  plotViewX,
} from './geometry.ts';
import type { BandPoint, LinePoint } from './geometry.ts';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Back to front: each band is drawn over the wider one beneath it (docs/ui-spec.md). */
const BAND_LAYERS = [
  { threshold: 'astronomical', label: 'Astronomical twilight' },
  { threshold: 'nautical', label: 'Nautical twilight' },
  { threshold: 'civil', label: 'Civil twilight' },
  { threshold: 'sunrise', label: 'Daylight' },
] as const;

function svg<K extends keyof SVGElementTagNameMap>(
  name: K,
  attributes: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, String(value));
  }
  return element;
}

function bandPoints(series: YearSeries, threshold: ThresholdName): string {
  const points: BandPoint[] = series.days.map((day) => ({
    morning: day.bands[threshold].morning,
    evening: day.bands[threshold].evening,
    clockBreak: day.clockBreak,
  }));
  return bandPath(points);
}

function edgePath(series: YearSeries, edge: 'morning' | 'evening'): string {
  const points: LinePoint[] = series.days.map((day) => ({
    minutes: day.rise.kind === 'event' ? day.bands.sunrise[edge] : null,
    clockBreak: day.clockBreak,
  }));
  return linePath(points);
}

function latitudeLabel(latitudeDeg: number): string {
  return `${Math.abs(latitudeDeg).toFixed(1)}°${latitudeDeg < 0 ? 'S' : 'N'}`;
}

function hoursAndMinutes(minutes: number): string {
  const rounded = Math.round(minutes);
  return `${Math.floor(rounded / 60)}h ${String(rounded % 60).padStart(2, '0')}m`;
}

function chartLabel(a: YearSeries, b: YearSeries): string {
  const lengths = a.days.map((day) => day.dayLengthMinutes);
  const shortest = hoursAndMinutes(Math.min(...lengths));
  const longest = hoursAndMinutes(Math.max(...lengths));

  return (
    `A year of daylight in ${a.city.name}, ${latitudeLabel(a.city.latitudeDeg)}, at ` +
    `${a.obliquityDeg}° axial tilt: date across, local clock time down, daylight and the three ` +
    `twilights shaded from the night behind them. Day length runs from ${shortest} to ` +
    `${longest}. ${b.city.name}, ${latitudeLabel(b.city.latitudeDeg)}, is overlaid as sunrise ` +
    `and sunset lines.`
  );
}

function axisGroup(dayCount: number, ticks: ReturnType<typeof monthTicks>): SVGGElement {
  const group = svg('g', { class: 'chart__axis' });

  for (const hour of hourRules()) {
    const label = svg('text', {
      class: 'chart__tick chart__tick--time',
      x: PLOT.x - 10,
      y: frameY(hour * 60),
      'text-anchor': 'end',
      'dominant-baseline': 'middle',
    });
    label.textContent = hourLabel(hour);
    group.append(label);
  }

  for (const tick of ticks) {
    const label = svg('text', {
      class: 'chart__tick chart__tick--month',
      x: frameX(tick.labelIndex, dayCount),
      y: PLOT.y + PLOT.height + 18,
      'text-anchor': 'middle',
    });
    label.textContent = tick.label;
    group.append(label);
  }

  return group;
}

function rulesGroup(dayCount: number, ticks: ReturnType<typeof monthTicks>): SVGGElement {
  const group = svg('g', { class: 'chart__rules' });

  for (const hour of hourRules()) {
    if (hour === 0 || hour === 24) continue;
    group.append(
      svg('line', {
        x1: 0,
        x2: PLOT_VIEW.width,
        y1: hour * 60,
        y2: hour * 60,
      }),
    );
  }

  for (const tick of ticks) {
    if (tick.startIndex === 0) continue;
    const x = plotViewX(tick.startIndex, dayCount);
    group.append(svg('line', { x1: x, x2: x, y1: 0, y2: PLOT_VIEW.height }));
  }

  return group;
}

function plotGroup(a: YearSeries, b: YearSeries): SVGSVGElement {
  const dayCount = a.days.length;
  const plot = svg('svg', {
    class: 'chart__plot',
    x: PLOT.x,
    y: PLOT.y,
    width: PLOT.width,
    height: PLOT.height,
    viewBox: `0 0 ${PLOT_VIEW.width} ${PLOT_VIEW.height}`,
    preserveAspectRatio: 'none',
  });

  plot.append(
    svg('rect', {
      class: 'chart__band chart__band--night',
      width: PLOT_VIEW.width,
      height: PLOT_VIEW.height,
    }),
  );

  for (const layer of BAND_LAYERS) {
    plot.append(
      svg('path', {
        class: `chart__band chart__band--${layer.threshold}`,
        d: bandPoints(a, layer.threshold),
      }),
    );
  }

  plot.append(rulesGroup(dayCount, monthTicks(a.days)));

  for (const edge of ['morning', 'evening'] as const) {
    const d = edgePath(b, edge);
    plot.append(svg('path', { class: 'chart__overlay-halo', d }));
    plot.append(svg('path', { class: 'chart__overlay', d }));
  }

  return plot;
}

function legend(a: YearSeries, b: YearSeries): HTMLElement {
  const list = document.createElement('ul');
  list.className = 'chart-legend';

  const entries: { className: string; text: string }[] = [
    ...[...BAND_LAYERS]
      .reverse()
      .map((layer) => ({ className: `swatch--${layer.threshold}`, text: layer.label })),
    { className: 'swatch--night', text: 'Night' },
    { className: 'swatch--overlay', text: `${b.city.name} sunrise and sunset` },
  ];

  for (const entry of entries) {
    const item = document.createElement('li');
    const swatch = document.createElement('span');
    swatch.className = `chart-legend__swatch ${entry.className}`;
    item.append(swatch, document.createTextNode(entry.text));
    list.append(item);
  }

  const caption = document.createElement('p');
  caption.className = 'chart-legend__caption';
  caption.textContent =
    `Bands: ${a.city.name}, ${latitudeLabel(a.city.latitudeDeg)}. ` +
    `Lines: ${b.city.name}, ${latitudeLabel(b.city.latitudeDeg)}. ` +
    `Local clock time, ${a.obliquityDeg}° axial tilt.`;

  const wrapper = document.createElement('div');
  wrapper.className = 'chart-legend-wrap';
  wrapper.append(list, caption);
  return wrapper;
}

export function renderYearChart(a: YearSeries, b: YearSeries): HTMLElement {
  const figure = document.createElement('figure');
  figure.className = 'chart';

  const frame = svg('svg', {
    class: 'chart__svg',
    viewBox: `0 0 ${FRAME.width} ${FRAME.height}`,
    role: 'img',
    'aria-label': chartLabel(a, b),
  });

  frame.append(axisGroup(a.days.length, monthTicks(a.days)));
  frame.append(plotGroup(a, b));
  frame.append(
    svg('rect', {
      class: 'chart__frame',
      x: PLOT.x,
      y: PLOT.y,
      width: PLOT.width,
      height: PLOT.height,
    }),
  );

  figure.append(frame, legend(a, b));
  return figure;
}

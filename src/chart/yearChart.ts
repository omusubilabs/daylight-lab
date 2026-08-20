import { formatDuration, formatLatitude, formatTilt } from '../lib/format.ts';
import type { ThresholdName } from '../lib/solar/index.ts';
import type { YearSeries } from '../lib/year/index.ts';
import { el, svgEl } from '../ui/dom.ts';
import {
  FRAME,
  PLOT,
  PLOT_INSET,
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

/** Back to front: each band is drawn over the wider one beneath it (docs/ui-spec.md). */
const BAND_LAYERS = [
  { threshold: 'astronomical', label: 'Astronomical twilight' },
  { threshold: 'nautical', label: 'Nautical twilight' },
  { threshold: 'civil', label: 'Civil twilight' },
  { threshold: 'sunrise', label: 'Daylight' },
] as const;

const EDGES = ['morning', 'evening'] as const;

export interface ChartData {
  readonly a: YearSeries;
  readonly b: YearSeries;
  readonly dayIndex: number;
}

export interface YearChart {
  readonly element: HTMLElement;
  /** A transparent overlay lying exactly on the plot, which owns scrubbing. */
  readonly scrubSurface: HTMLElement;
  update(data: ChartData): void;
  /** Scrubbing moves only this, so a pointer drag never rebuilds a year of path strings. */
  setCursor(dayIndex: number): void;
}

function bandPoints(series: YearSeries, threshold: ThresholdName): string {
  const points: BandPoint[] = series.days.map((day) => ({
    morning: day.bands[threshold].morning,
    evening: day.bands[threshold].evening,
    clockBreak: day.clockBreak,
  }));
  return bandPath(points);
}

function edgePath(series: YearSeries, edge: (typeof EDGES)[number]): string {
  const points: LinePoint[] = series.days.map((day) => ({
    minutes: day.rise.kind === 'event' ? day.bands.sunrise[edge] : null,
    clockBreak: day.clockBreak,
  }));
  return linePath(points);
}

function clockPhrase(series: YearSeries): string {
  return series.clockMode === 'solar' ? 'solar time' : 'local clock time';
}

function clockSentence(series: YearSeries): string {
  return series.clockMode === 'solar' ? 'Solar time' : 'Local clock time';
}

function chartLabel(a: YearSeries, b: YearSeries): string {
  const lengths = a.days.map((day) => day.dayLengthMinutes);
  const shortest = formatDuration(Math.min(...lengths));
  const longest = formatDuration(Math.max(...lengths));

  return (
    `A year of daylight in ${a.city.name}, ${formatLatitude(a.city.latitudeDeg)}, at ` +
    `${formatTilt(a.obliquityDeg)} axial tilt: date across, ${clockPhrase(a)} down, daylight and ` +
    `the three twilights shaded from the night behind them. Day length runs from ${shortest} to ` +
    `${longest}. ${b.city.name}, ${formatLatitude(b.city.latitudeDeg)}, is overlaid as sunrise ` +
    `and sunset lines.`
  );
}

function captionText(a: YearSeries, b: YearSeries): string {
  return (
    `Bands: ${a.city.name}, ${formatLatitude(a.city.latitudeDeg)}. ` +
    `Lines: ${b.city.name}, ${formatLatitude(b.city.latitudeDeg)}. ` +
    `${clockSentence(a)}, ${formatTilt(a.obliquityDeg)} axial tilt.`
  );
}

function axisGroup(dayCount: number, ticks: ReturnType<typeof monthTicks>): SVGGElement {
  const group = svgEl('g', { class: 'chart__axis' });

  for (const hour of hourRules()) {
    const label = svgEl('text', {
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
    const label = svgEl('text', {
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
  const group = svgEl('g', { class: 'chart__rules' });

  for (const hour of hourRules()) {
    if (hour === 0 || hour === 24) continue;
    group.append(svgEl('line', { x1: 0, x2: PLOT_VIEW.width, y1: hour * 60, y2: hour * 60 }));
  }

  for (const tick of ticks) {
    if (tick.startIndex === 0) continue;
    const x = plotViewX(tick.startIndex, dayCount);
    group.append(svgEl('line', { x1: x, x2: x, y1: 0, y2: PLOT_VIEW.height }));
  }

  return group;
}

function legendList(): { element: HTMLElement; overlayLabel: Text } {
  const list = el('ul', 'chart-legend');
  const overlayLabel = document.createTextNode('');

  const entries: { className: string; text: Text }[] = [
    ...[...BAND_LAYERS].reverse().map((layer) => ({
      className: `swatch--${layer.threshold}`,
      text: document.createTextNode(layer.label),
    })),
    { className: 'swatch--night', text: document.createTextNode('Night') },
    { className: 'swatch--overlay', text: overlayLabel },
  ];

  for (const entry of entries) {
    const item = el('li');
    const swatch = el('span', `chart-legend__swatch ${entry.className}`);
    item.append(swatch, entry.text);
    list.append(item);
  }

  return { element: list, overlayLabel };
}

export function createYearChart(initial: ChartData): YearChart {
  const ticks = monthTicks(initial.a.days);
  const dayCount = initial.a.dayCount;

  const frame = svgEl('svg', {
    class: 'chart__svg',
    viewBox: `0 0 ${FRAME.width} ${FRAME.height}`,
    role: 'img',
  });

  const plot = svgEl('svg', {
    class: 'chart__plot',
    x: PLOT.x,
    y: PLOT.y,
    width: PLOT.width,
    height: PLOT.height,
    viewBox: `0 0 ${PLOT_VIEW.width} ${PLOT_VIEW.height}`,
    preserveAspectRatio: 'none',
  });

  plot.append(
    svgEl('rect', {
      class: 'chart__band chart__band--night',
      width: PLOT_VIEW.width,
      height: PLOT_VIEW.height,
    }),
  );

  const bands = BAND_LAYERS.map((layer) => {
    const path = svgEl('path', { class: `chart__band chart__band--${layer.threshold}` });
    plot.append(path);
    return { threshold: layer.threshold, path };
  });

  plot.append(rulesGroup(dayCount, ticks));

  const overlays = EDGES.map((edge) => {
    const halo = svgEl('path', { class: 'chart__overlay-halo' });
    const line = svgEl('path', { class: 'chart__overlay' });
    plot.append(halo, line);
    return { edge, halo, line };
  });

  const cursor = svgEl('line', {
    class: 'chart__cursor',
    y1: 0,
    y2: PLOT_VIEW.height,
    x1: 0,
    x2: 0,
  });
  plot.append(cursor);

  frame.append(axisGroup(dayCount, ticks), plot);
  frame.append(
    svgEl('rect', {
      class: 'chart__frame',
      x: PLOT.x,
      y: PLOT.y,
      width: PLOT.width,
      height: PLOT.height,
    }),
  );

  const scrubSurface = el('div', 'chart__scrub');
  scrubSurface.tabIndex = 0;
  scrubSurface.setAttribute('role', 'slider');
  scrubSurface.setAttribute('aria-label', 'Date');
  scrubSurface.setAttribute('aria-orientation', 'horizontal');
  scrubSurface.setAttribute('aria-valuemin', '1');
  scrubSurface.setAttribute('aria-valuemax', String(dayCount));
  scrubSurface.style.left = `${PLOT_INSET.left * 100}%`;
  scrubSurface.style.top = `${PLOT_INSET.top * 100}%`;
  scrubSurface.style.width = `${PLOT_INSET.width * 100}%`;
  scrubSurface.style.height = `${PLOT_INSET.height * 100}%`;

  const stage = el('div', 'chart__stage');
  stage.append(frame, scrubSurface);

  const { element: list, overlayLabel } = legendList();
  const caption = el('p', 'chart-legend__caption');
  const legend = el('div', 'chart-legend-wrap');
  legend.append(list, caption);

  const figure = el('figure', 'chart');
  figure.append(stage, legend);

  const setCursor = (dayIndex: number): void => {
    const x = plotViewX(dayIndex, dayCount).toFixed(1);
    cursor.setAttribute('x1', x);
    cursor.setAttribute('x2', x);
  };

  const update = ({ a, b, dayIndex }: ChartData): void => {
    for (const band of bands) band.path.setAttribute('d', bandPoints(a, band.threshold));
    for (const overlay of overlays) {
      const d = edgePath(b, overlay.edge);
      overlay.halo.setAttribute('d', d);
      overlay.line.setAttribute('d', d);
    }

    setCursor(dayIndex);
    frame.setAttribute('aria-label', chartLabel(a, b));
    overlayLabel.data = `${b.city.name} sunrise and sunset`;
    caption.textContent = captionText(a, b);
  };

  update(initial);
  return { element: figure, scrubSurface, update, setCursor };
}

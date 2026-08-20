// Emits the 1200x630 share card as SVG, for rasterizing once by hand into public/og.png
// (docs/content-en.md). Not shipped code and not a runtime generator: rule 1 rules out anything
// that would need a Worker to draw an image per request.
//
//   node scripts/og-image.ts > /tmp/og.svg
//   "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu \
//     --window-size=1200,630 --screenshot=public/og.png /tmp/og.svg
//
// The palette is repeated here because a standalone SVG cannot read styles.css. If the band colors
// there ever change, this file and the committed PNG have to be redone together.
import {
  PLOT_VIEW,
  bandPath,
  hourLabel,
  linePath,
  monthTicks,
  plotViewX,
} from '../src/chart/geometry.ts';
import type { BandPoint, LinePoint } from '../src/chart/geometry.ts';
import { cityById } from '../src/data/cities.ts';
import { EARTH_OBLIQUITY_DEG } from '../src/lib/solar/index.ts';
import type { ThresholdName } from '../src/lib/solar/index.ts';
import { yearSeries } from '../src/lib/year/index.ts';
import type { YearSeries } from '../src/lib/year/index.ts';

const YEAR = 2026;
const FRAME = { width: 1200, height: 630 };
const PLOT = { x: 110, y: 174, width: 1026, height: 330 };

const COLOR = {
  bg: '#0f172a',
  text: '#e8edf7',
  muted: '#9aa8c4',
  sun: '#f4d58d',
  frame: '#2c3a5c',
  rule: 'rgba(232, 237, 247, 0.16)',
  overlay: '#ff5c7a',
  overlayHalo: 'rgba(8, 13, 28, 0.55)',
  night: '#080d1c',
  astronomical: '#16224b',
  nautical: '#2b3874',
  civil: '#6d63a6',
  sunrise: '#f6e6ad',
};

const BANDS: readonly ThresholdName[] = ['astronomical', 'nautical', 'civil', 'sunrise'];

const LEGEND: readonly { readonly label: string; readonly fill: string }[] = [
  { label: 'Daylight', fill: COLOR.sunrise },
  { label: 'Civil', fill: COLOR.civil },
  { label: 'Nautical', fill: COLOR.nautical },
  { label: 'Astronomical', fill: COLOR.astronomical },
  { label: 'Night', fill: COLOR.night },
];

const FONT =
  "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif";
const MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace";

function city(id: string) {
  const found = cityById(id);
  if (!found) throw new Error(`unknown city id: ${id}`);
  return found;
}

function band(series: YearSeries, threshold: ThresholdName): string {
  const points: BandPoint[] = series.days.map((day) => ({
    morning: day.bands[threshold].morning,
    evening: day.bands[threshold].evening,
    clockBreak: day.clockBreak,
  }));
  return bandPath(points);
}

function edge(series: YearSeries, side: 'morning' | 'evening'): string {
  const points: LinePoint[] = series.days.map((day) => ({
    minutes: day.rise.kind === 'event' ? day.bands.sunrise[side] : null,
    clockBreak: day.clockBreak,
  }));
  return linePath(points);
}

function frameX(index: number, dayCount: number): number {
  return PLOT.x + (plotViewX(index, dayCount) / PLOT_VIEW.width) * PLOT.width;
}

function frameY(minutes: number): number {
  return PLOT.y + (minutes / 1440) * PLOT.height;
}

const a = yearSeries(city('tampere'), EARTH_OBLIQUITY_DEG, YEAR, { clockMode: 'local' });
const b = yearSeries(city('niigata'), EARTH_OBLIQUITY_DEG, YEAR, { clockMode: 'local' });
const ticks = monthTicks(a.days);
const dayCount = a.dayCount;

const hourLabels = [0, 6, 12, 18, 24]
  .map(
    (hour) =>
      `<text x="${PLOT.x - 14}" y="${frameY(hour * 60)}" text-anchor="end" ` +
      `dominant-baseline="middle" font-family="${MONO}" font-size="16" fill="${COLOR.muted}">` +
      `${hourLabel(hour)}</text>`,
  )
  .join('\n    ');

const monthLabels = ticks
  .map(
    (tick) =>
      `<text x="${frameX(tick.labelIndex, dayCount).toFixed(1)}" y="${PLOT.y + PLOT.height + 27}" ` +
      `text-anchor="middle" font-family="${MONO}" font-size="18" letter-spacing="1.4" ` +
      `fill="${COLOR.muted}">${tick.label}</text>`,
  )
  .join('\n    ');

const hourRulesSvg = [6, 12, 18]
  .map(
    (hour) =>
      `<line x1="0" x2="${PLOT_VIEW.width}" y1="${hour * 60}" y2="${hour * 60}" ` +
      `stroke="${COLOR.rule}" stroke-width="1" vector-effect="non-scaling-stroke" />`,
  )
  .join('\n        ');

const monthRules = ticks
  .filter((tick) => tick.startIndex > 0)
  .map((tick) => {
    const x = plotViewX(tick.startIndex, dayCount).toFixed(1);
    return (
      `<line x1="${x}" x2="${x}" y1="0" y2="${PLOT_VIEW.height}" stroke="${COLOR.rule}" ` +
      `stroke-width="1" vector-effect="non-scaling-stroke" />`
    );
  })
  .join('\n        ');

const bandPaths = BANDS.map(
  (threshold) => `<path d="${band(a, threshold)}" fill="${COLOR[threshold]}" />`,
).join('\n        ');

const overlayPaths = (['morning', 'evening'] as const)
  .flatMap((side) => {
    const d = edge(b, side);
    return [
      `<path d="${d}" fill="none" stroke="${COLOR.overlayHalo}" stroke-width="6" ` +
        `stroke-linejoin="round" vector-effect="non-scaling-stroke" />`,
      `<path d="${d}" fill="none" stroke="${COLOR.overlay}" stroke-width="2.5" ` +
        `stroke-linejoin="round" vector-effect="non-scaling-stroke" />`,
    ];
  })
  .join('\n        ');

let legendX = PLOT.x;
const legendItems = LEGEND.map((entry) => {
  const x = legendX;
  legendX += 24 + entry.label.length * 8.6 + 26;
  return (
    `<rect x="${x.toFixed(0)}" y="${PLOT.y + PLOT.height + 51}" width="14" height="14" rx="3" ` +
    `fill="${entry.fill}" stroke="${COLOR.frame}" />` +
    `<text x="${(x + 22).toFixed(0)}" y="${PLOT.y + PLOT.height + 62}" font-family="${FONT}" ` +
    `font-size="16" fill="${COLOR.muted}">${entry.label}</text>`
  );
}).join('\n    ');

const overlayKeyX = legendX + 4;

process.stdout
  .write(`<svg xmlns="http://www.w3.org/2000/svg" width="${FRAME.width}" height="${FRAME.height}" viewBox="0 0 ${FRAME.width} ${FRAME.height}">
  <rect width="${FRAME.width}" height="${FRAME.height}" fill="${COLOR.bg}" />

  <text x="64" y="92" font-family="${FONT}" font-size="54" font-weight="700" letter-spacing="-1" fill="${COLOR.text}">Daylight Lab</text>
  <text x="64" y="134" font-family="${FONT}" font-size="23" fill="${COLOR.muted}">A year of daylight in Tampere, 61.5°N, against Niigata, 37.9°N.</text>
  <text x="${FRAME.width - 64}" y="92" text-anchor="end" font-family="${MONO}" font-size="30" fill="${COLOR.sun}">23.44°</text>
  <text x="${FRAME.width - 64}" y="126" text-anchor="end" font-family="${FONT}" font-size="17" fill="${COLOR.muted}">axial tilt · year 2026</text>

  <g>
    ${hourLabels}
    ${monthLabels}
    <svg x="${PLOT.x}" y="${PLOT.y}" width="${PLOT.width}" height="${PLOT.height}" viewBox="0 0 ${PLOT_VIEW.width} ${PLOT_VIEW.height}" preserveAspectRatio="none">
        <rect width="${PLOT_VIEW.width}" height="${PLOT_VIEW.height}" fill="${COLOR.night}" />
        ${bandPaths}
        ${hourRulesSvg}
        ${monthRules}
        ${overlayPaths}
    </svg>
    <rect x="${PLOT.x}" y="${PLOT.y}" width="${PLOT.width}" height="${PLOT.height}" fill="none" stroke="${COLOR.frame}" />
    ${legendItems}
    <line x1="${overlayKeyX}" x2="${overlayKeyX + 16}" y1="${PLOT.y + PLOT.height + 58}" y2="${PLOT.y + PLOT.height + 58}" stroke="${COLOR.overlay}" stroke-width="2.5" />
    <text x="${overlayKeyX + 24}" y="${PLOT.y + PLOT.height + 62}" font-family="${FONT}" font-size="16" fill="${COLOR.muted}">Niigata sunrise and sunset</text>
  </g>

  <text x="64" y="${FRAME.height - 28}" font-family="${MONO}" font-size="16" fill="${COLOR.muted}">daylight-lab.omusubilabs.fi</text>
  <text x="${FRAME.width - 64}" y="${FRAME.height - 28}" text-anchor="end" font-family="${FONT}" font-size="16" fill="${COLOR.muted}">Omusubi Labs Experiments</text>
</svg>
`);

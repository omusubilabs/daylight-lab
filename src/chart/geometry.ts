/**
 * Pure geometry for the year chart. Two coordinate spaces, per docs/ui-spec.md: the outer frame,
 * where axis text lives at a fixed size, and the plot's own space, which a nested `<svg>` with
 * `preserveAspectRatio="none"` stretches into the plot rectangle. Plot y is simply minutes since
 * local midnight, so a path's numbers are readable as clock times.
 *
 * The frame is measured in CSS pixels rather than in a fixed viewBox, so `13px` axis text is 13px
 * whether the chart is 1060 wide on a desktop or 343 wide on a phone. Only the plot is ever
 * stretched, which is why its aspect ratio can change with the viewport and the labels cannot.
 */

const MINUTES_PER_DAY = 1440;

/** Room for the hour labels on the left, the month initials below, and half a line above. */
const GUTTER = { left: 54, top: 14, right: 12, bottom: 28 } as const;

/** What the chart draws at before it has been measured, and the desktop size in practice. */
export const DEFAULT_FRAME = { width: 1100, height: 420 } as const;

/** Below this the axis would eat the plot; a chart this small is off-spec anyway. */
const MIN_PLOT = { width: 120, height: 120 } as const;

export const PLOT_VIEW = { width: 1000, height: MINUTES_PER_DAY } as const;

export const HOUR_STEP = 3;

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ChartLayout {
  readonly width: number;
  readonly height: number;
  readonly plot: Rect;
  /** The plot rectangle as fractions of the frame, so an overlay can sit exactly on top of it. */
  readonly inset: {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  };
}

export function chartLayout(width: number, height: number): ChartLayout {
  const frameWidth = Math.max(width, GUTTER.left + GUTTER.right + MIN_PLOT.width);
  const frameHeight = Math.max(height, GUTTER.top + GUTTER.bottom + MIN_PLOT.height);
  const plot: Rect = {
    x: GUTTER.left,
    y: GUTTER.top,
    width: frameWidth - GUTTER.left - GUTTER.right,
    height: frameHeight - GUTTER.top - GUTTER.bottom,
  };

  return {
    width: frameWidth,
    height: frameHeight,
    plot,
    inset: {
      left: plot.x / frameWidth,
      top: plot.y / frameHeight,
      width: plot.width / frameWidth,
      height: plot.height / frameHeight,
    },
  };
}

export const DEFAULT_LAYOUT = chartLayout(DEFAULT_FRAME.width, DEFAULT_FRAME.height);

const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] as const;

/** Day 1 sits on the left edge and the last day on the right edge, evenly spaced between. */
export function plotViewX(index: number, dayCount: number): number {
  return dayCount < 2 ? 0 : (index / (dayCount - 1)) * PLOT_VIEW.width;
}

export function frameX(layout: ChartLayout, index: number, dayCount: number): number {
  return layout.plot.x + (plotViewX(index, dayCount) / PLOT_VIEW.width) * layout.plot.width;
}

export function frameY(layout: ChartLayout, minutes: number): number {
  return layout.plot.y + (minutes / MINUTES_PER_DAY) * layout.plot.height;
}

/** The inverse of `plotViewX`: which day the pointer is over, 0 at the left edge and 1 at the right. */
export function dayIndexAtFraction(fraction: number, dayCount: number): number {
  if (dayCount < 2) return 0;
  const index = Math.round(fraction * (dayCount - 1));
  return Math.min(Math.max(index, 0), dayCount - 1);
}

export interface BandPoint {
  readonly morning: number;
  readonly evening: number;
  readonly clockBreak: boolean;
}

export interface LinePoint {
  /** `null` where the event does not happen at all, which breaks the line rather than faking one. */
  readonly minutes: number | null;
  readonly clockBreak: boolean;
}

/** Sub-pixel precision in the plot space; one decimal is a fortieth of a device pixel. */
function n(value: number): string {
  return value.toFixed(1);
}

/**
 * Runs of days the wall clock carries across without a jump. A DST change is a genuine vertical
 * step in local-clock mode and must break the path rather than be interpolated across.
 */
interface Indexed<T> {
  readonly index: number;
  readonly point: T;
}

interface Run<T> {
  readonly items: Indexed<T>[];
  /** The run abuts a clock jump on this side, so its edge belongs at the midnight in between. */
  readonly stepBefore: boolean;
  readonly stepAfter: boolean;
}

/**
 * Splits a year into runs the wall clock carries across without a jump. A DST change is a genuine
 * vertical step in local-clock mode and must break the path rather than be interpolated across
 * (docs/ui-spec.md). `absent` breaks the run too, but as a hard stop rather than a step: nothing
 * is drawn where the event does not happen.
 */
function runs<T extends { readonly clockBreak: boolean }>(
  points: readonly T[],
  absent: (point: T) => boolean = () => false,
): Run<T>[] {
  const result: Run<T>[] = [];
  let items: Indexed<T>[] = [];
  let stepBefore = false;

  const flush = (stepAfter: boolean): void => {
    if (items.length > 0) result.push({ items, stepBefore, stepAfter });
    items = [];
  };

  points.forEach((point, index) => {
    if (absent(point)) {
      flush(false);
      stepBefore = false;
      return;
    }
    if (point.clockBreak && items.length > 0) {
      flush(true);
      stepBefore = true;
    }
    items.push({ index, point });
  });

  flush(false);
  return result;
}

/**
 * The clock jumps overnight, so the step sits halfway between the two days rather than on either
 * of them. Adjacent runs therefore share an edge and the fill stays continuous across the step.
 */
function edgeX(run: Run<unknown>, side: 'start' | 'end', dayCount: number): number | undefined {
  const item = side === 'start' ? run.items[0] : run.items[run.items.length - 1];
  const step = side === 'start' ? run.stepBefore : run.stepAfter;
  if (!item || !step) return undefined;
  return plotViewX(item.index + (side === 'start' ? -0.5 : 0.5), dayCount);
}

/**
 * One closed subpath per run: the morning edge left to right, then the evening edge back again.
 * One path per band, never 365 rectangles (docs/ui-spec.md).
 */
export function bandPath(points: readonly BandPoint[], dayCount = points.length): string {
  const segments: string[] = [];

  for (const run of runs(points)) {
    const first = run.items[0];
    const last = run.items[run.items.length - 1];
    if (!first || !last) continue;

    const startX = edgeX(run, 'start', dayCount);
    const endX = edgeX(run, 'end', dayCount);
    const commands: string[] = [];

    if (startX !== undefined) commands.push(`M${n(startX)},${n(first.point.morning)}`);
    run.items.forEach(({ index, point }, position) => {
      const command = position === 0 && startX === undefined ? 'M' : 'L';
      commands.push(`${command}${n(plotViewX(index, dayCount))},${n(point.morning)}`);
    });

    if (endX !== undefined) {
      commands.push(`L${n(endX)},${n(last.point.morning)}`, `L${n(endX)},${n(last.point.evening)}`);
    }
    for (const { index, point } of [...run.items].reverse()) {
      commands.push(`L${n(plotViewX(index, dayCount))},${n(point.evening)}`);
    }
    if (startX !== undefined) commands.push(`L${n(startX)},${n(first.point.evening)}`);

    segments.push(`${commands.join('')}Z`);
  }

  return segments.join('');
}

/** An open polyline, stopping where the event stops happening and stepping where the clock jumps. */
export function linePath(points: readonly LinePoint[], dayCount = points.length): string {
  const segments: string[] = [];

  for (const run of runs(points, (point) => point.minutes === null)) {
    const first = run.items[0];
    const last = run.items[run.items.length - 1];
    if (!first || !last || first.point.minutes === null || last.point.minutes === null) continue;
    if (run.items.length < 2) continue;

    const startX = edgeX(run, 'start', dayCount);
    const endX = edgeX(run, 'end', dayCount);
    const commands: string[] = [];

    if (startX !== undefined) commands.push(`M${n(startX)},${n(first.point.minutes)}`);
    run.items.forEach(({ index, point }, position) => {
      if (point.minutes === null) return;
      const command = position === 0 && startX === undefined ? 'M' : 'L';
      commands.push(`${command}${n(plotViewX(index, dayCount))},${n(point.minutes)}`);
    });
    if (endX !== undefined) commands.push(`L${n(endX)},${n(last.point.minutes)}`);

    segments.push(commands.join(''));
  }

  return segments.join('');
}

export interface MonthTick {
  readonly month: number;
  readonly label: string;
  readonly startIndex: number;
  /** Where the initial is centred: the middle of the month, not its edge. */
  readonly labelIndex: number;
}

export function monthTicks(days: readonly { readonly month: number }[]): MonthTick[] {
  const ticks: MonthTick[] = [];

  days.forEach((day, index) => {
    const previous = ticks[ticks.length - 1];
    if (previous && previous.month === day.month) return;
    ticks.push({
      month: day.month,
      label: MONTH_INITIALS[day.month - 1] ?? '',
      startIndex: index,
      labelIndex: index,
    });
  });

  return ticks.map((tick, position) => {
    const next = ticks[position + 1];
    const end = next ? next.startIndex : days.length;
    return { ...tick, labelIndex: (tick.startIndex + end - 1) / 2 };
  });
}

export function hourRules(): number[] {
  const rules: number[] = [];
  for (let hour = 0; hour <= 24; hour += HOUR_STEP) rules.push(hour);
  return rules;
}

export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

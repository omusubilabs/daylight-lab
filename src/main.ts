import './styles.css';
import { dayIndexAtFraction } from './chart/geometry.ts';
import { createYearChart } from './chart/yearChart.ts';
import { cityById } from './data/cities.ts';
import type { City } from './data/cities.ts';
import { dayAt, shiftMonths, yearSeries } from './lib/year/index.ts';
import type { YearSeries } from './lib/year/index.ts';
import {
  DAY_COUNT,
  DEFAULT_STATE,
  REFERENCE_YEAR,
  clampDayIndex,
  clampTilt,
  sameState,
} from './state/appState.ts';
import type { AppState } from './state/appState.ts';
import { formatHash, parseHash } from './state/hash.ts';
import type { ClockMode } from './lib/time/index.ts';
import { createCityControls } from './ui/cityControls.ts';
import { createClockToggle } from './ui/clockToggle.ts';
import { createDataTable } from './ui/dataTable.ts';
import { createDayReadout } from './ui/dayReadout.ts';
import { el } from './ui/dom.ts';
import { createInlineControls } from './ui/inlineControls.ts';
import { createTiltControl } from './ui/tiltControl.ts';
import { createTiltDiagram } from './ui/tiltDiagram.ts';

/** Every other day while the slider is moving, full resolution once it stops (docs/ui-spec.md). */
const DRAFT_SAMPLE_STEP = 2;
const SETTLE_MS = 140;
/** Browsers throttle `replaceState`, so a drag cannot write the hash on every frame. */
const HASH_WRITE_MS = 250;
const PRESET_ANIMATION_MS = 600;

/** History is only ever asked to remember a preset; everything else replaces (docs/product-spec.md). */
type Commit = 'none' | 'defer' | 'replace' | 'push';

const app = document.querySelector('#app');
if (!app) throw new Error('#app is missing from index.html');

function requireCity(id: string): City {
  const city = cityById(id);
  if (!city) throw new Error(`unknown city id: ${id}`);
  return city;
}

let state = parseHash(window.location.hash);

/**
 * One value, several controls: the slider and the number in the prose write it through the same
 * path (docs/design-direction.md §5.3).
 */
function setTilt(tiltDeg: number): void {
  stopAnimation();
  apply({ ...state, tiltDeg }, 'defer', true);
}

/** A named preset, wherever it is pressed from (docs/design-direction.md §5.5). */
function setPreset(tiltDeg: number): void {
  animateTiltTo(tiltDeg);
}

/** A named clock mode, wherever it is pressed from (docs/design-direction.md §5.5). */
function setClockMode(clockMode: ClockMode): void {
  apply({ ...state, clockMode }, 'replace', false);
}

const tiltControl = createTiltControl({
  onPreset: setPreset,
  onCityReset: () =>
    apply(
      { ...state, cityAId: DEFAULT_STATE.cityAId, cityBId: DEFAULT_STATE.cityBId },
      'push',
      false,
    ),
});

const diagram = createTiltDiagram({ onInput: setTilt });
tiltControl.diagramSlot.append(diagram.element);

// The prose is already in the document, so these upgrade markup rather than build it.
const inlineControls = createInlineControls(app, {
  onInput: setTilt,
  onDayPreview: previewDay,
  onDayActivate: scrubTo,
  onPreset: setPreset,
  onClockMode: setClockMode,
});

const cityControls = createCityControls({
  onChange: (cityAId, cityBId) => apply({ ...state, cityAId, cityBId }, 'replace', false),
});

const clockToggle = createClockToggle({
  onChange: setClockMode,
});

const chartControls = el('div', 'chart-controls');
chartControls.append(cityControls.element, clockToggle.element);

function seriesFor(city: City, sampleStep: number): YearSeries {
  return yearSeries(city, state.tiltDeg, REFERENCE_YEAR, {
    clockMode: state.clockMode,
    sampleStep,
  });
}

let seriesA = seriesFor(requireCity(state.cityAId), 1);
let seriesB = seriesFor(requireCity(state.cityBId), 1);
let renderedSeriesKey = seriesKey(1);

const chart = createYearChart({ a: seriesA, b: seriesB, dayIndex: state.dayIndex });
const dataTable = createDataTable(seriesA, seriesB);
const readout = createDayReadout();

// The prose is already in `#app`; the controls and the chart belong above it.
const dockSentinel = el('div', 'chart-dock');
app.prepend(
  tiltControl.element,
  chartControls,
  dockSentinel,
  chart.element,
  dataTable.element,
  readout.element,
);

// A stuck element is not a state CSS can select on, so the gap above the chart is watched
// instead. The two edges of that gap are read separately: the chart docks once the gap is gone
// from the top of the viewport and undocks once all of it is back, which leaves a band of scroll
// positions where the state simply holds (docs/design-direction.md §5.2).
new IntersectionObserver(
  ([entry]) => {
    if (!entry) return;
    if (entry.boundingClientRect.bottom <= 0) chart.setDocked(true);
    else if (entry.boundingClientRect.top >= 0) chart.setDocked(false);
  },
  { threshold: [0, 1] },
).observe(dockSentinel);

function seriesKey(sampleStep: number): string {
  return [state.tiltDeg, state.cityAId, state.cityBId, state.clockMode, sampleStep].join('|');
}

function draw(draft: boolean): void {
  const sampleStep = draft ? DRAFT_SAMPLE_STEP : 1;
  const cityA = requireCity(state.cityAId);
  const cityB = requireCity(state.cityBId);

  if (seriesKey(sampleStep) !== renderedSeriesKey) {
    seriesA = seriesFor(cityA, sampleStep);
    seriesB = seriesFor(cityB, sampleStep);
    renderedSeriesKey = seriesKey(sampleStep);
    chart.update({ a: seriesA, b: seriesB, dayIndex: state.dayIndex });
    // The hidden table is a reading surface, not a moving one: it is left alone until the drag
    // settles and the full-resolution year is back.
    if (!draft) dataTable.update(seriesA, seriesB);
  } else {
    chart.setCursor(state.dayIndex);
  }

  tiltControl.update(state.tiltDeg);
  inlineControls.update(state.tiltDeg, state.clockMode);
  diagram.update(state.tiltDeg, cityA, cityB);
  cityControls.update(state.cityAId, state.cityBId);
  clockToggle.update(state.clockMode);

  // The chart may be drawing a sampled year that skips this day, so the figures are solved again
  // at full precision for the scrubbed date alone.
  const options = { clockMode: state.clockMode };
  const data = {
    year: REFERENCE_YEAR,
    dayIndex: state.dayIndex,
    clockMode: state.clockMode,
    a: { city: cityA, day: dayAt(cityA, state.tiltDeg, REFERENCE_YEAR, state.dayIndex, options) },
    b: { city: cityB, day: dayAt(cityB, state.tiltDeg, REFERENCE_YEAR, state.dayIndex, options) },
  };
  readout.update(data);
  chart.scrubSurface.setAttribute('aria-valuenow', String(state.dayIndex + 1));
  chart.scrubSurface.setAttribute('aria-valuetext', readout.summary(data));
}

let frameHandle = 0;
let frameIsDraft = false;
let settleHandle = 0;

function requestRender(draft: boolean): void {
  frameIsDraft = draft;
  if (frameHandle === 0) {
    frameHandle = requestAnimationFrame(() => {
      frameHandle = 0;
      draw(frameIsDraft);
    });
  }

  window.clearTimeout(settleHandle);
  if (draft) settleHandle = window.setTimeout(() => draw(false), SETTLE_MS);
}

let hashHandle = 0;

function writeHash(mode: 'replace' | 'push'): void {
  window.clearTimeout(hashHandle);
  const hash = formatHash(state);
  if (window.location.hash === hash) return;
  if (mode === 'push') window.history.pushState(null, '', hash);
  else window.history.replaceState(null, '', hash);
}

function apply(next: AppState, commit: Commit, draft: boolean): void {
  if (sameState(next, state)) return;
  state = next;

  if (commit === 'push' || commit === 'replace') writeHash(commit);
  else {
    window.clearTimeout(hashHandle);
    if (commit === 'defer')
      hashHandle = window.setTimeout(() => writeHash('replace'), HASH_WRITE_MS);
  }

  requestRender(draft);
}

let animationHandle = 0;

function stopAnimation(): void {
  if (animationHandle !== 0) cancelAnimationFrame(animationHandle);
  animationHandle = 0;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The last animation frame may already have landed on the target, and `apply` would then see no
 * change and skip the history entry the preset exists to leave behind.
 */
function commitPreset(target: number): void {
  state = { ...state, tiltDeg: clampTilt(target) };
  writeHash('push');
  requestRender(false);
}

function animateTiltTo(target: number): void {
  stopAnimation();
  const from = state.tiltDeg;

  if (from === clampTilt(target) || prefersReducedMotion()) {
    commitPreset(target);
    return;
  }

  const startedAt = performance.now();
  const step = (now: number): void => {
    const progress = Math.min((now - startedAt) / PRESET_ANIMATION_MS, 1);
    if (progress >= 1) {
      animationHandle = 0;
      commitPreset(target);
      return;
    }
    const eased = 1 - (1 - progress) ** 3;
    apply({ ...state, tiltDeg: clampTilt(from + (target - from) * eased) }, 'none', true);
    animationHandle = requestAnimationFrame(step);
  };

  animationHandle = requestAnimationFrame(step);
}

function scrubTo(dayIndex: number): void {
  apply({ ...state, dayIndex: clampDayIndex(dayIndex) }, 'defer', false);
}

/** Hover/focus on a date in the prose moves the cursor without touching state (§5.4); `null`
 * hands it back to whatever date is actually committed. */
function previewDay(dayIndex: number | null): void {
  chart.setCursor(dayIndex ?? state.dayIndex);
}

function scrubFromPointer(event: PointerEvent): void {
  const rect = chart.scrubSurface.getBoundingClientRect();
  if (rect.width === 0) return;
  scrubTo(dayIndexAtFraction((event.clientX - rect.left) / rect.width, DAY_COUNT));
}

chart.scrubSurface.addEventListener('pointerdown', (event) => {
  chart.scrubSurface.setPointerCapture(event.pointerId);
  scrubFromPointer(event);
});
chart.scrubSurface.addEventListener('pointermove', scrubFromPointer);

chart.scrubSurface.addEventListener('keydown', (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;

  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowUp':
      scrubTo(state.dayIndex + 1);
      break;
    case 'ArrowLeft':
    case 'ArrowDown':
      scrubTo(state.dayIndex - 1);
      break;
    case 'PageUp':
      scrubTo(shiftMonths(REFERENCE_YEAR, state.dayIndex, 1));
      break;
    case 'PageDown':
      scrubTo(shiftMonths(REFERENCE_YEAR, state.dayIndex, -1));
      break;
    case 'Home':
      scrubTo(0);
      break;
    case 'End':
      scrubTo(DAY_COUNT - 1);
      break;
    default:
      return;
  }

  event.preventDefault();
});

function adoptHash(): void {
  const next = parseHash(window.location.hash);
  if (sameState(next, state)) return;
  stopAnimation();
  state = next;
  requestRender(false);
}

window.addEventListener('popstate', adoptHash);
window.addEventListener('hashchange', adoptHash);

draw(false);

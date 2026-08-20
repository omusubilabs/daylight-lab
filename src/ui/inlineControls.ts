/**
 * The live numbers in the prose (docs/design-direction.md §5.3, §5.7). A number is upgraded to a
 * control only when it is a parameter of the model; a number that is a result recomputes but
 * cannot be grabbed, and the two must never be confusable.
 *
 * Nothing here holds state. The drag and the range input are two controls over one `AppState`.
 */
import { formatTilt } from '../lib/format.ts';
import { dayIndexFromDate } from '../lib/year/index.ts';
import { computeReactiveProse } from '../lib/year/prose.ts';
import type { ReactiveProse } from '../lib/year/prose.ts';
import type { ClockMode } from '../lib/time/index.ts';
import { REFERENCE_YEAR, TILT_MAX_DEG, TILT_MIN_DEG, clampTilt } from '../state/appState.ts';
import { tiltAfterDrag, tiltAfterKey, tiltValueText } from './tiltInput.ts';

export interface InlineControlsOptions {
  /** Fired while the number is being dragged, so the chart can drop resolution until it settles. */
  onInput(tiltDeg: number): void;
  /** Hover or focus on a date button; `null` when it ends, to hand the cursor back to `state`. */
  onDayPreview(dayIndex: number | null): void;
  /** Click or keyboard-activate a date button (docs/design-direction.md §5.4). */
  onDayActivate(dayIndex: number): void;
}

export interface InlineControls {
  update(tiltDeg: number, clockMode: ClockMode): void;
}

interface Figure {
  readonly key: string;
  readonly element: HTMLElement;
}

export function createInlineControls(
  root: ParentNode,
  options: InlineControlsOptions,
): InlineControls {
  const sliders = [...root.querySelectorAll<HTMLElement>('[data-control="tilt"]')];
  const dateButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-control="date"]')];
  const declinations = [...root.querySelectorAll<HTMLElement>('[data-figure="declination"]')];
  // §5.7: everything else in the prose that recomputes with the tilt, keyed by `data-figure` to
  // the matching property of `ReactiveProse` — one lookup covers a single span and a whole clause
  // alike, so a new figure is a new `data-figure` attribute plus a new field, not a new loop.
  const figures: readonly Figure[] = [...root.querySelectorAll<HTMLElement>('[data-figure]')]
    .filter((element) => element.dataset.figure !== 'declination')
    .map((element) => ({ key: element.dataset.figure as string, element }));

  // Two presses inside one frame would both read the same stale text, because the number is only
  // written back on redraw; stepping from the value last emitted keeps every press.
  let current = clampTilt(TILT_MIN_DEG);

  const emit = (tiltDeg: number): void => {
    current = clampTilt(tiltDeg);
    options.onInput(current);
  };

  for (const slider of sliders) {
    // The affordance is added here rather than in the markup: without this module the number is
    // prose, and a dashed underline would be promising a drag that nothing implements.
    slider.classList.add('prose__slider');
    slider.tabIndex = 0;
    slider.setAttribute('role', 'slider');
    slider.setAttribute('aria-label', 'Earth’s axial tilt');
    slider.setAttribute('aria-valuemin', String(TILT_MIN_DEG));
    slider.setAttribute('aria-valuemax', String(TILT_MAX_DEG));

    let startX = 0;
    let startDeg = 0;
    let dragging = false;

    slider.addEventListener('pointerdown', (event) => {
      // A right-click opens a menu and never delivers the matching `pointerup`, which would leave
      // the drag armed and the next hover changing the tilt unpressed.
      if (event.button !== 0) return;
      slider.setPointerCapture(event.pointerId);
      dragging = true;
      startX = event.clientX;
      startDeg = current;
    });

    slider.addEventListener('pointermove', (event) => {
      // Measured from where the press landed, never from the element: the number's own box
      // moves as the value changes width, and would otherwise feed back into the reading.
      if (dragging) emit(tiltAfterDrag(startDeg, event.clientX - startX));
    });

    const endDrag = (): void => {
      dragging = false;
    };
    slider.addEventListener('pointerup', endDrag);
    slider.addEventListener('pointercancel', endDrag);

    slider.addEventListener('keydown', (event) => {
      const next = tiltAfterKey(current, event);
      if (next === null) return;
      event.preventDefault();
      emit(next);
    });
  }

  // An address, not a slider: the day it names never moves, so a native <button> gets keyboard
  // and touch activation for free and only the affordance class is added here (§5.3, §5.4).
  for (const button of dateButtons) {
    button.classList.add('prose__date');
    const month = Number(button.dataset.month);
    const day = Number(button.dataset.day);
    const dayIndex = dayIndexFromDate(REFERENCE_YEAR, month, day) ?? 0;

    button.addEventListener('mouseenter', () => options.onDayPreview(dayIndex));
    button.addEventListener('mouseleave', () => options.onDayPreview(null));
    button.addEventListener('focus', () => options.onDayPreview(dayIndex));
    button.addEventListener('blur', () => options.onDayPreview(null));
    button.addEventListener('click', () => options.onDayActivate(dayIndex));
  }

  for (const declination of declinations) declination.classList.add('prose__value');
  for (const figure of figures) figure.element.classList.add('prose__value');

  const update = (tiltDeg: number, clockMode: ClockMode): void => {
    const tilt = clampTilt(tiltDeg);
    current = tilt;
    const text = formatTilt(tilt);

    for (const slider of sliders) {
      slider.textContent = text;
      slider.setAttribute('aria-valuenow', String(tilt));
      slider.setAttribute('aria-valuetext', tiltValueText(tilt));
    }

    // The solstice declination is the obliquity itself — `asin(sin ε · sin λ)` at `λ = ±90°`
    // (docs/solar-math.md §2) — so the sentence's own figures are the tilt read back as a result.
    for (const declination of declinations) declination.textContent = text;

    const prose = computeReactiveProse(tilt, REFERENCE_YEAR, clockMode);
    for (const figure of figures) {
      figure.element.textContent = prose[figure.key as keyof ReactiveProse];
    }
  };

  return { update };
}

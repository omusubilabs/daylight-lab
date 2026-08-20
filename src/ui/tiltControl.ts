import { formatTilt } from '../lib/format.ts';
import { EARTH_OBLIQUITY_DEG } from '../lib/solar/index.ts';
import { TILT_MAX_DEG, TILT_MIN_DEG, TILT_STEP_DEG, clampTilt } from '../state/appState.ts';
import { el } from './dom.ts';

/** docs/ui-spec.md — the native step is the share link's precision, not a usable keyboard step. */
const KEY_STEP_DEG = 0.5;
const FINE_KEY_STEP_DEG = 0.1;

export interface TiltPreset {
  readonly label: string;
  readonly tiltDeg: number;
  /** Read out after the number by `aria-valuetext`, so the value has meaning without the diagram. */
  readonly meaning: string;
}

export const TILT_PRESETS: readonly TiltPreset[] = [
  { label: 'Earth today (23.44°)', tiltDeg: EARTH_OBLIQUITY_DEG, meaning: "Earth's actual tilt" },
  { label: 'No tilt (0°)', tiltDeg: 0, meaning: 'no seasons anywhere' },
  { label: 'Extreme tilt (40°)', tiltDeg: 40, meaning: 'Tampere inside the polar circle' },
];

export interface TiltControlOptions {
  /** Fired while the slider is moving, so the chart can drop resolution until it settles. */
  onInput(tiltDeg: number): void;
  onPreset(tiltDeg: number): void;
  onCityReset(): void;
}

export interface TiltControl {
  readonly element: HTMLElement;
  readonly diagramSlot: HTMLElement;
  update(tiltDeg: number): void;
}

function valueText(tiltDeg: number): string {
  const preset = TILT_PRESETS.find((candidate) => candidate.tiltDeg === clampTilt(tiltDeg));
  const degrees = `${clampTilt(tiltDeg)} degrees`;
  return preset ? `${degrees}, ${preset.meaning}` : degrees;
}

export function createTiltControl(options: TiltControlOptions): TiltControl {
  const slider = el('input', 'tilt__slider');
  slider.type = 'range';
  slider.id = 'tilt';
  slider.min = String(TILT_MIN_DEG);
  slider.max = String(TILT_MAX_DEG);
  slider.step = String(TILT_STEP_DEG);

  const label = el('label', 'tilt__label', 'Earth’s axial tilt');
  label.htmlFor = slider.id;

  const value = el('output', 'tilt__value');
  value.htmlFor = slider.id;

  const heading = el('div', 'tilt__heading');
  heading.append(label, value);
  const diagramSlot = el('div', 'tilt__diagram');

  const presets = el('div', 'presets');
  for (const preset of TILT_PRESETS) {
    const button = el('button', 'presets__button', preset.label);
    button.type = 'button';
    button.addEventListener('click', () => options.onPreset(preset.tiltDeg));
    presets.append(button);
  }

  const cityReset = el('button', 'presets__button presets__button--cities', 'Tampere vs Niigata');
  cityReset.type = 'button';
  cityReset.addEventListener('click', () => options.onCityReset());
  presets.append(cityReset);

  // Two presses inside one frame would both read the same stale `slider.value`, because the input
  // is only written back on redraw; stepping from the value last emitted keeps every press.
  let current = clampTilt(TILT_MIN_DEG);

  const emit = (tiltDeg: number): void => {
    current = clampTilt(tiltDeg);
    options.onInput(current);
  };

  slider.addEventListener('input', () => emit(Number(slider.value)));

  // Home and End already reach 0° and 45°; the arrows would otherwise step by the 0.01° share
  // precision, which is 4500 presses from end to end (docs/ui-spec.md).
  slider.addEventListener('keydown', (event) => {
    const direction =
      event.key === 'ArrowRight' || event.key === 'ArrowUp'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
          ? -1
          : 0;
    if (direction === 0 || event.altKey || event.ctrlKey || event.metaKey) return;

    event.preventDefault();
    const step = event.shiftKey ? FINE_KEY_STEP_DEG : KEY_STEP_DEG;
    emit(current + direction * step);
  });

  const element = el('section', 'tilt');
  element.append(heading, diagramSlot, slider, presets);

  const update = (tiltDeg: number): void => {
    const tilt = clampTilt(tiltDeg);
    current = tilt;
    if (Number(slider.value) !== tilt) slider.value = String(tilt);
    slider.setAttribute('aria-valuetext', valueText(tilt));
    value.textContent = formatTilt(tilt);
  };

  return { element, diagramSlot, update };
}

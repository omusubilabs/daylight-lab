import { formatTilt } from '../lib/format.ts';
import { TILT_MAX_DEG, TILT_MIN_DEG, TILT_STEP_DEG, clampTilt } from '../state/appState.ts';
import { el } from './dom.ts';
import { TILT_PRESETS, tiltAfterKey, tiltValueText } from './tiltInput.ts';

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

  // The native arrows would step by the 0.01° share precision, which is 4500 presses from end to
  // end, so the whole key map is taken over rather than patched (docs/ui-spec.md).
  slider.addEventListener('keydown', (event) => {
    const next = tiltAfterKey(current, event);
    if (next === null) return;
    event.preventDefault();
    emit(next);
  });

  const element = el('section', 'tilt');
  element.append(heading, diagramSlot, slider, presets);

  const update = (tiltDeg: number): void => {
    const tilt = clampTilt(tiltDeg);
    current = tilt;
    if (Number(slider.value) !== tilt) slider.value = String(tilt);
    slider.setAttribute('aria-valuetext', tiltValueText(tilt));
    value.textContent = formatTilt(tilt);
  };

  return { element, diagramSlot, update };
}

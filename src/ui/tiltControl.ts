import { formatTilt } from '../lib/format.ts';
import { clampTilt } from '../state/appState.ts';
import { el } from './dom.ts';
import { TILT_PRESETS } from './tiltInput.ts';

export interface TiltControlOptions {
  onPreset(tiltDeg: number): void;
  onCityReset(): void;
}

export interface TiltControl {
  readonly element: HTMLElement;
  readonly diagramSlot: HTMLElement;
  update(tiltDeg: number): void;
}

export function createTiltControl(options: TiltControlOptions): TiltControl {
  // The diagram's grip is the control now (design-direction §5.6); this is read-only display, so
  // the label is a `<span>` rather than a `<label>` with nothing to point at.
  const label = el('span', 'tilt__label', 'Earth’s axial tilt');
  const value = el('output', 'tilt__value');

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

  const element = el('section', 'tilt');
  element.append(heading, diagramSlot, presets);

  const update = (tiltDeg: number): void => {
    value.textContent = formatTilt(clampTilt(tiltDeg));
  };

  return { element, diagramSlot, update };
}

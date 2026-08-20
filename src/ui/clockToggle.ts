import type { ClockMode } from '../lib/time/index.ts';
import { el } from './dom.ts';

const MODES: readonly { readonly mode: ClockMode; readonly label: string }[] = [
  { mode: 'local', label: 'Local clock' },
  { mode: 'solar', label: 'Solar time' },
];

export interface ClockToggleOptions {
  onChange(mode: ClockMode): void;
}

export interface ClockToggle {
  readonly element: HTMLElement;
  update(mode: ClockMode): void;
}

/**
 * A segmented control is a radio group, so it takes one tab stop and the arrow keys move within it
 * (docs/ui-spec.md, keyboard operation).
 */
export function createClockToggle(options: ClockToggleOptions): ClockToggle {
  const group = el('div', 'segmented');
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-label', 'Clock mode');

  const buttons = MODES.map(({ mode, label }) => {
    const button = el('button', 'segmented__option', label);
    button.type = 'button';
    button.setAttribute('role', 'radio');
    button.addEventListener('click', () => options.onChange(mode));
    group.append(button);
    return { mode, button };
  });

  group.addEventListener('keydown', (event) => {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (step === 0) return;

    event.preventDefault();
    const current = buttons.findIndex((entry) => entry.button.tabIndex === 0);
    const next = buttons[(current + step + buttons.length) % buttons.length];
    if (next) {
      next.button.focus();
      options.onChange(next.mode);
    }
  });

  const element = el('div', 'clock-mode');
  const label = el('span', 'clock-mode__label', 'Clock');
  element.append(label, group);

  const update = (mode: ClockMode): void => {
    for (const entry of buttons) {
      const checked = entry.mode === mode;
      entry.button.setAttribute('aria-checked', String(checked));
      entry.button.tabIndex = checked ? 0 : -1;
    }
  };

  return { element, update };
}

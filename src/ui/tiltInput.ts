/**
 * Gesture arithmetic shared by every control over the tilt: the range input, and the inline number
 * in the prose (docs/design-direction.md §5.3). No DOM here, so the key map is one testable thing
 * rather than a rule each control restates and then drifts from.
 */
import { EARTH_OBLIQUITY_DEG } from '../lib/solar/index.ts';
import { TILT_MAX_DEG, TILT_MIN_DEG, clampTilt } from '../state/appState.ts';

/** docs/ui-spec.md — the native step is the share link's precision, not a usable keyboard step. */
const KEY_STEP_DEG = 0.5;
const FINE_KEY_STEP_DEG = 0.1;
/** New with the inline control, and worth having over a 45° range (design-direction §5.3). */
const COARSE_KEY_STEP_DEG = 5;
/**
 * An inline number has no track to aim along, so a drag is read as a delta rather than a position.
 * At this rate the whole range is one 450px sweep: far enough to place a value, short enough to
 * finish on a phone.
 */
const DEG_PER_PIXEL = 0.1;

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

export function tiltValueText(tiltDeg: number): string {
  const preset = TILT_PRESETS.find((candidate) => candidate.tiltDeg === clampTilt(tiltDeg));
  const degrees = `${clampTilt(tiltDeg)} degrees`;
  return preset ? `${degrees}, ${preset.meaning}` : degrees;
}

/** The parts of a `KeyboardEvent` the key map reads. */
export interface TiltKeyEvent {
  readonly key: string;
  readonly shiftKey?: boolean;
  readonly altKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
}

/** The tilt this key press asks for, or null when the key is not ours and the browser keeps it. */
export function tiltAfterKey(currentDeg: number, event: TiltKeyEvent): number | null {
  if (event.altKey || event.ctrlKey || event.metaKey) return null;
  const step = event.shiftKey ? FINE_KEY_STEP_DEG : KEY_STEP_DEG;

  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowUp':
      return clampTilt(currentDeg + step);
    case 'ArrowLeft':
    case 'ArrowDown':
      return clampTilt(currentDeg - step);
    case 'PageUp':
      return clampTilt(currentDeg + COARSE_KEY_STEP_DEG);
    case 'PageDown':
      return clampTilt(currentDeg - COARSE_KEY_STEP_DEG);
    case 'Home':
      return TILT_MIN_DEG;
    case 'End':
      return TILT_MAX_DEG;
    default:
      return null;
  }
}

export function tiltAfterDrag(startDeg: number, deltaXPx: number): number {
  return clampTilt(startDeg + deltaXPx * DEG_PER_PIXEL);
}

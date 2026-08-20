/**
 * Gesture arithmetic shared by every control over the tilt: the diagram grip, the inline number in
 * the prose, and (until §5.6) the range input (docs/design-direction.md §5.3). No DOM here, so the
 * key map is one testable thing rather than a rule each control restates and then drifts from.
 */
import { DIAGRAM } from '../chart/diagramGeometry.ts';
import type { Point } from '../chart/diagramGeometry.ts';
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

/**
 * The grip stands for the axis itself, so it reads as an absolute angle rather than a delta
 * (design-direction §5.6) — wherever the pointer lands, in the diagram's own SVG coordinates, is
 * where the axis points. `onEarth` in `diagramGeometry.ts` places the north pole at
 * `90 + tiltDeg` degrees, measured counterclockwise from due east with screen y flipped; this is
 * its inverse.
 */
export function tiltFromGripPoint(point: Point): number {
  const dx = point.x - DIAGRAM.earth.cx;
  // `DIAGRAM.earth.cy - point.y` rather than `-(point.y - DIAGRAM.earth.cy)`: on the horizontal
  // through the centre the two are mathematically equal but not the same float — negating a zero
  // difference yields -0, and `atan2(-0, negative dx)` returns -180° instead of +180°, wrapping a
  // grip dragged due left to 0° instead of clamping it at 45°.
  const dy = DIAGRAM.earth.cy - point.y;
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  return clampTilt(angleDeg - 90);
}

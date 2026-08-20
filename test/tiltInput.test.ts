import { describe, expect, it } from 'vitest';
import { DIAGRAM, axisSegment } from '../src/chart/diagramGeometry.ts';
import { TILT_MAX_DEG, TILT_MIN_DEG } from '../src/state/appState.ts';
import {
  tiltAfterDrag,
  tiltAfterKey,
  tiltFromGripPoint,
  tiltValueText,
} from '../src/ui/tiltInput.ts';

describe('tilt key map', () => {
  it('steps 0.5° on the arrows and 0.1° with shift', () => {
    expect(tiltAfterKey(23.44, { key: 'ArrowRight' })).toBe(23.94);
    expect(tiltAfterKey(23.44, { key: 'ArrowUp' })).toBe(23.94);
    expect(tiltAfterKey(23.44, { key: 'ArrowLeft' })).toBe(22.94);
    expect(tiltAfterKey(23.44, { key: 'ArrowDown' })).toBe(22.94);
    expect(tiltAfterKey(23.44, { key: 'ArrowRight', shiftKey: true })).toBe(23.54);
    expect(tiltAfterKey(23.44, { key: 'ArrowLeft', shiftKey: true })).toBe(23.34);
  });

  it('takes the page keys 5° at a time and the ends to the range', () => {
    expect(tiltAfterKey(23.44, { key: 'PageUp' })).toBe(28.44);
    expect(tiltAfterKey(23.44, { key: 'PageDown' })).toBe(18.44);
    expect(tiltAfterKey(23.44, { key: 'Home' })).toBe(TILT_MIN_DEG);
    expect(tiltAfterKey(23.44, { key: 'End' })).toBe(TILT_MAX_DEG);
  });

  it('stops at the ends of the range instead of running past them', () => {
    expect(tiltAfterKey(0.2, { key: 'ArrowLeft' })).toBe(TILT_MIN_DEG);
    expect(tiltAfterKey(44.8, { key: 'PageUp' })).toBe(TILT_MAX_DEG);
  });

  it('leaves the browser its own shortcuts and every key that is not ours', () => {
    expect(tiltAfterKey(23.44, { key: 'ArrowRight', metaKey: true })).toBeNull();
    expect(tiltAfterKey(23.44, { key: 'ArrowRight', ctrlKey: true })).toBeNull();
    expect(tiltAfterKey(23.44, { key: 'ArrowLeft', altKey: true })).toBeNull();
    expect(tiltAfterKey(23.44, { key: 'Tab' })).toBeNull();
    expect(tiltAfterKey(23.44, { key: 'Enter' })).toBeNull();
    expect(tiltAfterKey(23.44, { key: ' ' })).toBeNull();
  });
});

describe('tilt drag', () => {
  it('reads a sideways drag as a delta from where it started', () => {
    expect(tiltAfterDrag(23.44, 0)).toBe(23.44);
    expect(tiltAfterDrag(23.44, 100)).toBe(33.44);
    expect(tiltAfterDrag(23.44, -100)).toBe(13.44);
  });

  it('crosses the whole range in one sweep, and clamps rather than wrapping', () => {
    expect(tiltAfterDrag(0, 450)).toBe(TILT_MAX_DEG);
    expect(tiltAfterDrag(23.44, 9000)).toBe(TILT_MAX_DEG);
    expect(tiltAfterDrag(23.44, -9000)).toBe(TILT_MIN_DEG);
  });

  it('keeps the share link precision, so a drag cannot leak a float into the hash', () => {
    expect(tiltAfterDrag(23.44, 1)).toBe(23.54);
    expect(tiltAfterDrag(23.44, 7)).toBe(24.14);
  });
});

describe('tilt from grip point', () => {
  const { cx, cy } = DIAGRAM.earth;

  it('inverts axisSegment: the point the axis actually draws maps back to the tilt that drew it', () => {
    for (const tiltDeg of [0, 5.5, 23.44, 40, TILT_MAX_DEG]) {
      expect(tiltFromGripPoint(axisSegment(tiltDeg).from)).toBe(tiltDeg);
    }
  });

  it('reads straight up as 0°, and left of vertical as a positive tilt', () => {
    expect(tiltFromGripPoint({ x: cx, y: cy - 50 })).toBe(TILT_MIN_DEG);
    const offset = 50 / Math.SQRT2;
    expect(tiltFromGripPoint({ x: cx - offset, y: cy - offset })).toBe(TILT_MAX_DEG);
  });

  it('clamps rather than wrapping once the pointer passes either end of the range', () => {
    expect(tiltFromGripPoint({ x: cx - 50, y: cy })).toBe(TILT_MAX_DEG);
    expect(tiltFromGripPoint({ x: cx + 50, y: cy })).toBe(TILT_MIN_DEG);
    expect(tiltFromGripPoint({ x: cx, y: cy + 50 })).toBe(TILT_MIN_DEG);
  });
});

describe('tilt value text', () => {
  it('names the preset a value lands on, and reads the bare degrees otherwise', () => {
    expect(tiltValueText(23.44)).toBe("23.44 degrees, Earth's actual tilt");
    expect(tiltValueText(0)).toBe('0 degrees, no seasons anywhere');
    expect(tiltValueText(40)).toBe('40 degrees, Tampere inside the polar circle');
    expect(tiltValueText(31.5)).toBe('31.5 degrees');
  });
});

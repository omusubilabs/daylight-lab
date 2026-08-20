import { describe, expect, it } from 'vitest';
import {
  DIAGRAM,
  axisSegment,
  chordSunState,
  latitudeChord,
  tiltArcPath,
  verticalSegment,
} from '../src/chart/diagramGeometry.ts';
import type { Point } from '../src/chart/diagramGeometry.ts';
import { cityById } from '../src/data/cities.ts';

function distanceFromCentre(point: Point): number {
  return Math.hypot(point.x - DIAGRAM.earth.cx, point.y - DIAGRAM.earth.cy);
}

const TILTS = [0, 10, 23.44, 40, 45];

describe('tilt diagram geometry', () => {
  it('leans the north pole toward the Sun, and by the tilt', () => {
    for (const tilt of TILTS) {
      const axis = axisSegment(tilt);
      const vertical = verticalSegment();
      const angle =
        (Math.atan2(axis.from.x - DIAGRAM.earth.cx, DIAGRAM.earth.cy - axis.from.y) * 180) /
        Math.PI;

      // Screen x grows rightward and the Sun is on the left, so leaning at it is a negative angle.
      expect(angle, `${tilt}°`).toBeCloseTo(-tilt, 6);
      expect(axis.from.y).toBeLessThan(DIAGRAM.earth.cy);
      expect(axis.to.y).toBeGreaterThan(DIAGRAM.earth.cy);
      expect(vertical.from.x).toBeCloseTo(DIAGRAM.earth.cx, 6);
    }
  });

  it('draws the axis past both poles by the same overhang', () => {
    for (const tilt of TILTS) {
      const axis = axisSegment(tilt);
      const reach = DIAGRAM.earth.r + DIAGRAM.axisOverhang;
      expect(distanceFromCentre(axis.from), `${tilt}°`).toBeCloseTo(reach, 6);
      expect(distanceFromCentre(axis.to), `${tilt}°`).toBeCloseTo(reach, 6);
    }
  });

  it('lands both ends of every latitude chord on the globe, not beside it', () => {
    for (const tilt of TILTS) {
      for (const city of [cityById('tromso'), cityById('singapore'), cityById('ushuaia')]) {
        if (!city) throw new Error('missing city');
        const chord = latitudeChord(city.latitudeDeg, tilt);
        expect(distanceFromCentre(chord.from), `${city.id} ${tilt}°`).toBeCloseTo(
          DIAGRAM.earth.r,
          6,
        );
        expect(distanceFromCentre(chord.to), `${city.id} ${tilt}°`).toBeCloseTo(DIAGRAM.earth.r, 6);
      }
    }
  });

  it('levels every chord at 0° tilt, where the terminator halves all of them', () => {
    for (const latitude of [69.6, 37.9, 0, -54.8]) {
      const chord = latitudeChord(latitude, 0);
      expect(chord.from.y, `${latitude}`).toBeCloseTo(chord.to.y, 6);
      expect(chord.from.x - DIAGRAM.earth.cx).toBeCloseTo(DIAGRAM.earth.cx - chord.to.x, 6);
      expect(chordSunState(latitude, 0)).toBe('mixed');
    }
  });

  it('agrees with the chart about who is inside the polar circle', () => {
    // 90 - 40 = 50°, so Tampere at 61.5°N is inside it and Niigata at 37.9°N is nowhere near.
    expect(chordSunState(61.4978, 40)).toBe('midnightSun');
    expect(chordSunState(37.9026, 40)).toBe('mixed');
    expect(chordSunState(61.4978, 23.44)).toBe('mixed');
    expect(chordSunState(69.6492, 23.44)).toBe('midnightSun');
    // The June solstice is the southern hemisphere's polar night.
    expect(chordSunState(-69.6492, 23.44)).toBe('polarNight');
  });

  it('sweeps the tilt arc from upright toward the axis', () => {
    expect(tiltArcPath(0)).toBe('M150.00,58.00A22,22 0 0 0 150.00,58.00');
    expect(tiltArcPath(23.44)).toMatch(/^M150\.00,58\.00A22,22 0 0 0 141\.2\d,59\.8\d$/);
  });
});

/**
 * Pure geometry for the tilt diagram (docs/ui-spec.md): the ecliptic seen edge-on, with the Sun on
 * the left and Earth at the June solstice, north pole leaning toward it. Screen y points down.
 *
 * A city rides a circle of latitude once a day; seen edge-on that circle is a chord, and how much
 * of the chord falls on the lit side of the terminator is what the tilt slider is changing.
 */

const RAD = Math.PI / 180;

export const DIAGRAM = {
  width: 240,
  height: 160,
  sun: { cx: 34, cy: 80, r: 13 },
  earth: { cx: 150, cy: 80, r: 34 },
  /** How far the drawn axis sticks out past each pole. */
  axisOverhang: 12,
  tiltArcRadius: 22,
} as const;

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Segment {
  readonly from: Point;
  readonly to: Point;
}

function onEarth(angleDeg: number, radius: number): Point {
  return {
    x: DIAGRAM.earth.cx + radius * Math.cos(angleDeg * RAD),
    y: DIAGRAM.earth.cy - radius * Math.sin(angleDeg * RAD),
  };
}

/** North pole first. The pole leans toward the Sun, so a positive tilt leans it left. */
export function axisSegment(tiltDeg: number): Segment {
  const radius = DIAGRAM.earth.r + DIAGRAM.axisOverhang;
  return { from: onEarth(90 + tiltDeg, radius), to: onEarth(270 + tiltDeg, radius) };
}

export function verticalSegment(): Segment {
  const radius = DIAGRAM.earth.r + DIAGRAM.axisOverhang;
  return { from: onEarth(90, radius), to: onEarth(270, radius) };
}

/**
 * One city's circle of latitude, seen edge-on. Both ends sit on the globe's limb, and the share of
 * the chord left of Earth's centre is the share of the circle that is in sunlight.
 */
export function latitudeChord(latitudeDeg: number, tiltDeg: number): Segment {
  return {
    from: onEarth(latitudeDeg + tiltDeg, DIAGRAM.earth.r),
    to: onEarth(180 - (latitudeDeg - tiltDeg), DIAGRAM.earth.r),
  };
}

/** The terminator is vertical here, so anything left of Earth's centre is in sunlight. */
function isSunlit(point: Point): boolean {
  return point.x <= DIAGRAM.earth.cx;
}

export type SunState = 'midnightSun' | 'polarNight' | 'mixed';

/**
 * Whether the whole circle of latitude clears the terminator, which is polar day or polar night at
 * this solstice. Pure geometry: no refraction allowance, unlike the chart's 90.833° zenith.
 */
export function chordSunState(latitudeDeg: number, tiltDeg: number): SunState {
  const chord = latitudeChord(latitudeDeg, tiltDeg);
  if (isSunlit(chord.from) && isSunlit(chord.to)) return 'midnightSun';
  if (!isSunlit(chord.from) && !isSunlit(chord.to)) return 'polarNight';
  return 'mixed';
}

/** The half of the globe facing away from the Sun, as a closed path. */
export function nightHalfPath(): string {
  const { cx, cy, r } = DIAGRAM.earth;
  return `M${cx},${cy - r}A${r},${r} 0 0 1 ${cx},${cy + r}Z`;
}

/** The angle between the axis and the orbital normal, drawn as an arc between the two. */
export function tiltArcPath(tiltDeg: number): string {
  const r = DIAGRAM.tiltArcRadius;
  const from = onEarth(90, r);
  const to = onEarth(90 + tiltDeg, r);
  return `M${from.x.toFixed(2)},${from.y.toFixed(2)}A${r},${r} 0 0 0 ${to.x.toFixed(2)},${to.y.toFixed(2)}`;
}

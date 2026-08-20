import {
  DIAGRAM,
  axisSegment,
  chordSunState,
  latitudeChord,
  nightHalfPath,
  tiltArcPath,
  verticalSegment,
} from '../chart/diagramGeometry.ts';
import type { Point, Segment } from '../chart/diagramGeometry.ts';
import type { City } from '../data/cities.ts';
import { formatLatitude, formatTilt } from '../lib/format.ts';
import { TILT_MAX_DEG, TILT_MIN_DEG, clampTilt } from '../state/appState.ts';
import { el, svgEl } from './dom.ts';
import { tiltAfterKey, tiltFromGripPoint, tiltValueText } from './tiltInput.ts';

export interface TiltDiagramOptions {
  /** Fired while the grip is dragged or stepped by keyboard, so the chart can drop resolution
   * until it settles (docs/design-direction.md §5.6). */
  onInput(tiltDeg: number): void;
}

export interface TiltDiagram {
  readonly element: HTMLElement;
  update(tiltDeg: number, cityA: City, cityB: City): void;
}

function line(className: string, segment: Segment): SVGLineElement {
  return svgEl('line', {
    class: className,
    x1: segment.from.x.toFixed(2),
    y1: segment.from.y.toFixed(2),
    x2: segment.to.x.toFixed(2),
    y2: segment.to.y.toFixed(2),
  });
}

function setSegment(element: SVGLineElement, segment: Segment): void {
  element.setAttribute('x1', segment.from.x.toFixed(2));
  element.setAttribute('y1', segment.from.y.toFixed(2));
  element.setAttribute('x2', segment.to.x.toFixed(2));
  element.setAttribute('y2', segment.to.y.toFixed(2));
}

interface CityMark {
  /** Drawn under the chord, so a latitude line reads on the lit half and the dark half alike. */
  readonly halo: SVGLineElement;
  readonly chord: SVGLineElement;
  readonly label: SVGTextElement;
}

function sunGroup(): SVGGElement {
  const group = svgEl('g', { class: 'diagram__sun' });
  const { cx, cy, r } = DIAGRAM.sun;
  group.append(svgEl('circle', { class: 'diagram__sun-disc', cx, cy, r }));

  for (const angle of [-50, 0, 50]) {
    const radians = (angle * Math.PI) / 180;
    group.append(
      svgEl('line', {
        class: 'diagram__ray',
        x1: (cx + (r + 4) * Math.cos(radians)).toFixed(2),
        y1: (cy - (r + 4) * Math.sin(radians)).toFixed(2),
        x2: (cx + (r + 10) * Math.cos(radians)).toFixed(2),
        y2: (cy - (r + 10) * Math.sin(radians)).toFixed(2),
      }),
    );
  }

  return group;
}

function cityMark(role: 'a' | 'b'): CityMark {
  const halo = svgEl('line', { class: 'diagram__chord-halo' });
  const chord = svgEl('line', { class: `diagram__chord diagram__chord--${role}` });
  const label = svgEl('text', { class: `diagram__label diagram__label--${role}` });
  return { halo, chord, label };
}

/**
 * `end` picks which limb the tick label hangs off, so city A's and city B's labels sit on opposite
 * sides of the globe and cannot collide however the slider is dragged.
 */
function placeMark(
  mark: CityMark,
  city: City,
  tiltDeg: number,
  end: 'from' | 'to',
  anchor: 'start' | 'end',
): void {
  const chord = latitudeChord(city.latitudeDeg, tiltDeg);
  setSegment(mark.halo, chord);
  setSegment(mark.chord, chord);
  mark.chord.setAttribute('data-sun', chordSunState(city.latitudeDeg, tiltDeg));

  const tip = chord[end];
  const offset = anchor === 'start' ? 6 : -6;
  mark.label.setAttribute('x', (tip.x + offset).toFixed(2));
  mark.label.setAttribute('y', (tip.y + 3).toFixed(2));
  mark.label.setAttribute('text-anchor', anchor);
  mark.label.textContent = formatLatitude(city.latitudeDeg);
}

/** Pointer coordinates arrive in client space; the grip's geometry is in the SVG's own viewBox. */
function svgPoint(svg: SVGSVGElement, clientX: number, clientY: number): Point {
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: DIAGRAM.earth.cx, y: DIAGRAM.earth.cy };
  return new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
}

export function createTiltDiagram(options: TiltDiagramOptions): TiltDiagram {
  const svg = svgEl('svg', {
    class: 'diagram__svg',
    viewBox: `0 0 ${DIAGRAM.width} ${DIAGRAM.height}`,
  });

  // ARIA guidance is not to give an element with `role="img"` a focusable descendant, and AT
  // support for one is inconsistent — so the picture and the grip are siblings, not parent and
  // child, even though the grip sits visually on top of the picture (design-direction §5.6).
  const picture = svgEl('g', { class: 'diagram__picture', role: 'img' });

  picture.append(
    svgEl('line', {
      class: 'diagram__plane',
      x1: 4,
      y1: DIAGRAM.earth.cy,
      x2: DIAGRAM.width - 4,
      y2: DIAGRAM.earth.cy,
    }),
    sunGroup(),
    svgEl('circle', {
      class: 'diagram__earth',
      cx: DIAGRAM.earth.cx,
      cy: DIAGRAM.earth.cy,
      r: DIAGRAM.earth.r,
    }),
    svgEl('path', { class: 'diagram__night', d: nightHalfPath() }),
    line('diagram__vertical', verticalSegment()),
  );

  const arc = svgEl('path', { class: 'diagram__arc' });
  const axis = line('diagram__axis', axisSegment(0));
  const markA = cityMark('a');
  const markB = cityMark('b');
  picture.append(
    arc,
    axis,
    markA.halo,
    markB.halo,
    markA.chord,
    markB.chord,
    markA.label,
    markB.label,
  );

  // The primary control (design-direction §5.6), so it goes on top of everything else it might
  // otherwise sit under.
  const grip = svgEl('circle', { class: 'diagram__grip', r: 9 });
  grip.tabIndex = 0;
  grip.setAttribute('role', 'slider');
  grip.setAttribute('aria-label', 'Earth’s axial tilt');
  grip.setAttribute('aria-valuemin', String(TILT_MIN_DEG));
  grip.setAttribute('aria-valuemax', String(TILT_MAX_DEG));

  svg.append(picture, grip);

  const caption = el(
    'p',
    'diagram__caption',
    'June solstice, edge-on. Drag the axis to set the tilt. Ticks mark the two cities’ latitudes.',
  );

  const element = el('figure', 'diagram');
  element.append(svg, caption);

  // Two presses or drag frames inside one tick would both read the same stale `current`, because
  // the grip is only written back on redraw; stepping from the value last emitted keeps every one.
  let current = clampTilt(TILT_MIN_DEG);

  const emit = (tiltDeg: number): void => {
    current = clampTilt(tiltDeg);
    options.onInput(current);
  };

  const tiltFromEvent = (event: PointerEvent): number =>
    tiltFromGripPoint(svgPoint(svg, event.clientX, event.clientY));

  let dragging = false;

  grip.addEventListener('pointerdown', (event) => {
    // A right-click opens a menu and never delivers the matching `pointerup`, which would leave
    // the drag armed and the next hover changing the tilt unpressed.
    if (event.button !== 0) return;
    grip.setPointerCapture(event.pointerId);
    dragging = true;
    emit(tiltFromEvent(event));
  });

  grip.addEventListener('pointermove', (event) => {
    if (dragging) emit(tiltFromEvent(event));
  });

  const endDrag = (): void => {
    dragging = false;
  };
  grip.addEventListener('pointerup', endDrag);
  grip.addEventListener('pointercancel', endDrag);

  grip.addEventListener('keydown', (event) => {
    const next = tiltAfterKey(current, event);
    if (next === null) return;
    event.preventDefault();
    emit(next);
  });

  const update = (tiltDeg: number, cityA: City, cityB: City): void => {
    const tilt = clampTilt(tiltDeg);
    current = tilt;

    const axisSeg = axisSegment(tilt);
    setSegment(axis, axisSeg);
    arc.setAttribute('d', tiltArcPath(tilt));
    placeMark(markA, cityA, tilt, 'from', 'start');
    placeMark(markB, cityB, tilt, 'to', 'end');

    grip.setAttribute('cx', axisSeg.from.x.toFixed(2));
    grip.setAttribute('cy', axisSeg.from.y.toFixed(2));
    grip.setAttribute('aria-valuenow', String(tilt));
    grip.setAttribute('aria-valuetext', tiltValueText(tilt));

    picture.setAttribute(
      'aria-label',
      `Earth at the June solstice with its axis ${formatTilt(tilt)} from upright, the Sun to ` +
        `the left. ${cityA.name} sits at ${formatLatitude(cityA.latitudeDeg)} and ${cityB.name} ` +
        `at ${formatLatitude(cityB.latitudeDeg)}.`,
    );
  };

  return { element, update };
}

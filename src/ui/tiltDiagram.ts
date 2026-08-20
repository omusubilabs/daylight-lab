import {
  DIAGRAM,
  axisSegment,
  chordSunState,
  latitudeChord,
  nightHalfPath,
  tiltArcPath,
  verticalSegment,
} from '../chart/diagramGeometry.ts';
import type { Segment } from '../chart/diagramGeometry.ts';
import type { City } from '../data/cities.ts';
import { formatLatitude, formatTilt } from '../lib/format.ts';
import { el, svgEl } from './dom.ts';

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

export function createTiltDiagram(): TiltDiagram {
  const svg = svgEl('svg', {
    class: 'diagram__svg',
    viewBox: `0 0 ${DIAGRAM.width} ${DIAGRAM.height}`,
    role: 'img',
  });

  svg.append(
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
  svg.append(arc, axis, markA.halo, markB.halo, markA.chord, markB.chord, markA.label, markB.label);

  const caption = el(
    'p',
    'diagram__caption',
    'June solstice, edge-on. Ticks mark the two cities’ latitudes.',
  );

  const element = el('figure', 'diagram');
  element.append(svg, caption);

  const update = (tiltDeg: number, cityA: City, cityB: City): void => {
    setSegment(axis, axisSegment(tiltDeg));
    arc.setAttribute('d', tiltArcPath(tiltDeg));
    placeMark(markA, cityA, tiltDeg, 'from', 'start');
    placeMark(markB, cityB, tiltDeg, 'to', 'end');

    svg.setAttribute(
      'aria-label',
      `Earth at the June solstice with its axis ${formatTilt(tiltDeg)} from upright, the Sun to ` +
        `the left. ${cityA.name} sits at ${formatLatitude(cityA.latitudeDeg)} and ${cityB.name} ` +
        `at ${formatLatitude(cityB.latitudeDeg)}.`,
    );
  };

  return { element, update };
}

// Debugging tool for .claude/skills/solar-verify, not shipped code. Prints one UTC row per day so
// a refactor can be diffed byte for byte, and a tilt sweep can be hashed for parameter wiring.
import { parseArgs } from 'node:util';
import {
  EARTH_OBLIQUITY_DEG,
  MS_PER_DAY,
  dayEvents,
  maxAltitudeDeg,
  utcMidnightMs,
} from '../src/lib/solar/index.ts';
import type { SolarEvent } from '../src/lib/solar/index.ts';
import { CITIES, cityById } from '../src/data/cities.ts';

const { values } = parseArgs({
  options: {
    city: { type: 'string', default: 'tampere' },
    tilt: { type: 'string', default: String(EARTH_OBLIQUITY_DEG) },
    year: { type: 'string', default: '2026' },
  },
});

const city = cityById(values.city.toLowerCase());
if (!city) {
  console.error(`unknown city: ${values.city}. known: ${CITIES.map((c) => c.id).join(', ')}`);
  process.exit(1);
}

const obliquityDeg = Number(values.tilt);
const year = Number(values.year);
if (!Number.isFinite(obliquityDeg) || !Number.isInteger(year)) {
  console.error('--tilt must be a number and --year an integer');
  process.exit(1);
}

const clock = (event: SolarEvent): string => {
  if (event.kind !== 'event') return event.kind;
  const d = new Date(event.utcMs);
  return d.toISOString().slice(11, 19);
};

const startMs = utcMidnightMs(year, 1, 1);
const days = (utcMidnightMs(year + 1, 1, 1) - startMs) / MS_PER_DAY;

console.log('date,sunrise,sunset,solar_noon,day_length_min,declination,eot_min,max_altitude');
for (let i = 0; i < days; i++) {
  const utcMidnight = startMs + i * MS_PER_DAY;
  const day = dayEvents({
    utcMidnightMs: utcMidnight,
    latitudeDeg: city.latitudeDeg,
    longitudeDeg: city.longitudeDeg,
    obliquityDeg,
  });

  console.log(
    [
      new Date(utcMidnight).toISOString().slice(0, 10),
      clock(day.rise),
      clock(day.set),
      new Date(day.solarNoonUtcMs).toISOString().slice(11, 19),
      day.minutesAboveZenith.toFixed(3),
      day.declinationDeg.toFixed(5),
      day.equationOfTimeMin.toFixed(5),
      maxAltitudeDeg(city.latitudeDeg, day.declinationDeg).toFixed(5),
    ].join(','),
  );
}

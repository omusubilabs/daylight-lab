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

const CITIES: Record<string, { latitudeDeg: number; longitudeDeg: number }> = {
  tampere: { latitudeDeg: 61.4978, longitudeDeg: 23.761 },
  niigata: { latitudeDeg: 37.9026, longitudeDeg: 139.0236 },
  tokyo: { latitudeDeg: 35.6762, longitudeDeg: 139.6503 },
  reykjavik: { latitudeDeg: 64.1466, longitudeDeg: -21.9426 },
  tromso: { latitudeDeg: 69.6492, longitudeDeg: 18.9553 },
  helsinki: { latitudeDeg: 60.1699, longitudeDeg: 24.9384 },
  singapore: { latitudeDeg: 1.3521, longitudeDeg: 103.8198 },
  nairobi: { latitudeDeg: -1.2921, longitudeDeg: 36.8219 },
  sydney: { latitudeDeg: -33.8688, longitudeDeg: 151.2093 },
  ushuaia: { latitudeDeg: -54.8019, longitudeDeg: -68.303 },
  naha: { latitudeDeg: 26.2124, longitudeDeg: 127.6809 },
  anchorage: { latitudeDeg: 61.2181, longitudeDeg: -149.9003 },
};

const { values } = parseArgs({
  options: {
    city: { type: 'string', default: 'tampere' },
    tilt: { type: 'string', default: String(EARTH_OBLIQUITY_DEG) },
    year: { type: 'string', default: '2026' },
  },
});

const city = CITIES[values.city.toLowerCase()];
if (!city) {
  console.error(`unknown city: ${values.city}. known: ${Object.keys(CITIES).join(', ')}`);
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
  const day = dayEvents({ utcMidnightMs: utcMidnight, ...city, obliquityDeg });

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

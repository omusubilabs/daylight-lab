// Prepares the manual NOAA transcription described in docs/solar-math.md §8a. Emits the skeleton
// a human fills in, or the entry sheet they work from. It never emits a computed time: a fixture
// generated from this codebase would verify nothing.
import { parseArgs } from 'node:util';
import { CITIES, cityById } from '../src/data/cities.ts';
import type { City } from '../src/data/cities.ts';

/** §8a minimum: the two default cities at all four turning points, plus an equatorial and a
 *  southern city. The latter two carry the solstices, where a hemisphere error would show. */
const PLAN: ReadonlyArray<{ cityId: string; dates: readonly string[] }> = [
  { cityId: 'tampere', dates: ['2026-03-20', '2026-06-21', '2026-09-23', '2026-12-21'] },
  { cityId: 'niigata', dates: ['2026-03-20', '2026-06-21', '2026-09-23', '2026-12-21'] },
  { cityId: 'singapore', dates: ['2026-06-21', '2026-12-21'] },
  { cityId: 'sydney', dates: ['2026-06-21', '2026-12-21'] },
];

const { values } = parseArgs({
  options: { format: { type: 'string', default: 'json' } },
});

const toleranceSeconds = (city: City): number => (Math.abs(city.latitudeDeg) >= 60 ? 120 : 60);

const rows = PLAN.flatMap(({ cityId, dates }) => {
  const city = cityById(cityId);
  if (!city) {
    console.error(`unknown city id: ${cityId}. known: ${CITIES.map((c) => c.id).join(', ')}`);
    process.exit(1);
  }
  return dates.map((date) => ({ city, date }));
});

if (values.format === 'table') {
  console.log('NOAA Solar Calculator — https://gml.noaa.gov/grad/solcalc/');
  console.log('Enter the coordinates below, set the time zone to UTC+0, leave daylight saving');
  console.log('off, and read sunrise / solar noon / sunset straight off the panel.');
  console.log();
  console.log('| City | Date | Latitude | Longitude | Tolerance | Sunrise | Solar noon | Sunset |');
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const { city, date } of rows) {
    console.log(
      `| ${city.name} | ${date} | ${city.latitudeDeg} | ${city.longitudeDeg} | ±${toleranceSeconds(city)}s | | | |`,
    );
  }
} else if (values.format === 'json') {
  console.log(
    JSON.stringify(
      {
        source: 'NOAA Solar Calculator — https://gml.noaa.gov/grad/solcalc/',
        retrieved: 'FILL-IN-DATE',
        note: 'All times UTC, as read from NOAA. Use "alwaysAbove" or "alwaysBelow" where the Sun does not cross the horizon. Read-only for Claude Code (CLAUDE.md rule 6).',
        cases: rows.map(({ city, date }) => ({
          city: city.name,
          date,
          latitudeDeg: city.latitudeDeg,
          longitudeDeg: city.longitudeDeg,
          toleranceSeconds: toleranceSeconds(city),
          sunriseUtc: null,
          solarNoonUtc: null,
          sunsetUtc: null,
        })),
      },
      null,
      2,
    ),
  );
} else {
  console.error(`--format must be "json" or "table"`);
  process.exit(1);
}

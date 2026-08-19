# Solar math — authoritative spec

**Implement exactly what is written here.** Do not substitute a "simpler" formula, do not import
a library, and do not reorder the algebra to make it read better. The NOAA formulation below is
what the golden fixtures were generated against; any deviation shows up as a few minutes of
error at high latitude, which is exactly where this product lives.

All trigonometric functions take radians. All angles below are in **degrees** unless stated;
convert at the boundary. `sin°(x)` means `Math.sin(x * Math.PI / 180)`.

## 0. Module layout

```
src/lib/solar/
  constants.ts   EARTH_OBLIQUITY_DEG, zenith thresholds
  julian.ts      epoch ms <-> Julian day <-> Julian century
  position.ts    declination, equation of time (both take obliquityDeg)
  events.ts      sunrise/sunset/twilight/solar noon as UTC epoch ms
  altitude.ts    solar altitude at an instant
  index.ts       public surface
```

Every exported function is pure. No `Date` construction that reads the host clock, no `Intl`,
no DOM.

## 1. Julian day and century

```
julianDay(epochMs)      = epochMs / 86400000 + 2440587.5
julianCentury(jd)       = (jd - 2451545.0) / 36525
```

For daily calculations, evaluate the Julian century at **local solar noon of that date**, not at
00:00 UTC. Practical approach: start from 12:00 UTC of the date, subtract `longitudeDeg / 360`
of a day, and use that instant for the century. The error from skipping this is small but
systematic, and the fixtures assume it is done.

## 2. Sun position (all take `obliquityDeg`)

With `T` = Julian century:

```
L0 = (280.46646 + T*(36000.76983 + T*0.0003032)) mod 360        // geometric mean longitude
M  = 357.52911 + T*(35999.05029 - 0.0001537*T)                  // geometric mean anomaly
e  = 0.016708634 - T*(0.000042037 + 0.0000001267*T)             // orbital eccentricity

C  = sin°(M)   * (1.914602 - T*(0.004817 + 0.000014*T))
   + sin°(2*M) * (0.019993 - 0.000101*T)
   + sin°(3*M) *  0.000289                                      // equation of center

trueLong = L0 + C
appLong  = trueLong - 0.00569 - 0.00478 * sin°(125.04 - 1934.136*T)
```

**Obliquity.** The real Earth's mean obliquity would be computed from `T`. Here it is a user
parameter instead:

```
epsilon = obliquityDeg + 0.00256 * cos°(125.04 - 1934.136*T)
```

That is, the caller-supplied tilt replaces the mean-obliquity polynomial; the small nutation
term is retained. This is a deliberate simplification — see §7.

```
declination = asin°( sin°(epsilon) * sin°(appLong) )

y   = tan°(epsilon / 2)^2
eot = 4 * deg( y*sin(2*L0r) - 2*e*sin(Mr) + 4*e*y*sin(Mr)*cos(2*L0r)
               - 0.5*y*y*sin(4*L0r) - 1.25*e*e*sin(2*Mr) )      // minutes
```

where `L0r`, `Mr` are `L0`, `M` in radians. Note that `y` depends on obliquity, so the equation
of time **must** be recomputed when the tilt slider moves. Wiring the slider to declination only
is the single most likely bug in this codebase.

## 3. Event times

Zenith angles, measured from the vertical, including refraction:

| Event | Zenith |
| --- | --- |
| Sunrise / sunset | 90.833° |
| Civil twilight | 96° |
| Nautical twilight | 102° |
| Astronomical twilight | 108° |

```
cosH = ( cos°(zenith) - sin°(lat)*sin°(dec) ) / ( cos°(lat)*cos°(dec) )
```

- `cosH >  1` → the Sun never reaches that altitude that day → **event never occurs**
  (polar night for the 90.833° case).
- `cosH < -1` → the Sun stays above that altitude all day → **event never occurs**
  (midnight sun for the 90.833° case).
- otherwise `H = acos°(cosH)`, in degrees.

Return a discriminated union, never `null` and never `NaN`:

```ts
type SolarEvent =
  | { kind: 'event'; utcMs: number }
  | { kind: 'alwaysAbove' }   // sun never crosses below the threshold
  | { kind: 'alwaysBelow' };  // sun never rises to the threshold
```

Times, in minutes from UTC midnight of the date:

```
solarNoonUtcMin = 720 - 4*longitudeDeg - eot
sunriseUtcMin   = solarNoonUtcMin - 4*H
sunsetUtcMin    = solarNoonUtcMin + 4*H
```

Longitude is positive east. Convert to epoch ms by adding to UTC midnight of that date. **Do not
apply a timezone offset here** — that happens in the presentation layer (§5).

## 4. Solar altitude

```
hourAngle = (trueSolarTimeMin / 4) - 180
altitude  = asin°( sin°(lat)*sin°(dec) + cos°(lat)*cos°(dec)*cos°(hourAngle) )
```

where `trueSolarTimeMin = (minutesFromUtcMidnight + eot + 4*longitudeDeg) mod 1440`.

Two derived readouts the UI needs, both cheap closed forms — use these rather than sampling:

```
maxAltitude = 90 - |lat - dec|          // at solar noon
minAltitude = |lat + dec| - 90          // at solar midnight; negative = below horizon
```

`minAltitude` is what powers the "white nights" copy: at Tampere on the June solstice it is about
**-5.1°**, i.e. the Sun never drops even to the 6° civil-twilight line, so it never gets properly
dark.

## 5. Time zones — the highest-risk area

Rules, in order of importance:

1. The solar layer produces **UTC epoch ms only**. It knows nothing about zones.
2. Conversion to wall clock uses `Intl.DateTimeFormat` with the city's IANA zone
   (`Europe/Helsinki`, `Asia/Tokyo`). The browser already ships the tz database; we must not.
3. Never store or compute with a numeric UTC offset. `Europe/Helsinki` is +2 or +3 depending on
   the date, and hard-coding either produces an hour of error for half the year.
4. To get "minutes since local midnight" for chart plotting, format the instant in the target
   zone with `hour`/`minute` parts and read them back. Do not subtract offsets by hand.
5. **Solar-time mode** removes DST by construction: plot `minutesFromUtc + 4*longitudeDeg + eot`
   instead of the wall clock. In this mode solar noon is a flat line at 12:00 by definition,
   which is the point of the mode.

Expected visible consequences, which are features and must not be "fixed":

- Tampere's chart has a one-hour vertical jump on the last Sunday of March and October.
- Niigata's chart has no jump at all — Japan has no DST.
- Niigata's solar noon sits near **11:44** mean, because JST is anchored to 135°E while Niigata
  is at 139.04°E. Roughly 16 minutes of longitude offset, then ±16 minutes of equation of time
  on top.

## 6. Performance

A full year for one city is 365 days × 5 thresholds ≈ 1,825 event solves, each a handful of
trig calls. That is single-digit milliseconds. Recompute the whole year on slider input,
coalesced with `requestAnimationFrame`. Do not build a cache, do not add a worker thread, do not
interpolate between sampled tilts.

## 7. Known simplifications — document, do not "fix"

- Replacing mean obliquity with a user value is not a self-consistent alternate Earth. The
  nutation and aberration terms were fitted to the real Earth and are retained unchanged. At the
  default 23.44° the model matches NOAA; away from it, it is a well-behaved teaching model, not
  an ephemeris. Say this in the UI's methods note.
- Refraction is the fixed 0.833° allowance baked into the 90.833° zenith. No pressure or
  temperature dependence.
- Observer elevation is ignored (sea level). This costs a minute or two in mountain cities.
- Circular-ish orbit assumptions inside the NOAA series are accurate to roughly ±1 minute for
  1900–2100, which is well inside our tolerance.

## 8. Testing

Two independent layers. Both must exist.

### 8a. Golden fixtures — `test/fixtures/noaa-golden.json`

Generated **by a human, from an external authority** (the NOAA Solar Calculator), covering at
minimum: Tampere and Niigata × equinoxes and solstices × sunrise, sunset, solar noon; plus one
equatorial city and one southern-hemisphere city. Tolerance: ±60 s below 60° latitude, ±120 s
at or above 60°.

These files are read-only for Claude Code. See `.claude/skills/solar-verify/SKILL.md`.

### 8b. Physical invariants — `test/invariants.test.ts`

These need no external data and catch the tilt-wiring bugs that fixtures at 23.44° cannot:

1. **Zero tilt.** At `obliquityDeg = 0`, day length is ~12h07m at every latitude on every date,
   and varies by less than 2 minutes across the year. (Slightly over 12h because of refraction.)
2. **Zero tilt, equation of time.** At 0° tilt the obliquity component of the equation of time
   vanishes, leaving only the eccentricity term: |eot| stays under about 8 minutes all year,
   versus about 16 minutes at 23.44°. This test fails if `y` was not recomputed from the
   parameter.
3. **Equinox.** On the March and September equinoxes, day length is 12h±10min at all latitudes
   below 65°.
4. **Noon symmetry.** `(sunrise + sunset) / 2 == solarNoon` within 30 s, for every fixture case.
5. **Polar circle.** With `obliquityDeg = 40`, Tampere (61.5°N) returns `alwaysAbove` for the
   90.833° threshold on the June solstice and `alwaysBelow` on the December solstice. With
   `obliquityDeg = 23.44` it returns `event` on both.
6. **Tampere white nights.** At 23.44° tilt on the June solstice, `minAltitude` for Tampere is
   between -6° and -4°, and the astronomical-twilight query returns `alwaysAbove`.
7. **Niigata solar noon.** On the equinoxes, solar noon in `Asia/Tokyo` falls between 11:35 and
   11:55 local.
8. **Monotonic hemispheres.** Between the March and June solstice, Tampere's day length is
   non-decreasing and Sydney's is non-increasing, day over day.
9. **No NaN.** Sweep tilt 0→45 in 0.5° steps × 12 dates × all cities; no result is `NaN` and
   every non-event returns an `alwaysAbove`/`alwaysBelow` variant.

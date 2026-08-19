# Product spec — Daylight Lab

## One-line

Drag Earth's axial tilt and watch a whole year of daylight rearrange itself for two cities at once.

## The question the product answers

"Why is winter in the Nordics so dark?" is usually answered with a feeling. This answers it with
a number you can move. The tilt slider makes the causal chain visible in one gesture:
tilt → declination → the length of the arc the Sun traces above the horizon → the hours of light.

Three moments are what the product is actually selling:

1. **Set tilt to 0°.** Every city on Earth gets ~12 hours of daylight every day of the year.
   Seasons disappear. The whole shape of the chart collapses to a flat band.
2. **Set tilt to 40°.** Tampere is now inside the polar circle. A block of permanent daylight
   appears in summer and a block of permanent night in winter.
3. **Leave tilt at 23.44° and look at solar noon.** It is not at 12:00 in either city, and it
   moves through the year. This is the hook into the equation of time and into why Japan's
   single time zone puts Niigata's noon around 11:44.

## Audience

English-reading, curious adults. No astronomy background assumed; no dumbing down either.
Someone who has heard "the Earth is tilted 23.5 degrees" and never seen what that buys them.

## Core interactions

- **Tilt slider** — 0° to 45°, default 23.44°, step 0.01° with coarse keyboard steps. Everything
  recomputes live.
- **Two city slots (A and B)** — chosen from a curated list. Defaults: Tampere, Niigata.
- **Year chart** — x-axis is the date across one year, y-axis is local clock time 00:00–24:00,
  filled with day / civil / nautical / astronomical twilight / night bands for city A, with city
  B's sunrise and sunset drawn as overlaid lines.
- **Date scrubber** — hover or tap a date to get a readout: sunrise, sunset, day length, solar
  noon, maximum solar altitude, and the difference between the two cities.
- **Clock mode toggle** — "local clock" (with DST, showing the sawtooth) vs "solar time"
  (DST removed, revealing the smooth underlying curve). The toggle itself is a teaching device.
- **Presets** — "Earth today (23.44°)", "No tilt (0°)", "Extreme tilt (40°)", plus a
  "Tampere vs Niigata" city reset.

## State and sharing

All state lives in the URL hash so a view is shareable with no backend:

```
#tilt=23.44&a=tampere&b=niigata&date=2026-12-21&clock=local
```

Rules: unknown keys are ignored, malformed values fall back to defaults without throwing, and
every user interaction replaces (not pushes) the hash except preset buttons, which push so the
back button walks through presets.

`localStorage` may hold last-used cities and clock mode as a convenience, but the hash always
wins when present.

## Reference year

Use a fixed reference year (2026) rather than "this year" so screenshots, share links, and
golden tests stay stable. Show the year in the UI so it is not mistaken for live data.

## Non-goals

Do not build these, and push back if they get requested mid-stream:

- A 3D globe. A small 2D tilt diagram is enough and costs a tenth as much.
- Arbitrary geocoded locations. That needs a timezone database or an API; both break rule 1.
  The curated city list is the feature, not a limitation.
- Historical or future obliquity cycles (Milankovitch). Mentioned in copy, not simulated.
- Weather, cloud cover, or "hours of sunshine". This is geometry, not meteorology.
- Accounts, saved states, comments, or any server-side persistence.
- Localization. English only — see `docs/content-en.md` for why that is a deliberate position.

## Decisions worth not relitigating

- **Assets-only Workers deployment, no Worker script.** Static asset requests are not billed as
  Worker invocations, so traffic spikes cannot produce a bill. Adding a Worker for even one
  dynamic route forfeits that property.
- **Curated cities over search.** Ten to fifteen cities chosen to make specific points
  (polar circle, equator, southern hemisphere, extreme longitude-vs-timezone offset) teach more
  than a search box over 40,000 places.
- **SVG over Canvas for the year chart.** ~365 points per band is well within SVG's comfort
  zone, and it gives crisp text, CSS theming, and free accessibility hooks. Revisit only if
  measured frame time during a slider drag exceeds 16 ms.

# Milestones

Build in this order. Each milestone ends in a commit that passes `pnpm test` and `pnpm build`.
Do not start the next one until the current one's acceptance criteria are met.

## M0 — Scaffold

Vite + TypeScript (strict) + Vitest. `wrangler.jsonc` configured for assets-only deployment.
Empty `index.html` with the metadata from `docs/content-en.md`. Zero runtime dependencies.

**Done when:** `pnpm dev` serves a blank styled page, `pnpm test` runs with zero tests and exits
0, `pnpm build` produces `./dist`.

## M1 — Solar core

Everything in `docs/solar-math.md` §1–§4, plus the invariant tests in §8b. No UI at all.

**Done when:** all nine invariant tests pass; every exported function takes `obliquityDeg`; the
module imports nothing from the DOM or `Intl`.

> Stop here and report before continuing. Golden fixtures (§8a) are added by a human at this
> point, and M2 should not begin until `test/fixtures/noaa-golden.json` exists and passes.

## M2 — City data and time zone boundary

`src/data/cities.ts` with the curated list (id, English name, country, lat, lon, IANA zone, and
a one-line note explaining why the city is in the list). A presentation-layer module converting
UTC epoch ms to local minutes-since-midnight via `Intl`.

Minimum list: Tampere, Niigata, Tokyo, Reykjavík, Tromsø, Helsinki, Singapore, Nairobi, Sydney,
Ushuaia, Naha, Anchorage.

**Done when:** a test asserts Tampere's local offset differs between January and July while
Niigata's does not, and the Niigata solar noon invariant (§8b.7) passes end to end.

## M3 — Static chart

The year chart rendering for two hard-coded cities at 23.44° tilt. No controls yet.

**Done when:** bands render as continuous closed paths, polar cases fill to the chart edge with
no holes (verify by temporarily passing 40°), and the DST step appears in Tampere's curve.

## M4 — Interactivity

Tilt slider, presets, city selects, swap, clock-mode toggle, chart scrubbing, day readout, tilt
diagram. URL hash round-trip.

**Done when:** dragging the slider holds 60fps, a shared URL reproduces the exact view, the back
button walks preset history, and full keyboard operation works.

## M5 — Copy, accessibility, polish

The three prose sections, methods note, hidden data table, `aria-*` wiring, OG image, favicon,
responsive pass.

**Done when:** the accessibility checklist in `docs/ui-spec.md` is fully satisfied and the size
budget in `CLAUDE.md` holds.

## M6 — Deploy

`pnpm deploy` to Cloudflare, custom domain `daylight-lab.omusubilabs.fi`, cache headers set
(immutable hashed assets, short TTL on `index.html`).

**Done when:** the live URL renders identically to local build and a share link works from a
cold browser.

## Later, only if the thing gets used

- A second comparison mode: one city, two tilts, overlaid.
- Analemma view (solar noon position through the year) — the natural sequel to §2 of the copy.
- Seasonal sunlight *energy* rather than duration, integrating altitude over the day.

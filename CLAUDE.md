# Daylight Lab

An interactive, browser-only visualization of how axial tilt and latitude shape a year of
daylight. English-language product. Ships as a static site on Cloudflare Workers Static Assets.

Default comparison: **Tampere (61.5°N)** vs **Niigata (37.9°N)**.

## Read before you work

| When | Read |
| --- | --- |
| Any change to `src/lib/solar/**` | `docs/solar-math.md` (mandatory — do not derive the formulas yourself) |
| Any change to UI / layout / chart | `docs/ui-spec.md` |
| Any user-facing English text | `docs/content-en.md` |
| Deciding scope, or tempted to add a feature | `docs/product-spec.md` (see Non-goals) |
| Picking what to build next | `docs/milestones.md` |

## Hard rules

1. **No runtime network calls.** No APIs, no CDN fonts, no analytics, no telemetry. Every byte
   the browser needs is in the deployed bundle. This is what keeps the project inside the
   free tier and provably durable.
2. **No UI framework.** TypeScript + Vite + plain DOM. No React, Vue, Svelte, Tailwind, D3,
   or charting library. Zero runtime `dependencies` in `package.json`; devDependencies only.
3. **`src/lib/solar/` is pure.** No DOM, no `Intl`, no `new Date()` reading the host clock, no
   module-level mutable state. Functions take explicit arguments and return numbers. This is
   the layer that gets unit-tested; if it needs a browser to run, the design is wrong.
4. **Obliquity is a parameter, never a constant.** Every function that depends on axial tilt
   takes `obliquityDeg` as an argument. Never hard-code 23.44 anywhere except a single
   `EARTH_OBLIQUITY_DEG` export used as a default at the call site. The tilt slider is the
   whole product.
5. **Internal time is UTC epoch milliseconds.** Conversion to a city's wall clock happens only
   at the presentation boundary, via `Intl.DateTimeFormat` with an IANA time zone. Never ship a
   time zone database, and never do timezone math with fixed UTC offsets.
6. **Never edit `test/fixtures/*.json` to make a test pass.** Those are externally sourced
   ground truth. If a test fails, the code is wrong. If you believe a fixture is wrong, stop and
   report it in your response rather than changing it.
7. **All user-facing copy is English.** Comments and commit messages may be English or Japanese;
   anything rendered to the screen, and all `<meta>` content, is English only.
8. **Budget: < 60 KB gzipped JS, < 15 KB CSS, no web fonts.** If a change blows the budget, say
   so instead of silently shipping it.

## Commands

```bash
pnpm dev      # vite dev server
pnpm test     # vitest run (unit + golden fixtures + physical invariants)
pnpm build    # typecheck + vite build -> ./dist
pnpm deploy   # wrangler deploy (assets only; no Worker script)
```

## Definition of done

A change is not done until all of these hold:

- `pnpm test` passes, including the invariant tests in `test/invariants.test.ts`
- `pnpm build` passes with no TypeScript errors and stays inside the size budget
- The URL hash still round-trips: reload after changing state reproduces the same view
- Keyboard-only operation of the tilt slider and city selectors still works
- No new runtime dependency was added

## Working style

- Prefer vertical slices that are deployable on their own; see `docs/milestones.md`.
- When a spec is ambiguous or looks physically wrong, ask in your response instead of guessing.
  The astronomy is the part where a plausible-looking wrong answer is most expensive.
- Keep commits small and scoped to one milestone item.

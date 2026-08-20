# Daylight Lab

Drag Earth's axial tilt and watch a year of daylight rearrange itself for two cities at once.
Defaults to Tampere (61.5°N) and Niigata (37.9°N).

An Omusubi Labs experiment. Everything runs in the browser: no API calls, no backend, no
persistence beyond your own URL bar.

## Stack

TypeScript, Vite, Vitest. No runtime dependencies. Deployed to Cloudflare Workers as static
assets only — there is no Worker script.

```bash
pnpm install
pnpm dev      # http://localhost:5173
pnpm test
pnpm build
pnpm deploy
```

## Repository map

```
CLAUDE.md                          rules and pointers for Claude Code — read first
docs/
  product-spec.md                  what this is, what it deliberately is not
  solar-math.md                    the algorithm, verbatim. authoritative.
  ui-spec.md                       layout, chart geometry, interaction, a11y
  content-en.md                    English voice rules and required copy
  milestones.md                    build order with acceptance criteria
.claude/skills/solar-verify/       verification procedure for the astronomy layer
src/lib/solar/                     pure math, no DOM, fully unit tested
src/data/cities.ts                 curated city list with IANA zones
scripts/dump-year.ts               debugging tool: CSV dump of a full year
scripts/fixture-worksheet.ts       emits the blank sheet for the NOAA transcription
test/fixtures/noaa-golden.json     external ground truth — read-only, written by hand
```

## Accuracy

Uses the NOAA solar position formulation, accurate to roughly a minute for sunrise and sunset at
mid-latitudes. Changing the axial tilt away from 23.44° produces a teaching model, not a
physically self-consistent alternate Earth — see `docs/solar-math.md` §7.

## Initial commit checklist

- [ ] `CLAUDE.md`, `README.md`, `docs/**`, `.claude/skills/solar-verify/SKILL.md`
- [ ] `wrangler.jsonc`, `package.json`, `tsconfig.json` (strict), `vitest.config.ts`, `.gitignore`
- [ ] `.editorconfig` and a formatter config, so Claude Code's output does not churn the diff
- [ ] Empty `src/` and `test/` with a `.gitkeep`
- [ ] No source code — M1 onward is Claude Code's work

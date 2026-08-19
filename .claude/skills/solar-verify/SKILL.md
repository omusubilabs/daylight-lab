---
name: solar-verify
description: Verification procedure for any change under src/lib/solar/. Use this whenever modifying declination, equation of time, event times, altitude, obliquity handling, or anything that changes a computed sunrise, sunset, twilight, or solar noon value — including refactors that are "not supposed to" change results. Also use when a golden fixture test fails, to determine whether the code or the fixture is at fault.
---

# Verifying solar calculations

Astronomy code fails quietly. A wrong sign or a missed obliquity dependency still returns a
plausible time, and the error only shows at high latitude or away from the default tilt — which
is precisely where this product lives. Follow this procedure rather than trusting a green test
run on the default configuration.

## Before changing anything

Record the current baseline so you can diff behavior, not just tests:

```bash
pnpm test 2>&1 | tail -20
pnpm tsx scripts/dump-year.ts --city tampere --tilt 23.44 > /tmp/before-tampere.csv
pnpm tsx scripts/dump-year.ts --city tampere --tilt 40    > /tmp/before-tampere-40.csv
pnpm tsx scripts/dump-year.ts --city niigata --tilt 0     > /tmp/before-niigata-0.csv
```

If `scripts/dump-year.ts` does not exist yet, create it. It prints one CSV row per day: date,
sunrise, sunset, solar noon, day length, declination, equation of time, max altitude — all in
UTC. It is a debugging tool, not shipped code, and belongs in `scripts/`.

## After changing anything

1. `pnpm test` — both the golden fixtures and the invariants must pass.
2. Re-dump the same three CSVs and diff them against the baselines. **A refactor that claims to
   preserve behavior must produce byte-identical CSVs.** If it does not, the refactor changed
   something; find out what before proceeding.
3. Sweep the tilt parameter, not just the default:
   ```bash
   for t in 0 5 10 23.44 30 40 45; do
     pnpm tsx scripts/dump-year.ts --city tampere --tilt $t | md5sum
   done
   ```
   Seven distinct hashes are expected. Two identical hashes at different tilts means a code path
   is ignoring the parameter — most likely the equation of time, whose `y = tan²(ε/2)` term is
   easy to leave computed from a constant.

## When a golden fixture test fails

The fixtures in `test/fixtures/` are externally sourced ground truth from the NOAA Solar
Calculator. They are read-only.

Work through this in order:

1. Is the failure a constant offset across all cases? Suspect the Julian century being evaluated
   at 00:00 UTC instead of local solar noon (`docs/solar-math.md` §1).
2. Is it an offset of exactly 60 minutes for some dates only? Suspect a hard-coded UTC offset
   somewhere instead of `Intl` with an IANA zone (§5).
3. Is the error small at Niigata and large at Tampere? Suspect the declination or the hour-angle
   formula — errors scale with `tan(latitude)`.
4. Is the sign of the error flipped between hemispheres? Suspect longitude sign convention;
   positive is east.
5. Is only solar noon wrong while sunrise and sunset are right? Suspect the equation of time
   term specifically.

**Never edit a fixture file to make a test pass.** If after working through the list above you
still believe a fixture value is wrong, stop, leave the test failing, and report which case you
believe is wrong and why. A human regenerates fixtures from NOAA; Claude Code does not.

## Regenerating fixtures (human-only, documented here for reference)

Open the NOAA Solar Calculator, enter the city's latitude and longitude, select the date, read
sunrise / solar noon / sunset, and record them as UTC in `test/fixtures/noaa-golden.json` with
the source URL and retrieval date in the file header. Tolerance recorded per case: 60 seconds
below 60° latitude, 120 seconds at or above.

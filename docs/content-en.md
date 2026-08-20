# English content guide — Daylight Lab

## Voice

Plain, specific, unhurried. Written by someone who lives at 61°N and finds this genuinely
interesting, explaining it to someone who has never thought about it. Concrete numbers over
adjectives.

Rules:

- No marketing verbs: nothing "unlocks", "empowers", "revolutionizes", or "dives into".
- No exclamation marks. No rhetorical questions stacked for rhythm.
- No "Did you know?" framing. State the fact; it is interesting on its own.
- Second person is fine ("drag the slider"), first person plural is not ("let's explore").
- Sentences under 25 words as a rule. Break rather than nest.
- American spelling, 24-hour clock, metric units.
- Numbers: "23.44°", "61.5°N", "5h 41m". Degrees always with the symbol.

Every claim in the prose must be reproducible in the app itself. If the copy says the difference
is five hours, the reader must be able to scrub to that date and see five hours.

Since `docs/design-direction.md` §5.7, that includes tilts the reader has dragged to: a figure
tied to the current tilt is written as a `data-figure` span computed by
`src/lib/year/prose.ts`, not as a number typed into the sentence, and the brief below describes
the sentence at the default 23.44° only. Away from it the wording itself may branch — see §5.7
for which claims do and why.

## Required prose sections

Three sections, 120–180 words each. Titles are fixed; body is yours to write within the voice
rules.

### 1. "Why the north goes dark"

Latitude alone does not create winter — tilt does. Walk from tilt to declination to the length
of the Sun's arc above the horizon. End by pointing at the 0° preset.

The December 21 sentence branches past ~28.5° tilt, where Tampere's December goes all the way to
a polar night. Write both branches; do not write only the version true at 23.44°.

### 2. "Noon is not at 12:00"

Two separate reasons, kept distinct: (a) time zones are political, so Niigata runs on a clock
anchored 4° of longitude to its west; (b) the equation of time, which shifts solar noon by an
amount that grows with tilt — about 16 minutes either way at 23.44°, computed live, not a fixed
figure to write in. End by pointing at the solar-time toggle.

### 3. "White nights"

At Tampere on the June solstice the Sun drops only about 5° below the horizon at its lowest.
That is shallower than the 6° civil-twilight threshold, so the sky never gets properly dark —
without Tampere being anywhere near the Arctic Circle. Contrast with Niigata on the same night.

Both claims here are tilt-dependent, not just the numbers in them. Past ~28.5° tilt Tampere's
white nights become genuine midnight sun, and the Arctic Circle sits south of Tampere rather
than north of it — so "not midnight sun" and "gets no midnight sun" would be false at exactly
the tilts the slider makes reachable. Write the paragraph as a fact about the current tilt, not
as a fact about Tampere.

## Methods note

Short, factual, in the collapsible section. Names the NOAA formulation, states the accuracy
(about a minute at mid-latitudes), and is honest that changing the tilt gives a teaching model
rather than a physically self-consistent alternate Earth. Do not hide this; the honesty is part
of the appeal to the audience this is aimed at.

## Metadata

Follow the pattern already used across Omusubi Labs experiments.

```html
<title>Daylight Lab — Omusubi Labs Experiment</title>
<meta name="description" content="Drag Earth's axial tilt and watch a year of daylight change for two cities at once. Tampere at 61°N, Niigata at 38°N.">
<meta property="og:title" content="Daylight Lab">
<meta property="og:description" content="Drag Earth's axial tilt and watch a year of daylight change for two cities at once.">
<meta property="og:site_name" content="Omusubi Labs Experiments">
<meta property="og:type" content="website">
<meta property="og:url" content="https://daylight-lab.omusubilabs.fi/">
<meta name="theme-color" content="#0f172a">
<link rel="canonical" href="https://daylight-lab.omusubilabs.fi/">
```

Ship a static 1200×630 OG image showing the default Tampere/Niigata chart. Generate it once by
hand and commit it; do not build a runtime image generator, which would require a Worker script.

## Why English only

The audience for this — people who find orbital geometry pleasant — is overwhelmingly reachable
in English, and a translated version would double the maintenance for a fraction of the reach.
The Japanese-language treatment of the same material belongs in a separate writeup with its own
framing, not in this repo.

# Design direction — Daylight Lab

Decided 2026-08-20. This document is the authority on how the page is meant to behave. Where it
disagrees with `docs/ui-spec.md`, this wins; the amendments are listed in §8.

## 1. One line

The prose is the interface. Every number in the copy that names a parameter is a control, and the
tilt diagram is grabbed directly rather than driven by a separate slider.

## 2. What counts as curiosity here

Three tests. Every change proposed below has to move at least one of them, and none may regress.

| Test | What it demands |
| --- | --- |
| **Immediacy** | Cause and effect are visible in one gesture. The object is continuously displayed; the action is physical; the result is immediate and reversible. A control that requires pressing and then waiting has already broken the chain. |
| **Distance to the claim** | The sentence that makes a claim and the control that tests it are in view at the same time, with no scrolling between them. The further apart they are, the fewer readers try. |
| **Breakable and recoverable** | Extreme values are reachable — 0° and 40° are what the product is selling — and there is always a visible way back to 23.44°. |

## 3. The decision

**Reactive prose is the spine. Direct manipulation of the diagram is the signature.**

The reason is not taste. The product is already written for this and stops one step short:

- The copy points at controls it does not contain. `index.html` says "Press **No tilt (0°)**" and
  "Switch the clock control to **Solar time**" — sentences written to hand the reader a control,
  with the control somewhere else on the page.
- The stylesheet already states the intent. `.prose b` in `src/styles.css` sets those phrases in
  the monospace face and the accent color, with a comment explaining that this makes them read as
  "a thing to press rather than as emphasis".

So the promise exists in the copy and in the CSS. Only the behavior is missing. This direction
collects a debt; it is not a new idea.

## 4. Rejected, and not to be relitigated

**A guided scroll sequence (three acts, then free play).** It is the strongest option for a
first-time reader who does not know what to do, and it was still rejected:

- It needs an exception to the rule that every interaction is reflected in the URL hash
  (`docs/product-spec.md`), which costs the shareable-link guarantee its consistency.
- It needs a second, static presentation for `prefers-reduced-motion`, roughly doubling the work.
- Staged reveals pull the copy toward the register `docs/content-en.md` forbids.

**An instrument panel as the whole page.** Partially adopted, not wholesale. The one move worth
taking is making the diagram grabbable (§5.6). Turning the entire page into a control surface
puts the prose below the instrument, which is exactly the distance the second test penalizes.

## 5. What changes

Build in this order. Each item is deployable on its own. The order is not arbitrary: an inline
control is pointless while the chart is off-screen, so the figure has to become sticky first.

### 5.1 Split the accent color

`--accent: #f4d58d` currently serves as the focus ring, link color, hover border, segmented active
state, diagram Sun and city-A chord, and tilt readout — and `--cursor` duplicates its value for the
scrub line. All of it sits one step from `--band-day: #f6e6ad`. One color meaning both
"interactive" and "daylight" makes neither legible.

The rule after the split: **warm means a control over light; cool means navigation and mode.**

| Token | Value | Used by |
| --- | --- | --- |
| `--sun` | `#f4d58d` | Tilt readout, diagram Sun and axis grip, inline tilt controls, tilt presets |
| `--ui-accent` | `#7fb2d9` | Focus ring, links, city selects, swap, clock-mode toggle, scrub cursor |
| `--overlay` | `#ff5c7a` | City B only. Unchanged. |

`#7fb2d9` measures 7.6:1 on `--bg` and 7.0:1 on `--surface`. It is a starting value: verify it
against every band before shipping, and keep `--stroke-halo` under the scrub cursor, which at
1.8:1 over the day band is illegible without it.

### 5.2 Make the chart a sticky figure

The chart must be on screen while the sentence discussing it is read.

- The chart container is `position: sticky; top: 0`.
- Docked, it shortens to 150px (110px below 700px) and drops its axis labels and legend. The scrub
  cursor stays. Undocked, it is the full 420px specified in `ui-spec.md`.
- The chart already reads its box height back and matches its `viewBox` to it, so the docked height
  is a CSS change plus a re-render, not a second renderer.
- Under `prefers-reduced-motion`, swap the height rather than transitioning it.

### 5.3 Inline controls in the prose

**A number becomes a control only if it is a parameter of the model, never if it is a result.**
`23.44°` is draggable. `5h 21m` is not — it recomputes. Without this rule the page turns into a
field of fidgety numbers and the reader stops trusting which ones mean anything.

Three kinds, each with its own affordance:

| Kind | Element | Affordance | Where |
| --- | --- | --- | --- |
| **Drag** | `role="slider"` span | Monospace, `--sun`, dashed underline, `cursor: ew-resize` | Tilt only |
| **Set** | `<button>` | Monospace, `--sun`, pill border | "No tilt (0°)", "Solar time", "Extreme tilt (40°)" |
| **Address** | `<button>` | Monospace, dotted underline | Dates: "December 21", "June 21" |

Rules that hold for all three:

- **One state, many controls.** Every inline control writes the same `AppState` through the same
  `apply()` path as the existing controls. No inline control holds state of its own.
- Drag controls commit with `defer` (the hash is written when the drag settles); set controls
  `push`, matching the existing preset rule; address controls `defer`.
- Keyboard parity with the range input they replace — arrows 0.5°, Shift+arrows 0.1°, Home/End
  0°/45° — plus PageUp/PageDown at 5°, which is new and worth having over a 45° range.
- `aria-valuetext` reads as it does today: "23.44 degrees, Earth's actual tilt".
- `touch-action: none` goes on the control itself, never on its container, so the page still scrolls.

### 5.4 Dates in the prose address the chart

Hovering or focusing a date in the copy previews that column in the chart; activating it scrubs to
that date and updates the day readout. `dayIndex` is already a field of `AppState`, so this is a
new caller, not new state.

This is what ties the sentence to the picture: "Scrub to June 21 and look at Tampere" stops being
an instruction and becomes the thing itself.

### 5.5 Wire the named controls in the copy

"No tilt (0°)", "Extreme tilt (40°)" and "Solar time" already exist as buttons elsewhere on the
page. The inline versions call the same handlers. Nothing new is computed.

### 5.6 The diagram becomes the control

The tilt diagram gets a grip on the axis; dragging it sets the tilt, clamped to 0–45°. The separate
`<input type="range">` is removed.

- The diagram carries the WAI-ARIA slider pattern: `role="slider"`, `tabindex="0"`,
  `aria-valuemin/max/now/text`, and a visible focus ring. The project already does this for the
  chart's scrub surface, so it is not a new pattern here.
- **Escape hatch:** if screen-reader testing shows the ARIA slider is worse than the native input,
  keep the input visible below the diagram and treat the grip as an additional control rather than
  a replacement. Do not "keep" the input by hiding it visually — a focusable element with no visible
  focus is worse than either option.

### 5.7 The prose keeps up with the state

§5.3 decided which numbers become controls. This decides which of the rest move, and §5.3 is what
made it urgent: the tilt is now scrubbed continuously from inside the sentence that quotes its
consequences. It moves the first test in §2 — the effect of the gesture is the sentence being read
— and it is the only item here that is also a correctness fix.

**The rule, extending §5.3's.** A figure moves when it is a result of the current state. A figure
stays when the sentence names the state it describes. "Press **No tilt (0°)** ... Tampere then gets
12h 14m" is about 0°, wherever the tilt actually is; wiring it would break it in the other
direction.

Measured 2026-08-20 against `src/lib/solar/`: every figure in the copy is correct at the default
state. What follows is what happens away from it.

#### Figures that move

| Where | Today | At 0° | At 40° |
| --- | --- | --- | --- |
| §1 ¶3, December 21 at Tampere | 09:42, 5.1°, 15:03, 5h 21m | 06:16, 28.5°, 18:30, 12h 14m | polar night, -11.5°, 0h 00m |
| §2 ¶2, Tampere's solar noon | 12:23 | 12:23 | 12:22 |
| §2 ¶3, the equation of time | "about a quarter of an hour" | 7.7 min | 37.2 min |
| §2 ¶3, Niigata's solar noon | 11:27 to 11:58 | 11:36 to 11:51 | 11:06 to 12:18 |
| §3 ¶1, June 21 at Tampere | 23:11, 03:41, 5.1° below | 19:33, 07:19, 28.5° below | midnight sun, 11.5° above |
| §3 ¶2, the white-night run | June 5 to July 7, 33 nights | none | April 27 to August 15, 111 nights |
| §3 ¶3, the polar circle | 5°, 66.6°N, 560 km | 90.0°N | 50.0°N, Tampere 11.5° inside |
| §3 ¶4, Niigata's lowest Sun | 28.7° below | 52.1° below | 12.1° below |

Solar time moves 09:42/15:03 to 09:20/14:40 and 23:11/03:41 to 21:45/02:15. It does not move a day
length. The dates the copy names — December 21, June 21 — are addresses, not readings, and stay
fixed however the chart is scrubbed (§5.4).

#### Claims that invert

Three sentences flip their truth value, and no substituted number saves them:

1. "not midnight sun, but a night that never finishes darkening" — past the tipping point it is
   exactly midnight sun.
2. "None of this needs the Arctic Circle ... Tampere gets no midnight sun on any date of the year."
3. "The Sun sets at 23:11 and rises again at 03:41 ... In between it does not go far down" — at 40°
   it neither sets nor rises.

The tipping point is **28.5°**, which is `90 - 61.4978` and nothing else. It is inside the range,
one drag from the default, and 40° is a labelled preset whose own `meaning` string reads "Tampere
inside the polar circle". The product already argues with its own copy; §5.3 only made it
continuous.

The two halves are different work:

- **Figures** reuse `Reading` from `src/lib/year/readings.ts`, which already renders "Midnight sun"
  and "Polar night" where a time will not do. No new idea, one more caller.
- **Claims** are rewritten to hold at every tilt, anchored to where the polar circle currently is
  rather than to a fact about Tampere that stops being one at 28.5°.

This also amends `docs/content-en.md`: the brief for prose section 3 specifies the claim itself
("without Tampere being anywhere near the Arctic Circle"), so the brief moves with the copy.

#### What must not move

- The conditional sentences — §1 ¶4's "Press **No tilt (0°)** ... 12h 14m" and §2 ¶4's "Switch ...
  to **Solar time** ... exactly 12:00". Both describe a state the reader is being sent to.
- 6° for civil twilight, 0.833° for refraction, 2026 for the reference year.
- Both 23.44° in the methods note. That is Earth's obliquity as a fixed reference, not the tilt.
- The methods note's worked examples — 7 minutes at the equator, 14 at Tampere, 19 at Tromsø. They
  are chosen illustrations, not city A.

#### City names stay fixed

"Tampere sits at 61.5°N", "Japan runs on one time zone, anchored to 135°E", "Niigata is at
139.0°E", "a zone anchored to 30°E". None of these follow the city selectors, and §2 is the reason:
it is built on Japan's and Finland's specific anchors, so substituting numbers yields "Singapore
runs on one time zone, anchored to 135°E". Rewriting the subject of a sentence is copy generation,
not a readout, and `docs/content-en.md` writes these three sections about these two cities on
purpose. The "Tampere vs Niigata" reset is the way back, and it already exists.

#### Order

Last in the list, but not least urgent: it depends on none of §5.4–§5.6 and can be taken whenever.
Within it, §1 ¶3 comes first — it is the sentence directly under the new control — then §3, which
holds the three inverting claims, then §2.

## 6. What does not change

- `src/lib/solar/` is untouched. This is a presentation change. No fixture moves, for any reason.
- The hash schema is unchanged. A view shared before this work still resolves after it.
- No runtime dependency, no network call, no web font, no framework.
- The curated city list, the fixed reference year, and every non-goal in `docs/product-spec.md`.
- All user-facing copy stays English.

## 7. Budget

Measured on 2026-08-20: JS 11.4 KB gzipped against a 60 KB ceiling, CSS 2.6 KB against 15 KB. The
six items above are expected to add under 2 KB gzipped in total. Measure after each one. If a single
item costs more than a kilobyte, stop and report it rather than shipping it. §5.7 was added after
that estimate and is not inside it: it is roughly twenty figures plus phrase handling, so measure
it on its own and expect it to be the largest of them.

## 8. Amendments to `docs/ui-spec.md`

Apply each as its item ships, not in advance — `ui-spec.md` should keep describing the UI that
exists.

| Section | Change |
| --- | --- |
| Layout 2, Tilt control | The range input is removed; the diagram is the control. |
| Layout 3, Tilt diagram | Primary control, not an illustration. Sized and placed accordingly. |
| Layout 4, Year chart | Sticky; shortens to 150px / 110px when docked. |
| Layout 6, Explainers | Carry inline controls. See §5.3. |
| Layout 6, Explainers | Their figures track the state, and three claims are rewritten to hold at any tilt. See §5.7. |
| Colors | `--accent` splits into `--sun` and `--ui-accent`. See §5.1. |
| Interaction | Three rows added: inline drag, inline set, inline address. |
| Accessibility | The tilt slider bullet is restated for the ARIA slider pattern. |

The "Definition of done" line in `CLAUDE.md` about keyboard operation of the tilt slider is read as
the tilt *control*, whichever element carries it.

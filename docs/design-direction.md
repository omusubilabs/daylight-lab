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

## 6. What does not change

- `src/lib/solar/` is untouched. This is a presentation change. No fixture moves, for any reason.
- The hash schema is unchanged. A view shared before this work still resolves after it.
- No runtime dependency, no network call, no web font, no framework.
- The curated city list, the fixed reference year, and every non-goal in `docs/product-spec.md`.
- All user-facing copy stays English.

## 7. Budget

Measured on 2026-08-20: JS 11.4 KB gzipped against a 60 KB ceiling, CSS 2.6 KB against 15 KB. The
six items above are expected to add under 2 KB gzipped in total. Measure after each one. If a single
item costs more than a kilobyte, stop and report it rather than shipping it.

## 8. Amendments to `docs/ui-spec.md`

Apply each as its item ships, not in advance — `ui-spec.md` should keep describing the UI that
exists.

| Section | Change |
| --- | --- |
| Layout 2, Tilt control | The range input is removed; the diagram is the control. |
| Layout 3, Tilt diagram | Primary control, not an illustration. Sized and placed accordingly. |
| Layout 4, Year chart | Sticky; shortens to 150px / 110px when docked. |
| Layout 6, Explainers | Carry inline controls. See §5.3. |
| Colors | `--accent` splits into `--sun` and `--ui-accent`. See §5.1. |
| Interaction | Three rows added: inline drag, inline set, inline address. |
| Accessibility | The tilt slider bullet is restated for the ARIA slider pattern. |

The "Definition of done" line in `CLAUDE.md` about keyboard operation of the tilt slider is read as
the tilt *control*, whichever element carries it.

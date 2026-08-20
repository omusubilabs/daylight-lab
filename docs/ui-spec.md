# UI spec — Daylight Lab

Plain DOM + TypeScript. No framework, no CSS framework, no icon library, no web fonts
(system font stack only). One page, no routing.

`docs/design-direction.md` sets the interaction model and amends the sections listed in its §8.
Where the two disagree the direction wins; this file is amended as each of its items ships.

## Layout

Single column, max width 1100px, centered. Order top to bottom:

1. **Header** — title, one-sentence subtitle, reference year badge ("Year 2026").
2. **Tilt control** — the primary control, visually dominant. Large range input, current value in
   a big readout, three preset buttons underneath.
3. **Tilt diagram** — small inline SVG (~220×160): the Sun, Earth's orbit plane, and the axis
   drawn at the current tilt, with the two cities' latitudes marked as ticks. Redraws live with
   the slider. This is the causal bridge between the abstract number and the chart.
4. **Year chart** — the main artifact. Full width, ~420px tall on desktop, and sticky at the top
   of the viewport so that it is still on screen while the prose discussing it is read. Docked, it
   shortens to 150px and drops its axis labels and legend; the scrub cursor stays
   (`docs/design-direction.md` §5.2).
5. **Day readout** — a row of figures for the scrubbed date, city A vs city B side by side.
6. **Explainers** — three short prose sections (see `docs/content-en.md`), carrying inline
   controls. The tilt in the first section is a drag control; the two declination figures in
   the same sentence are results, and recompute with it (`docs/design-direction.md` §5.3).
7. **Methods & limits** — collapsible; states the simplifications from `docs/solar-math.md` §7.
8. **Footer** — Omusubi Labs Experiments, link back to the experiments index, source link.

Below 700px: the chart keeps full width but drops to ~320px tall, and to 110px docked; the day
readout stacks vertically, and the tilt diagram sits beside the slider readout rather than below
it.

## Year chart geometry

- SVG, `viewBox="0 0 1100 420"`, `preserveAspectRatio="none"` on the plot area only — axis text
  must live outside any scaled group so it never distorts.
- **x**: day of year, 1..365, evenly spaced. Month boundaries as faint vertical rules with
  labels J F M A M J J A S O N D.
- **y**: local clock time, 00:00 at top to 24:00 at bottom. Horizontal rules every 3 hours.
- **Bands for city A**, drawn back to front: night → astronomical → nautical → civil → day.
  Each band is a single closed `<path>` built from the year's morning boundary going right and
  the evening boundary coming back left. One path per band, not 365 rectangles.
- **City B** is drawn as two 2px lines (sunrise, sunset) over the bands, plus a legend swatch.
- **Polar day / night** must render as continuous fill to the chart edge, not as a gap. When a
  threshold returns `alwaysAbove` or `alwaysBelow`, clamp its boundary to 00:00 / 24:00 and keep
  the path closed. Test this by setting tilt to 40° and confirming there are no holes.
- **DST discontinuity** in local-clock mode is a genuine vertical step. Do not smooth it, do not
  interpolate across it — break the path and start a new segment.
- **Docked**, the axis gutter goes to zero and the plot takes the whole frame but for its border.
  The labels are removed rather than hidden, so nothing holds room it no longer needs.

## Colors

Dark theme only, matching the existing experiments (`#0f172a` background, same as the
`theme-color` used on drawing-runner). Bands go from deep navy (night) through progressively
lighter blue-violet twilights to a warm pale yellow for day. Requirements: the day/civil boundary
must be distinguishable at 3px width, and the two city-B lines must be legible over every band.
Do not use a rainbow ramp; a single hue progression reads as "amount of light", which is the
point. Define every color as a CSS custom property in one `:root` block.

Interactive color is two tokens, and which one a thing takes is decided by what it does
(`docs/design-direction.md` §5.1). `--sun` (`#f4d58d`) is for a control over light: the tilt
readout, the tilt presets, the diagram's Sun and rays, city A's chord, and the controls named in
the prose. `--ui-accent` (`#7fb2d9`) is for navigation and mode: the focus ring, links, the city
selects and the swap and reset buttons, the clock-mode toggle, and the scrub cursor. `--overlay`
(`#ff5c7a`) remains city B's and nothing else's.

`--ui-accent` measures 7.9:1 on `--bg` and 7.0:1 on `--surface`, and at least 4.8:1 on every band
down to nautical. It is not legible on its own over the civil (2.3:1) or day (1.8:1) bands, which
is what `--stroke-halo` under the scrub cursor is for: the halo stripe alone reads 4.1:1 against
the day band, and the dashes read 5.2:1 and 8.6:1 against the halo over civil and night. A change
to either value has to keep that pair of jobs covered.

## Interaction

| Control | Behavior |
| --- | --- |
| Tilt slider | `input` event → recompute both cities' full year → rAF-coalesced redraw. Keyboard arrows step 0.5°, Shift+arrows 0.1°, PageUp/PageDown 5°, Home/End jump to 0°/45°. |
| Inline tilt drag | The tilt in the prose is a `role="slider"` span. A sideways drag reads as a delta from where it started, 0.1° per pixel, so the whole range is one 450px sweep. Same key map as the slider; same state, with the hash deferred until the drag settles. |
| Preset buttons | Animate the tilt to the target over ~600ms with an ease-out, unless `prefers-reduced-motion`, in which case jump. Pushes a history entry. |
| City selects | Native `<select>` elements, grouped by region. Swapping A and B has a dedicated swap button. |
| Chart scrub | Pointer move / touch drag over the chart moves a vertical cursor and updates the day readout. Also focusable, with left/right arrows moving one day and PageUp/PageDown one month. |
| Clock mode toggle | Two-state segmented control: "Local clock" / "Solar time". |

Everything above updates the URL hash with `replaceState`, except presets, which use
`pushState`.

## Day readout fields

Per city: sunrise, sunset, day length, solar noon, max solar altitude, and — only when the Sun
does not set or does not rise — a replacement phrase instead of a time ("Midnight sun",
"Polar night"). Plus one comparison line: difference in day length between the two cities,
phrased as e.g. "Tampere gets 5h 41m less daylight than Niigata today."

Format times as `HH:MM` in 24-hour form with the city's zone abbreviation. Day length as
`Xh Ym`. Never render a bare number without a unit.

## Accessibility

- The tilt slider is a real `<input type="range">` with `aria-valuetext` reading e.g.
  "23.4 degrees, Earth's actual tilt".
- The inline tilt in the prose carries the WAI-ARIA slider pattern — `role="slider"`,
  `tabindex="0"`, `aria-valuemin`/`max`/`now`, and the same `aria-valuetext`. It is a second
  control over one value, not a second value, so both read alike.
- The chart carries `role="img"` with an `aria-label` summarizing the current state, plus a
  visually hidden `<table>` of monthly sunrise/sunset values that updates with state. This is
  both the accessibility story and a free SEO surface.
- Respect `prefers-reduced-motion` for all animation.
- Every interactive element is reachable and operable by keyboard, with a visible focus ring.
- Contrast: all text at least 4.5:1 against its band.

## Performance targets

- First render under 1s on a mid-range phone over 4G.
- Slider drag holds 60fps: full recompute plus path rebuild under 16ms. Measure before
  optimizing; if it misses, the first move is fewer path points (sample every 2 days while
  dragging, full resolution on release), not a rewrite to Canvas.

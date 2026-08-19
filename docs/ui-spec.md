# UI spec — Daylight Lab

Plain DOM + TypeScript. No framework, no CSS framework, no icon library, no web fonts
(system font stack only). One page, no routing.

## Layout

Single column, max width 1100px, centered. Order top to bottom:

1. **Header** — title, one-sentence subtitle, reference year badge ("Year 2026").
2. **Tilt control** — the primary control, visually dominant. Large range input, current value in
   a big readout, three preset buttons underneath.
3. **Tilt diagram** — small inline SVG (~220×160): the Sun, Earth's orbit plane, and the axis
   drawn at the current tilt, with the two cities' latitudes marked as ticks. Redraws live with
   the slider. This is the causal bridge between the abstract number and the chart.
4. **Year chart** — the main artifact. Full width, ~420px tall on desktop.
5. **Day readout** — a row of figures for the scrubbed date, city A vs city B side by side.
6. **Explainers** — three short prose sections (see `docs/content-en.md`).
7. **Methods & limits** — collapsible; states the simplifications from `docs/solar-math.md` §7.
8. **Footer** — Omusubi Labs Experiments, link back to the experiments index, source link.

Below 700px: the chart keeps full width but drops to ~320px tall, the day readout stacks
vertically, and the tilt diagram sits beside the slider readout rather than below it.

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

## Colors

Dark theme only, matching the existing experiments (`#0f172a` background, same as the
`theme-color` used on drawing-runner). Bands go from deep navy (night) through progressively
lighter blue-violet twilights to a warm pale yellow for day. Requirements: the day/civil boundary
must be distinguishable at 3px width, and the two city-B lines must be legible over every band.
Do not use a rainbow ramp; a single hue progression reads as "amount of light", which is the
point. Define every color as a CSS custom property in one `:root` block.

## Interaction

| Control | Behavior |
| --- | --- |
| Tilt slider | `input` event → recompute both cities' full year → rAF-coalesced redraw. Keyboard arrows step 0.5°, Shift+arrows 0.1°, Home/End jump to 0°/45°. |
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

/** docs/solar-math.md §2 — the default the tilt slider starts at, never a hard-coded fallback. */
export const EARTH_OBLIQUITY_DEG = 23.44;

/** docs/solar-math.md §3 — zenith angles from the vertical; the sunrise value includes refraction. */
export const ZENITH_DEG = {
  sunrise: 90.833,
  civil: 96,
  nautical: 102,
  astronomical: 108,
} as const;

export type ThresholdName = keyof typeof ZENITH_DEG;

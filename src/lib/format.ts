/**
 * Presentation-only string helpers. docs/content-en.md: 24-hour clock, degrees always carry the
 * symbol, durations read `Xh Ym`, and no number is ever rendered without its unit.
 */

const MINUTES_PER_DAY = 1440;

export function formatHhMm(minutes: number): string {
  const rounded = Math.round(minutes);
  const wrapped = ((rounded % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
}

export function formatDuration(minutes: number): string {
  const rounded = Math.round(minutes);
  return `${Math.floor(rounded / 60)}h ${String(rounded % 60).padStart(2, '0')}m`;
}

export function formatLatitude(latitudeDeg: number): string {
  return `${Math.abs(latitudeDeg).toFixed(1)}°${latitudeDeg < 0 ? 'S' : 'N'}`;
}

export function formatAltitude(altitudeDeg: number): string {
  return `${altitudeDeg.toFixed(1)}°`;
}

/** The tilt readout: two decimals are the slider's step, but `23.44°` beats `0.00°`. */
export function formatTilt(tiltDeg: number): string {
  return `${Number(tiltDeg.toFixed(2))}°`;
}

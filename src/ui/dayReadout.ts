import type { City } from '../data/cities.ts';
import { formatDuration, formatLatitude } from '../lib/format.ts';
import type { ClockMode } from '../lib/time/index.ts';
import { dayReading, formatLongDate, formatMonthDay, withSuffix } from '../lib/year/index.ts';
import type { YearDay } from '../lib/year/index.ts';
import { el } from './dom.ts';

const FIELDS = ['Sunrise', 'Sunset', 'Day length', 'Solar noon', 'Max altitude'] as const;

export interface CityDay {
  readonly city: City;
  readonly day: YearDay;
}

export interface DayReadoutData {
  readonly year: number;
  readonly dayIndex: number;
  readonly clockMode: ClockMode;
  readonly a: CityDay;
  readonly b: CityDay;
}

interface CityPanel {
  readonly element: HTMLElement;
  readonly name: HTMLElement;
  readonly latitude: HTMLElement;
  readonly values: HTMLElement[];
}

function cityPanel(role: 'a' | 'b'): CityPanel {
  const name = el('span', 'figures__name');
  const latitude = el('span', 'figures__latitude');
  const heading = el('h3', 'figures__heading');
  heading.append(name, latitude);

  const list = el('dl', 'figures__list');
  const values = FIELDS.map((field) => {
    const row = el('div', 'figures__row');
    const value = el('dd', 'figures__value');
    row.append(el('dt', 'figures__term', field), value);
    list.append(row);
    return value;
  });

  const element = el('div', `figures figures--${role}`);
  element.append(heading, list);
  return { element, name, latitude, values };
}

function fillPanel(panel: CityPanel, entry: CityDay, mode: ClockMode): void {
  const { city, day } = entry;
  const reading = dayReading(city, day, mode);

  panel.name.textContent = city.name;
  panel.latitude.textContent = formatLatitude(city.latitudeDeg);

  const texts = [
    withSuffix(reading.sunrise, reading.suffix),
    withSuffix(reading.sunset, reading.suffix),
    reading.dayLength,
    `${reading.solarNoon} ${reading.suffix}`,
    reading.maxAltitude,
  ];

  panel.values.forEach((value, index) => {
    value.textContent = texts[index] ?? '';
  });
}

function comparisonText(data: DayReadoutData): string {
  const date = formatMonthDay(data.year, data.dayIndex);
  const a = data.a.day.dayLengthMinutes;
  const b = data.b.day.dayLengthMinutes;
  const difference = Math.round(a) - Math.round(b);

  if (difference === 0) {
    return `${data.a.city.name} and ${data.b.city.name} both get ${formatDuration(a)} of daylight on ${date}.`;
  }

  const direction = difference > 0 ? 'more' : 'less';
  return (
    `${data.a.city.name} gets ${formatDuration(Math.abs(difference))} ${direction} daylight than ` +
    `${data.b.city.name} on ${date}.`
  );
}

export interface DayReadout {
  readonly element: HTMLElement;
  update(data: DayReadoutData): void;
  /** The same figures as one sentence, for the chart's `aria-valuetext` while scrubbing. */
  summary(data: DayReadoutData): string;
}

export function createDayReadout(): DayReadout {
  const date = el('h2', 'readout__date');
  const panelA = cityPanel('a');
  const panelB = cityPanel('b');

  const cities = el('div', 'readout__cities');
  cities.append(panelA.element, panelB.element);

  const comparison = el('p', 'readout__comparison');

  const element = el('section', 'readout');
  element.append(date, cities, comparison);

  const summary = (data: DayReadoutData): string =>
    `${formatMonthDay(data.year, data.dayIndex)}. ` +
    `${data.a.city.name} ${formatDuration(data.a.day.dayLengthMinutes)} of daylight, ` +
    `${data.b.city.name} ${formatDuration(data.b.day.dayLengthMinutes)}.`;

  const update = (data: DayReadoutData): void => {
    date.textContent = formatLongDate(data.year, data.dayIndex);
    fillPanel(panelA, data.a, data.clockMode);
    fillPanel(panelB, data.b, data.clockMode);
    comparison.textContent = comparisonText(data);
  };

  return { element, update, summary };
}

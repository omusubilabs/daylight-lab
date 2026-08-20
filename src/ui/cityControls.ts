import { CITIES } from '../data/cities.ts';
import type { City } from '../data/cities.ts';
import { formatLatitude } from '../lib/format.ts';
import { el } from './dom.ts';

export interface CityControlsOptions {
  onChange(cityAId: string, cityBId: string): void;
}

export interface CityControls {
  readonly element: HTMLElement;
  update(cityAId: string, cityBId: string): void;
}

function optionFor(city: City): HTMLOptionElement {
  const option = el('option', undefined, `${city.name} — ${formatLatitude(city.latitudeDeg)}`);
  option.value = city.id;
  option.title = `${city.country}. ${city.note}`;
  return option;
}

/** Regions appear in the order the curated list first reaches them, which is north to south. */
function citySelect(id: string, labelText: string, hint: string): HTMLElement {
  const select = el('select', 'city__select');
  select.id = id;

  const groups = new Map<string, HTMLOptGroupElement>();
  for (const city of CITIES) {
    let group = groups.get(city.region);
    if (!group) {
      group = el('optgroup');
      group.label = city.region;
      groups.set(city.region, group);
      select.append(group);
    }
    group.append(optionFor(city));
  }

  const label = el('label', 'city__label');
  label.htmlFor = id;
  label.append(document.createTextNode(labelText), el('span', 'city__hint', hint));

  const field = el('div', 'city');
  field.append(label, select);
  return field;
}

export function createCityControls(options: CityControlsOptions): CityControls {
  const fieldA = citySelect('city-a', 'City A', 'shaded bands');
  const fieldB = citySelect('city-b', 'City B', 'sunrise and sunset lines');
  const selectA = fieldA.querySelector('select');
  const selectB = fieldB.querySelector('select');
  if (!selectA || !selectB) throw new Error('city select failed to build');

  const swap = el('button', 'city-swap', 'Swap');
  swap.type = 'button';
  swap.setAttribute('aria-label', 'Swap city A and city B');
  swap.addEventListener('click', () => options.onChange(selectB.value, selectA.value));

  for (const select of [selectA, selectB]) {
    select.addEventListener('change', () => options.onChange(selectA.value, selectB.value));
  }

  const element = el('div', 'cities');
  element.append(fieldA, swap, fieldB);

  const update = (cityAId: string, cityBId: string): void => {
    if (selectA.value !== cityAId) selectA.value = cityAId;
    if (selectB.value !== cityBId) selectB.value = cityBId;
  };

  return { element, update };
}

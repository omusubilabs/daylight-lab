import './styles.css';
import { renderYearChart } from './chart/yearChart.ts';
import { DEFAULT_CITY_A_ID, DEFAULT_CITY_B_ID, cityById } from './data/cities.ts';
import type { City } from './data/cities.ts';
import { EARTH_OBLIQUITY_DEG } from './lib/solar/index.ts';
import { yearSeries } from './lib/year/index.ts';

/** Fixed so screenshots, share links and golden tests stay stable (docs/product-spec.md). */
const REFERENCE_YEAR = 2026;

function requireCity(id: string): City {
  const city = cityById(id);
  if (!city) throw new Error(`unknown city id: ${id}`);
  return city;
}

const app = document.querySelector('#app');
if (app) {
  const a = yearSeries(requireCity(DEFAULT_CITY_A_ID), EARTH_OBLIQUITY_DEG, REFERENCE_YEAR);
  const b = yearSeries(requireCity(DEFAULT_CITY_B_ID), EARTH_OBLIQUITY_DEG, REFERENCE_YEAR);
  app.append(renderYearChart(a, b));
}

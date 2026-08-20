import { describe, expect, it } from 'vitest';
import { CITIES, DEFAULT_CITY_A_ID, DEFAULT_CITY_B_ID, cityById } from '../src/data/cities.ts';

const REQUIRED_NAMES = [
  'Tampere',
  'Niigata',
  'Tokyo',
  'Reykjavík',
  'Tromsø',
  'Helsinki',
  'Singapore',
  'Nairobi',
  'Sydney',
  'Ushuaia',
  'Naha',
  'Anchorage',
];

describe('curated city list', () => {
  it('contains every city docs/milestones.md M2 requires', () => {
    const names = CITIES.map((city) => city.name);
    for (const required of REQUIRED_NAMES) {
      expect(names).toContain(required);
    }
  });

  it('has unique ids resolvable through cityById', () => {
    const ids = CITIES.map((city) => city.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const city of CITIES) {
      expect(cityById(city.id)).toBe(city);
    }
    expect(cityById('atlantis')).toBeUndefined();
  });

  it('defaults to Tampere against Niigata', () => {
    expect(cityById(DEFAULT_CITY_A_ID)?.name).toBe('Tampere');
    expect(cityById(DEFAULT_CITY_B_ID)?.name).toBe('Niigata');
  });

  it('carries plausible coordinates, a real IANA zone, and a reason for being listed', () => {
    for (const city of CITIES) {
      expect(Math.abs(city.latitudeDeg), city.id).toBeLessThan(90);
      expect(Math.abs(city.longitudeDeg), city.id).toBeLessThanOrEqual(180);
      expect(city.country, city.id).not.toBe('');
      expect(city.note.length, city.id).toBeGreaterThan(20);
      expect(
        () => new Intl.DateTimeFormat('en-US', { timeZone: city.timeZone }),
        city.id,
      ).not.toThrow();
    }
  });
});

export interface City {
  readonly id: string;
  /** English name, as rendered in the city selects. */
  readonly name: string;
  readonly country: string;
  readonly latitudeDeg: number;
  /** Positive east. */
  readonly longitudeDeg: number;
  /** IANA zone. The browser resolves it; we never ship a tz database (CLAUDE.md rule 5). */
  readonly timeZone: string;
  /** Why this city earns a slot in a curated list — see docs/product-spec.md, Non-goals. */
  readonly note: string;
}

/** North to south: the selects render them in array order, and the order is itself the lesson. */
export const CITIES: readonly City[] = [
  {
    id: 'tromso',
    name: 'Tromsø',
    country: 'Norway',
    latitudeDeg: 69.6492,
    longitudeDeg: 18.9553,
    timeZone: 'Europe/Oslo',
    note: 'Inside the Arctic Circle, so the Sun genuinely fails to rise in December and to set in June.',
  },
  {
    id: 'reykjavik',
    name: 'Reykjavík',
    country: 'Iceland',
    latitudeDeg: 64.1466,
    longitudeDeg: -21.9426,
    timeZone: 'Atlantic/Reykjavik',
    note: 'Still short of the Arctic Circle, yet swings from 4h of daylight to 21h.',
  },
  {
    id: 'tampere',
    name: 'Tampere',
    country: 'Finland',
    latitudeDeg: 61.4978,
    longitudeDeg: 23.761,
    timeZone: 'Europe/Helsinki',
    note: 'The default city A: 5h of daylight in December, 19h and white nights in June.',
  },
  {
    id: 'anchorage',
    name: 'Anchorage',
    country: 'United States',
    latitudeDeg: 61.2181,
    longitudeDeg: -149.9003,
    timeZone: 'America/Anchorage',
    note: "Tampere's latitude on the other side of the planet — same geometry, a very different clock.",
  },
  {
    id: 'helsinki',
    name: 'Helsinki',
    country: 'Finland',
    latitudeDeg: 60.1699,
    longitudeDeg: 24.9384,
    timeZone: 'Europe/Helsinki',
    note: 'Barely a degree south of Tampere and already half an hour lighter at midwinter.',
  },
  {
    id: 'niigata',
    name: 'Niigata',
    country: 'Japan',
    latitudeDeg: 37.9026,
    longitudeDeg: 139.0236,
    timeZone: 'Asia/Tokyo',
    note: 'The default city B: east of the 135°E anchor of Japan Standard Time, so solar noon lands near 11:44.',
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    country: 'Japan',
    latitudeDeg: 35.6762,
    longitudeDeg: 139.6503,
    timeZone: 'Asia/Tokyo',
    note: 'The familiar mid-latitude reference, and the reason the 135°E anchor looks arbitrary.',
  },
  {
    id: 'naha',
    name: 'Naha',
    country: 'Japan',
    latitudeDeg: 26.2124,
    longitudeDeg: 127.6809,
    timeZone: 'Asia/Tokyo',
    note: 'Same time zone as Niigata but west of the anchor, so its solar noon runs late instead of early.',
  },
  {
    id: 'singapore',
    name: 'Singapore',
    country: 'Singapore',
    latitudeDeg: 1.3521,
    longitudeDeg: 103.8198,
    timeZone: 'Asia/Singapore',
    note: 'On the equator: about 12h of daylight every day of the year, whatever the tilt.',
  },
  {
    id: 'nairobi',
    name: 'Nairobi',
    country: 'Kenya',
    latitudeDeg: -1.2921,
    longitudeDeg: 36.8219,
    timeZone: 'Africa/Nairobi',
    note: "Singapore's mirror just south of the equator — inverted seasons, equally flat curve.",
  },
  {
    id: 'sydney',
    name: 'Sydney',
    country: 'Australia',
    latitudeDeg: -33.8688,
    longitudeDeg: 151.2093,
    timeZone: 'Australia/Sydney',
    note: 'Southern hemisphere: the whole chart flips, with the longest day in December.',
  },
  {
    id: 'ushuaia',
    name: 'Ushuaia',
    country: 'Argentina',
    latitudeDeg: -54.8019,
    longitudeDeg: -68.303,
    timeZone: 'America/Argentina/Ushuaia',
    note: 'The strongest southern seasonality a real city offers: 17h in December, 7h in June.',
  },
];

export const DEFAULT_CITY_A_ID = 'tampere';
export const DEFAULT_CITY_B_ID = 'niigata';

export function cityById(id: string): City | undefined {
  return CITIES.find((city) => city.id === id);
}

import { formatLatitude, formatTilt } from '../lib/format.ts';
import { dayReading, monthlySamples, withSuffix } from '../lib/year/index.ts';
import type { YearSeries } from '../lib/year/index.ts';
import { el } from './dom.ts';

const COLUMNS = ['Sunrise', 'Sunset', 'Day length'] as const;

export interface DataTable {
  readonly element: HTMLElement;
  update(a: YearSeries, b: YearSeries): void;
}

function headerCell(text: string, scope: string, span?: number): HTMLTableCellElement {
  const cell = el('th', undefined, text);
  cell.scope = scope;
  if (span !== undefined) cell.colSpan = span;
  return cell;
}

function headRows(a: YearSeries, b: YearSeries): HTMLTableRowElement[] {
  const cities = el('tr');
  const month = headerCell('Month', 'col');
  month.rowSpan = 2;
  cities.append(
    month,
    ...[a, b].map((series) =>
      headerCell(
        `${series.city.name} (${formatLatitude(series.city.latitudeDeg)})`,
        'colgroup',
        COLUMNS.length,
      ),
    ),
  );

  const columns = el('tr');
  columns.append(...[...COLUMNS, ...COLUMNS].map((column) => headerCell(column, 'col')));

  return [cities, columns];
}

/**
 * The chart as a table, hidden from sight but not from assistive technology or from a crawler
 * (docs/ui-spec.md). Every cell comes from `dayReading`, so it cannot drift from the numbers the
 * visible readout shows for the same date. Each time carries its own zone, because the
 * abbreviation itself changes at the DST step the chart draws as a jump.
 */
export function createDataTable(initialA: YearSeries, initialB: YearSeries): DataTable {
  const caption = el('caption');
  const head = el('thead');
  const body = el('tbody');

  // A table cannot be squeezed below the width of its own content, so it is the wrapper that is
  // hidden: hiding the table itself would leave the page a thousand pixels wider than the phone.
  const table = el('table');
  table.append(caption, head, body);

  const wrapper = el('div', 'visually-hidden');
  wrapper.append(table);

  const update = (a: YearSeries, b: YearSeries): void => {
    const clock = a.clockMode === 'solar' ? 'solar time' : 'local clock time';
    caption.textContent =
      `Mid-month sunrise, sunset and day length in ${a.city.name} and ${b.city.name} through ` +
      `${a.year}, in ${clock}, at ${formatTilt(a.obliquityDeg)} axial tilt.`;

    head.replaceChildren(...headRows(a, b));

    const byMonth = new Map(monthlySamples(b).map((sample) => [sample.month, sample]));

    body.replaceChildren(
      ...monthlySamples(a).map((sample) => {
        const row = el('tr');
        row.append(headerCell(sample.label, 'row'));

        for (const [series, entry] of [
          [a, sample],
          [b, byMonth.get(sample.month)],
        ] as const) {
          if (!entry) continue;
          const reading = dayReading(series.city, entry.day, series.clockMode);
          row.append(
            el('td', undefined, withSuffix(reading.sunrise, reading.suffix)),
            el('td', undefined, withSuffix(reading.sunset, reading.suffix)),
            el('td', undefined, reading.dayLength),
          );
        }

        return row;
      }),
    );
  };

  update(initialA, initialB);
  return { element: wrapper, update };
}

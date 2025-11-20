import assert from 'assert';
import { describe, it } from 'node:test';
import { guessTimestampColumn, inferCadenceMinutes, parseNsPowerSmocRows, resolveKnownXmlMapping } from '../src/lib/parse.js';
import type { CsvPreview } from '../src/types.js';

function formatLocalTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const suffix = hours >= 12 ? 'p.m.' : 'a.m.';
  hours = hours % 12 || 12;
  const hourString = String(hours).padStart(2, '0');
  return `${year}-${month}-${day} ${hourString}:${minutes}:${seconds} ${suffix}`;
}

function buildSmocPreview(
  columns: string[],
  intervalMinutes: number,
  days: number,
  ampsA: number,
  ampsC?: number
): CsvPreview {
  const rows: Record<string, string>[] = [];
  const totalIntervals = Math.floor((days * 24 * 60) / intervalMinutes);
  const start = new Date('2024-01-01T00:00:00');
  for (let i = 0; i < totalIntervals; i += 1) {
    const timestamp = new Date(start.getTime() + i * intervalMinutes * 60_000);
    const record: Record<string, string> = {};
    columns.forEach((column) => {
      if (column.toLowerCase().includes('timestamp')) {
        record[column] = formatLocalTimestamp(timestamp);
      } else if (column.toLowerCase().includes('max a(a)')) {
        record[column] = (ampsA + (i % 3)).toString();
      } else if (column.toLowerCase().includes('max a(c)')) {
        record[column] = ampsC !== undefined ? (ampsC + (i % 2)).toString() : '';
      } else {
        record[column] = 'spare';
      }
    });
    rows.push(record);
  }
  return { columns, rows };
}

describe('timestamp detection', () => {
  it('finds timestamp when not first column', () => {
    const preview: CsvPreview = {
      columns: ['kWh', 'reading time', 'value'],
      rows: [
        { kWh: '1.2', 'reading time': '2024-01-01T00:00:00Z', value: '3.3' },
        { kWh: '1.4', 'reading time': '2024-01-01T00:15:00Z', value: '3.7' }
      ]
    };
    const detected = guessTimestampColumn(preview);
    assert.equal(detected, 'reading time');
  });
});

describe('XML auto-mapping detection', () => {
  it('returns a mapping for canonical Green Button previews', () => {
    const preview: CsvPreview = {
      columns: ['timestamp', 'energy_kwh', 'amps'],
      rows: [
        { timestamp: '2024-01-01T00:00:00Z', energy_kwh: '0.5', amps: '4.2' },
        { timestamp: '2024-01-01T01:00:00Z', energy_kwh: '0.4', amps: '3.9' }
      ]
    };

    const mapping = resolveKnownXmlMapping(preview);
    assert.ok(mapping);
    assert.equal(mapping?.timeColumn, 'timestamp');
    assert.equal(mapping?.valueColumn, 'energy_kwh');
    assert.equal(mapping?.unit, 'kWh');
    assert.equal(mapping?.voltage, 240);
  });

  it('returns null when timestamp or value columns cannot be inferred', () => {
    const preview: CsvPreview = {
      columns: ['foo', 'bar'],
      rows: [{ foo: 'a', bar: 'b' }]
    };

    const mapping = resolveKnownXmlMapping(preview);
    assert.equal(mapping, null);
  });
});

describe('cadence inference', () => {
  it('uses the dominant interval across many samples', () => {
    const timestamps = [0, 15, 30, 45, 60, 75, 90].map(
      (offset) => new Date(new Date('2024-01-01T00:00:00Z').getTime() + offset * 60_000)
    );
    const cadence = inferCadenceMinutes(timestamps);
    assert.equal(cadence, 15);
  });
});

describe('NS Power SMOC parser', () => {
  it('parses typical files using the max amps across phases', () => {
    const preview = buildSmocPreview(
      ['Max A(c)', 'Interval Period End Timestamp Local', 'Max A(a)'],
      60,
      365,
      12,
      8
    );
    const result = parseNsPowerSmocRows(preview.columns, preview.rows);
    assert.equal(result.cadenceMinutes, 60);
    assert.equal(result.unit, 'Amps');
    assert.ok(result.maxAmps > 12);
  });

  it('falls back to a single Max A column when only one exists', () => {
    const preview = buildSmocPreview(['Interval Period End Timestamp Local', 'Max A(a)'], 60, 365, 15);
    const result = parseNsPowerSmocRows(preview.columns, preview.rows);
    assert.equal(result.cadenceMinutes, 60);
    assert.equal(result.unit, 'Amps');
  });

  it('tolerates occasional missing intervals that line up with the detected cadence', () => {
    const preview = buildSmocPreview(
      ['Interval Period End Timestamp Local', 'Max A(a)', 'Max A(c)'],
      15,
      370,
      10,
      12
    );

    const trimmedRows = preview.rows.filter((_, index) => (index + 1) % 50 !== 0);
    const result = parseNsPowerSmocRows(preview.columns, trimmedRows);

    assert.equal(result.cadenceMinutes, 15);
    assert.ok(result.data.length < preview.rows.length);
  });

  it('merges duplicate timestamps by keeping the highest amperage', () => {
    const preview = buildSmocPreview(
      ['Interval Period End Timestamp Local', 'Max A(a)', 'Max A(c)'],
      15,
      370,
      8,
      10
    );

    const duplicatedRows = [...preview.rows];
    duplicatedRows.push({ ...preview.rows[preview.rows.length - 1], 'Max A(a)': '30' });
    duplicatedRows.push({ ...preview.rows[preview.rows.length - 3], 'Max A(c)': '25' });

    const result = parseNsPowerSmocRows(preview.columns, duplicatedRows);

    const uniqueTimestamps = new Set(result.data.map((item) => item.timestamp.getTime()));

    assert.equal(result.data.length, uniqueTimestamps.size);
    assert.ok(result.maxAmps >= 30);
  });

  it('throws on malformed timestamps', () => {
    const preview: CsvPreview = {
      columns: ['Interval Period End Timestamp Local', 'Max A(a)', 'Max A(c)'],
      rows: [
        {
          'Interval Period End Timestamp Local': 'not-a-date',
          'Max A(a)': '10',
          'Max A(c)': '12'
        }
      ]
    };

    assert.throws(() => parseNsPowerSmocRows(preview.columns, preview.rows));
  });
});

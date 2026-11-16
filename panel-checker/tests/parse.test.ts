import assert from 'assert';
import { describe, it } from 'node:test';
import {
  buildGreenButtonPreview,
  computeDemandStats,
  guessTimestampColumn,
  guessValueColumn,
  inferCadenceMinutes,
  mapRecords,
  parseCsv,
  parseNsPowerSmocRows,
  resolveKnownXmlMapping,
  tryComputeDemandStats,
  type GreenButtonFeed,
  type GreenButtonReading
} from '../src/lib/parse.js';
import type { CsvPreview, IntervalDatum } from '../src/types.js';

const HOURS_PER_YEAR = 365 * 24;

function hourlyReadings(startSeconds: number, count: number, value: number): GreenButtonReading[] {
  return Array.from({ length: count }, (_, index) => ({ start: startSeconds + index * 3600, value }));
}

function peakAmps(preview: CsvPreview): number {
  return preview.rows.reduce((max, row) => Math.max(max, Number(row.amps)), 0);
}

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

describe('value column detection', () => {
  it('prefers energy headers over numeric account or meter numbers', () => {
    const preview: CsvPreview = {
      columns: ['Account Number', 'Interval Start Date/Time', 'Net Consumption (kWh)'],
      rows: [
        { 'Account Number': '1234567', 'Interval Start Date/Time': '2024-01-01 00:00', 'Net Consumption (kWh)': '0.52' },
        { 'Account Number': '1234567', 'Interval Start Date/Time': '2024-01-01 01:00', 'Net Consumption (kWh)': '' }
      ]
    };
    assert.equal(guessValueColumn(preview, 'Interval Start Date/Time'), 'Net Consumption (kWh)');
  });

  it('skips identifier columns when no energy header exists', () => {
    const preview: CsvPreview = {
      columns: ['Meter Number', 'Timestamp', 'Reading'],
      rows: [
        { 'Meter Number': '998877', Timestamp: '2024-01-01 00:00', Reading: '1.1' },
        { 'Meter Number': '998877', Timestamp: '2024-01-01 01:00', Reading: '0.9' }
      ]
    };
    assert.equal(guessValueColumn(preview, 'Timestamp'), 'Reading');
  });
});

describe('CSV parsing', () => {
  it('ignores extra trailing fields beyond the header row', () => {
    const preview = parseCsv('timestamp,kWh\n2024-01-01 00:00,0.5,\n2024-01-01 01:00,0.7,,\n');
    assert.deepEqual(preview.columns, ['timestamp', 'kWh']);
    assert.equal(preview.rows[1].kWh, '0.7');
    assert.ok(!('__parsed_extra' in preview.rows[0]));
  });
});

describe('record mapping', () => {
  it('skips rows with invalid timestamps such as a trailing totals row', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const rows = Array.from({ length: HOURS_PER_YEAR }, (_, index) => ({
      time: new Date(start + index * 3_600_000).toISOString(),
      kwh: '1'
    }));
    rows.push({ time: 'Total', kwh: String(HOURS_PER_YEAR) });

    const result = mapRecords({ columns: ['time', 'kwh'], rows }, { timeColumn: 'time', valueColumn: 'kwh', unit: 'kWh', voltage: 240 });
    assert.equal(result.data.length, HOURS_PER_YEAR);
    assert.ok(result.data.every((item) => !Number.isNaN(item.timestamp.getTime())));
    assert.equal(result.cadenceMinutes, 60);
  });
});

describe('Green Button feeds', () => {
  const start = Date.UTC(2024, 0, 1, 5) / 1000;
  const delivered = { flowDirection: 1, accumulationBehaviour: 4, intervalLength: 3600, powerOfTenMultiplier: -3 };

  it('accepts exactly one year of hourly readings', () => {
    const readings = hourlyReadings(start, HOURS_PER_YEAR, 1_000_000);
    const feed: GreenButtonFeed = { tzOffsetSeconds: -18000, streams: [{ readingType: delivered, readings }], allReadings: readings, firstMultiplier: -3 };
    assert.equal(buildGreenButtonPreview(feed).rows.length, HOURS_PER_YEAR);
  });

  it('uses only the delivered interval stream and its multiplier', () => {
    const register = hourlyReadings(start, HOURS_PER_YEAR, 95_000_000);
    const net = hourlyReadings(start, HOURS_PER_YEAR, 500_000);
    const forward = hourlyReadings(start, HOURS_PER_YEAR, 2_000_000);
    const feed: GreenButtonFeed = {
      tzOffsetSeconds: -18000,
      streams: [
        { readingType: { flowDirection: 1, accumulationBehaviour: 1, intervalLength: 86400, powerOfTenMultiplier: 0 }, readings: register },
        { readingType: { ...delivered, flowDirection: 4 }, readings: net },
        { readingType: delivered, readings: forward }
      ],
      allReadings: [...register, ...net, ...forward],
      firstMultiplier: 0
    };

    const preview = buildGreenButtonPreview(feed);
    assert.equal(preview.rows.length, HOURS_PER_YEAR);
    // 2,000,000 x 10^-3 Wh = 2 kWh per hour -> 2 kW / 240 V = 8.33 A
    assert.equal(peakAmps(preview), 8.33);
  });

  it('falls back to every reading when no delivered interval stream is linked', () => {
    const readings = hourlyReadings(start, HOURS_PER_YEAR, 1_200_000);
    const feed: GreenButtonFeed = { tzOffsetSeconds: -18000, streams: [], allReadings: readings, firstMultiplier: -3 };
    assert.equal(peakAmps(buildGreenButtonPreview(feed)), 5);
  });

  it('keeps true UTC instants and aligns hourly rows to local half-hour zones', () => {
    // Newfoundland (UTC-3:30): local midnight is 03:30 UTC.
    const nlStart = Date.UTC(2024, 0, 1, 3, 30) / 1000;
    const readings = hourlyReadings(nlStart, HOURS_PER_YEAR, 1_000_000);
    const feed: GreenButtonFeed = { tzOffsetSeconds: -12600, streams: [{ readingType: delivered, readings }], allReadings: readings, firstMultiplier: -3 };

    const preview = buildGreenButtonPreview(feed);
    assert.equal(preview.rows.length, HOURS_PER_YEAR);
    assert.equal(preview.rows[0].timestamp, '2024-01-01T03:30:00.000Z');
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

describe('demand statistics for display', () => {
  it('returns null instead of throwing when cadence cannot be validated', () => {
    const records: IntervalDatum[] = [0, 7, 20, 26].map((offset) => ({
      timestamp: new Date(Date.UTC(2024, 0, 1, 0, offset)),
      value: 1,
      unit: 'kWh',
      amps: 10,
      voltage: 240,
      intervalMinutes: 15
    }));

    assert.throws(() => computeDemandStats(records));
    assert.equal(tryComputeDemandStats(records), null);
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

import { z } from 'zod';
import Papa from 'papaparse';
import { ColumnMapping, CsvPreview, IntervalDatum, IntervalUnit } from '../types';
import { toIntervalDatum } from './units';
import { loadXlsx, type ExcelDate, type SheetDataModule } from './xlsxLoader';

const ACCEPTED_CADENCE = [15, 30, 60];
const MAX_CADENCE_SAMPLE = 50;
const CADENCE_TOLERANCE_MINUTES = 1;
const MS_PER_MINUTE = 60_000;
const MS_PER_YEAR = 365 * 24 * 60 * MS_PER_MINUTE;
const ESPI_NS = 'http://naesb.org/espi';
const MAX_EXCEL_ROWS = 100_000;

const TIMESTAMP_HEADER_PATTERNS = [
  /timestamp/i,
  /^time$/i,
  /^date$/i,
  /\btime\b/i,
  /date\s*time/i,
  /interval.*(start|end)/i,
  /(period|interval).*end/i,
  /datetime/i
];

const rowSchema = z.record(z.string(), z.string().optional());

export type FileFormat = 'csv' | 'excel' | 'xml';

export interface ExcelParseResult {
  preview: CsvPreview;
  warning?: string;
}

export function detectFileFormat(name: string, mime: string): FileFormat | null {
  const loweredName = name.toLowerCase();
  const loweredType = mime.toLowerCase();
  if (loweredName.endsWith('.csv') || loweredType.includes('csv')) {
    return 'csv';
  }
  if (
    loweredName.endsWith('.xlsx') ||
    loweredName.endsWith('.xls') ||
    loweredType.includes('spreadsheetml') ||
    loweredType.includes('excel')
  ) {
    return 'excel';
  }
  if (loweredName.endsWith('.xml') || loweredType.includes('xml')) {
    return 'xml';
  }
  return null;
}

export function parseCsv(text: string): CsvPreview {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true
  });

  const rows: Record<string, string | undefined>[] = [];
  parsed.data.forEach((row) => {
    const safeRow = rowSchema.parse(row);
    rows.push(safeRow);
  });

  const columns = parsed.meta.fields ?? [];
  if (!columns.length) {
    throw new Error('No headers detected. Add column names to the first row.');
  }
  return { columns, rows };
}

export async function parseExcel(buffer: ArrayBuffer): Promise<ExcelParseResult> {
  const xlsx = await loadXlsx();
  const workbook = xlsx.read(buffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Workbook did not contain any worksheets.');
  }
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) {
    throw new Error('Worksheet data could not be read.');
  }

  const rows = xlsx.utils.sheet_to_json<(string | number | Date | null | undefined)[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: false
  });

  if (!rows.length) {
    throw new Error('Worksheet is empty.');
  }

  const headerRow: Array<string | number | Date | null | undefined> = Array.isArray(rows[0]) ? rows[0] : [];
  const columns = ensureUniqueHeaders(
    headerRow.map((cell: string | number | Date | null | undefined, index: number) => {
      if (cell === null || cell === undefined) {
        return `Column ${index + 1}`;
      }
      if (cell instanceof Date) {
        return cell.toISOString();
      }
      const normalized = cell.toString().trim();
      return normalized || `Column ${index + 1}`;
    })
  );
  if (!columns.length) {
    throw new Error('The first row must include headers.');
  }

  const dataRows = rows.slice(1);
  const limitedRows = dataRows.slice(0, MAX_EXCEL_ROWS);
  const warning =
    dataRows.length > MAX_EXCEL_ROWS
      ? `Only the first ${MAX_EXCEL_ROWS.toLocaleString()} rows were processed to keep the browser responsive on GitHub Pages.`
      : undefined;

  const timestampColumn = findTimestampColumnIndex(columns, limitedRows, xlsx);
  if (timestampColumn === null) {
    throw new Error(
      'Could not find a timestamp column. Label the time field clearly (e.g., "Timestamp"), or ensure one column contains parseable dates.'
    );
  }

  const parsedRows: Record<string, string | undefined>[] = [];
  limitedRows.forEach((row: Array<string | number | Date | null | undefined>) => {
    if (!Array.isArray(row) || !row.length) {
      return;
    }
    const parsedTimestamp = parseTimestampValue(row[timestampColumn], xlsx);
    if (!parsedTimestamp) {
      return;
    }
    const hasNumericValue = columns.some((_, index) => index !== timestampColumn && isNumericLike(row[index]));
    if (!hasNumericValue) {
      return;
    }

    const record: Record<string, string | undefined> = {};
    columns.forEach((column, index) => {
      if (index === timestampColumn) {
        record[column] = formatDateToIso(parsedTimestamp);
        return;
      }
      const normalized = normalizeValueCell(row[index]);
      if (normalized !== undefined) {
        record[column] = normalized;
      }
    });
    parsedRows.push(record);
  });

  if (!parsedRows.length) {
    throw new Error('No usable rows were found in the first worksheet.');
  }

  return { preview: { columns, rows: parsedRows }, warning };
}

function findTimestampColumnIndex(
  columns: string[],
  rows: Array<(string | number | Date | null | undefined)[]>,
  xlsx?: SheetDataModule
): number | null {
  const headerMatch = columns.findIndex((column) => looksLikeTimestampHeader(column));
  if (headerMatch >= 0) {
    return headerMatch;
  }

  const sample = rows.slice(0, MAX_CADENCE_SAMPLE);
  const parseCounts = columns.map(() => 0);
  sample.forEach((row) => {
    if (!Array.isArray(row)) {
      return;
    }
    columns.forEach((_, index) => {
      const parsed = parseTimestampValue(row[index], xlsx);
      if (parsed) {
        parseCounts[index] += 1;
      }
    });
  });

  const maxCount = Math.max(...parseCounts);
  if (maxCount === 0) {
    return null;
  }

  const threshold = Math.max(3, Math.ceil(sample.length * 0.5));
  const strongCandidate = parseCounts.findIndex((count) => count >= threshold);
  if (strongCandidate >= 0) {
    return strongCandidate;
  }

  const fallbackIndex = parseCounts.findIndex((count) => count === maxCount);
  return fallbackIndex >= 0 ? fallbackIndex : null;
}

function looksLikeTimestampHeader(header: string): boolean {
  const normalized = header?.trim();
  if (!normalized) {
    return false;
  }
  return TIMESTAMP_HEADER_PATTERNS.some((pattern) => pattern.test(normalized));
}

function parseTimestampValue(value: unknown, xlsx?: SheetDataModule): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value) && xlsx) {
    return excelSerialDateToDate(value, xlsx.SSF.parse_date_code);
  }
  if (typeof value === 'string') {
    return parseTimestampString(value);
  }
  return null;
}

function excelSerialDateToDate(value: number, parseDate: (num: number) => ExcelDate | null): Date | null {
  const parsed = parseDate(value);
  if (!parsed) {
    return null;
  }
  const milliseconds = Math.round(((parsed.S ?? 0) % 1) * 1000);
  const date = new Date(
    Date.UTC(
      parsed.y ?? 0,
      Math.max(0, (parsed.m ?? 1) - 1),
      parsed.d ?? 1,
      parsed.H ?? 0,
      parsed.M ?? 0,
      Math.floor(parsed.S ?? 0),
      milliseconds
    )
  );
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

function parseTimestampString(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const amPmNormalized = trimmed.replace(/\b(a\.m\.?|p\.m\.?|am|pm)\b/gi, (match) =>
    match.toLowerCase().startsWith('a') ? 'AM' : 'PM'
  );
  const collapsed = amPmNormalized.replace(/\s+/g, ' ');
  const parsed = new Date(collapsed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }
  return null;
}

function formatDateToIso(date: Date): string | undefined {
  if (!date || Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toISOString();
}

function isNumericLike(value: unknown): boolean {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return false;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed);
  }
  return false;
}

function normalizeValueCell(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toString() : undefined;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
  return undefined;
}

export function ensureUniqueHeaders(raw: string[]): string[] {
  const counts = new Map<string, number>();
  return raw.map((value, index) => {
    const base = value?.trim() || `Column ${index + 1}`;
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    return count === 0 ? base : `${base} (${count + 1})`;
  });
}

export function guessTimestampColumn(preview: CsvPreview): string | null {
  const headerMatch = preview.columns.find((column) => looksLikeTimestampHeader(column));
  if (headerMatch) {
    return headerMatch;
  }

  const sample = preview.rows.slice(0, MAX_CADENCE_SAMPLE);
  const counts: number[] = preview.columns.map(() => 0);
  sample.forEach((row: Record<string, string | undefined>) => {
    preview.columns.forEach((column: string, index: number) => {
      const value = row[column];
      if (value && parseTimestampString(value)) {
        counts[index] += 1;
      }
    });
  });

  const maxCount = Math.max(...counts);
  if (maxCount === 0) {
    return null;
  }
  const threshold = Math.max(3, Math.ceil(sample.length * 0.5));
  const strongIndex = counts.findIndex((count) => count >= threshold);
  const index = strongIndex >= 0 ? strongIndex : counts.findIndex((count) => count === maxCount);
  return index >= 0 ? preview.columns[index] : null;
}

export function guessValueColumn(preview: CsvPreview, timestampColumn?: string): string | null {
  const sample = preview.rows.slice(0, MAX_CADENCE_SAMPLE);
  const counts: number[] = preview.columns.map((column: string) => {
    if (column === timestampColumn) {
      return 0;
    }
    let numericCount = 0;
    sample.forEach((row: Record<string, string | undefined>) => {
      if (isNumericLike(row[column])) {
        numericCount += 1;
      }
    });
    return numericCount;
  });

  const maxCount = Math.max(...counts);
  if (maxCount === 0) {
    const fallback = preview.columns.find((column) => column !== timestampColumn);
    return fallback ?? null;
  }
  const index = counts.findIndex((count: number) => count === maxCount);
  return index >= 0 ? preview.columns[index] : null;
}

export function parseGreenButtonXml(text: string): CsvPreview {
  const doc = parseXml(text);
  const readings = Array.from(doc.getElementsByTagNameNS(ESPI_NS, 'IntervalReading'));
  if (!readings.length) {
    throw new Error('No valid data found in the XML file.');
  }

  const tzOffsetSeconds = Number(doc.getElementsByTagNameNS(ESPI_NS, 'tzOffset')[0]?.textContent ?? '0');
  const multiplierValue = Number(doc.getElementsByTagNameNS(ESPI_NS, 'powerOfTenMultiplier')[0]?.textContent ?? '0');
  const scaleFactor = multiplierValue === -6 ? 10 ** multiplierValue : (10 ** multiplierValue) / 1000;

  const seenTimestamps = new Set<number>();
  const samples: Array<{ timestamp: Date; rawValue: number }> = [];

  readings.forEach((node) => {
    const startSeconds = Number(node.getElementsByTagNameNS(ESPI_NS, 'start')[0]?.textContent ?? '');
    const rawValue = Number(node.getElementsByTagNameNS(ESPI_NS, 'value')[0]?.textContent ?? '');
    if (!Number.isFinite(startSeconds) || !Number.isFinite(rawValue)) {
      return;
    }
    const localizedSeconds = startSeconds + tzOffsetSeconds;
    const timestampMs = localizedSeconds * 1000;
    if (seenTimestamps.has(timestampMs)) {
      return;
    }
    seenTimestamps.add(timestampMs);
    samples.push({ timestamp: new Date(timestampMs), rawValue });
  });

  if (!samples.length) {
    throw new Error('No valid data found in the XML file.');
  }

  samples.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const coverageDays =
    (samples[samples.length - 1].timestamp.getTime() - samples[0].timestamp.getTime()) / (1000 * 60 * 60 * 24);
  if (coverageDays < 365) {
    throw new Error('Not enough data for analysis. At least one year of data is required.');
  }

  const deltaSeconds =
    samples.length > 1
      ? (samples[1].timestamp.getTime() - samples[0].timestamp.getTime()) / 1000
      : 60 * 60;
  if (deltaSeconds > 60 * 60) {
    throw new Error(`Data timestep is larger than 1 hour: ${Math.round(deltaSeconds / 60)} minutes.`);
  }

  const filteredSamples =
    deltaSeconds === 60 * 60
      ? samples.filter((sample) => sample.timestamp.getUTCMinutes() === 0 && sample.timestamp.getUTCSeconds() === 0)
      : samples;

  const rows = filteredSamples.map((entry) => {
    const kwh = entry.rawValue * scaleFactor;
    const amps = (kwh / (deltaSeconds / 3600) * 1000) / 240;
    return {
      timestamp: entry.timestamp.toISOString(),
      energy_kwh: kwh.toFixed(4),
      amps: amps.toFixed(2)
    };
  });

  return { columns: ['timestamp', 'energy_kwh', 'amps'], rows };
}

export interface MappingResult {
  data: IntervalDatum[];
  cadenceMinutes: number;
  unit: IntervalUnit;
  coverageStart: Date;
  coverageEnd: Date;
  maxAmps: number;
}

export function mapRecords(preview: CsvPreview, mapping: ColumnMapping): MappingResult {
  const raw: Array<{ timestamp: Date; value: number }> = [];

  preview.rows.forEach((row: Record<string, string | undefined>) => {
    const timestampRaw = row[mapping.timeColumn];
    const valueRaw = row[mapping.valueColumn];

    if (!timestampRaw || !valueRaw) {
      return;
    }

    const timestamp = new Date(timestampRaw);
    const value = Number(valueRaw);
    if (!Number.isFinite(value)) {
      return;
    }

    raw.push({ timestamp, value });
  });

  raw.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const cadenceMinutes = inferCadenceMinutes(raw.map((row) => row.timestamp));

  const records = raw.map((row) => toIntervalDatum(row.timestamp, row.value, mapping.unit, mapping.voltage, cadenceMinutes));

  const trimmed = enforceYearWindow(records);
  const maxAmps = Math.max(...trimmed.map((item) => item.amps));

  return {
    data: trimmed,
    cadenceMinutes,
    unit: mapping.unit,
    coverageStart: trimmed[0].timestamp,
    coverageEnd: trimmed[trimmed.length - 1].timestamp,
    maxAmps
  };
}

export async function parseNsPowerSmocExcel(buffer: ArrayBuffer): Promise<MappingResult> {
  const xlsx = await loadXlsx();
  const workbook = xlsx.read(buffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Workbook did not contain any worksheets.');
  }
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) {
    throw new Error('Worksheet data could not be read.');
  }

  const rows = xlsx.utils.sheet_to_json<(string | number | Date | null | undefined)[]>(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: false
  });

  if (!rows.length) {
    throw new Error('Worksheet is empty.');
  }

  const headerRow: Array<string | number | Date | null | undefined> = Array.isArray(rows[0]) ? rows[0] : [];
  const columns = ensureUniqueHeaders(
    headerRow.map((cell: string | number | Date | null | undefined, index: number) => {
      if (cell === null || cell === undefined) {
        return `Column ${index + 1}`;
      }
      if (cell instanceof Date) {
        return cell.toISOString();
      }
      const normalized = cell.toString().trim();
      return normalized || `Column ${index + 1}`;
    })
  );
  if (!columns.length) {
    throw new Error('The first row must include headers.');
  }

  const dataRows = rows.slice(1);
  const limitedRows = dataRows.slice(0, MAX_EXCEL_ROWS);

  const series = mapNsPowerRows(columns, limitedRows, xlsx);
  return finalizeNsPowerSeries(series.records, series.cadenceMinutes);
}

export function parseNsPowerSmocRows(
  columns: string[],
  rows: Array<Record<string, string | number | Date | null | undefined>>
): MappingResult {
  const orderedRows = rows.map((row) => columns.map((column) => row[column]));
  const series = mapNsPowerRows(columns, orderedRows, undefined);
  return finalizeNsPowerSeries(series.records, series.cadenceMinutes);
}

function mapNsPowerRows(
  columns: string[],
  rows: Array<(string | number | Date | null | undefined)[]>,
  xlsx: SheetDataModule | undefined
): { records: IntervalDatum[]; cadenceMinutes: number } {
  const columnIndexes = resolveNsPowerColumns(columns, rows, xlsx);
  const series: Array<{ timestamp: Date; amps: number }> = [];

  rows.forEach((row) => {
    if (!Array.isArray(row) || !row.length) {
      return;
    }
    const timestamp = parseTimestampValue(row[columnIndexes.timestamp], xlsx);
    if (!timestamp) {
      return;
    }
    const amps = deriveNsPowerAmps(row, columnIndexes);
    if (amps === null) {
      return;
    }
    series.push({ timestamp, amps });
  });

  if (series.length < 4) {
    throw new Error(
      'No usable NS Power SMOC rows were found. Confirm that timestamp and Max A columns contain valid data.'
    );
  }

  series.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const mergedSeries = mergeDuplicateTimestamps(series);

  const cadenceMinutes = inferCadenceMinutes(mergedSeries.map((entry) => entry.timestamp));
  assertCadenceContinuity(mergedSeries, cadenceMinutes);

  const records = mergedSeries.map((entry) =>
    toIntervalDatum(entry.timestamp, entry.amps, 'Amps', 240, cadenceMinutes)
  );

  return { records, cadenceMinutes };
}

function mergeDuplicateTimestamps(series: Array<{ timestamp: Date; amps: number }>): Array<{ timestamp: Date; amps: number }> {
  const merged: Array<{ timestamp: Date; amps: number }> = [];
  series.forEach((entry) => {
    const last = merged[merged.length - 1];
    if (last && last.timestamp.getTime() === entry.timestamp.getTime()) {
      last.amps = Math.max(last.amps, entry.amps);
    } else {
      merged.push({ ...entry });
    }
  });
  return merged;
}

function finalizeNsPowerSeries(records: IntervalDatum[], cadenceMinutes: number): MappingResult {
  const trimmed = enforceYearWindow(records);
  const maxAmps = Math.max(...trimmed.map((item) => item.amps));

  return {
    data: trimmed,
    cadenceMinutes,
    unit: 'Amps',
    coverageStart: trimmed[0].timestamp,
    coverageEnd: trimmed[trimmed.length - 1].timestamp,
    maxAmps
  };
}

function resolveNsPowerColumns(
  columns: string[],
  rows: Array<(string | number | Date | null | undefined)[]>,
  xlsx: SheetDataModule | undefined
): { timestamp: number; phaseA: number | null; phaseC: number | null } {
  const normalized = columns.map((column) => normalizeNsPowerHeader(column));
  const timestampHeaderMatch = normalized.findIndex((value) => value.includes('intervalperiodendtimestamp'));
  const timestampIndex =
    timestampHeaderMatch >= 0 ? timestampHeaderMatch : findTimestampColumnIndex(columns, rows, xlsx);
  if (timestampIndex === null) {
    throw new Error('Could not find an "Interval Period End Timestamp" column.');
  }

  const phaseA = normalized.findIndex((value) => value.includes('maxaa'));
  const phaseC = normalized.findIndex((value) => value.includes('maxac'));

  if (phaseA < 0 && phaseC < 0) {
    throw new Error('Expected Max A(a) or Max A(c) columns to derive amperage.');
  }

  return { timestamp: timestampIndex, phaseA: phaseA >= 0 ? phaseA : null, phaseC: phaseC >= 0 ? phaseC : null };
}

function normalizeNsPowerHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function deriveNsPowerAmps(
  row: Array<string | number | Date | null | undefined>,
  columns: { timestamp: number; phaseA: number | null; phaseC: number | null }
): number | null {
  const values: number[] = [];
  if (columns.phaseA !== null) {
    const parsed = Number(row[columns.phaseA]);
    if (Number.isFinite(parsed)) {
      values.push(parsed);
    }
  }
  if (columns.phaseC !== null) {
    const parsed = Number(row[columns.phaseC]);
    if (Number.isFinite(parsed)) {
      values.push(parsed);
    }
  }

  if (!values.length) {
    return null;
  }

  return Math.max(...values);
}

function assertCadenceContinuity(series: Array<{ timestamp: Date }>, cadenceMinutes: number) {
  const tolerance = Math.max(CADENCE_TOLERANCE_MINUTES, 1);
  for (let i = 1; i < series.length; i += 1) {
    const deltaMinutes = (series[i].timestamp.getTime() - series[i - 1].timestamp.getTime()) / MS_PER_MINUTE;
    const multiples = Math.max(1, Math.round(deltaMinutes / cadenceMinutes));
    const nearestExpected = multiples * cadenceMinutes;
    if (Math.abs(deltaMinutes - nearestExpected) > tolerance) {
      throw new Error(
        'Detected gaps larger than the expected cadence in the NS Power SMOC data. Fill or explain missing intervals before retrying.'
      );
    }
  }
}

export function validateCadence(records: IntervalDatum[]): { cadenceMinutes: number } {
  return { cadenceMinutes: inferCadenceMinutes(records.map((record) => record.timestamp)) };
}

export function inferCadenceMinutes(dates: Date[]): number {
  if (dates.length < 4) {
    throw new Error('Need at least a few rows with valid timestamps to understand the cadence.');
  }

  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const sample = sorted.slice(0, Math.min(sorted.length, MAX_CADENCE_SAMPLE));

  const deltas: number[] = [];
  for (let i = 1; i < sample.length; i += 1) {
    const delta = (sample[i].getTime() - sample[i - 1].getTime()) / MS_PER_MINUTE;
    if (delta > 0) {
      deltas.push(delta);
    }
  }

  if (!deltas.length) {
    throw new Error('Unable to compute cadence from the first rows. Check for duplicate or missing timestamps.');
  }

  const cadence = mode(deltas.map((delta) => Math.round(delta)));
  if (cadence > 60) {
    throw new Error(`Data timestep is larger than 60 minutes: ${cadence} minutes.`);
  }

  const inconsistent = deltas.some((delta) => {
    const rounded = Math.round(delta);
    const multiples = Math.max(1, Math.round(rounded / cadence));
    const nearestExpected = multiples * cadence;
    return Math.abs(rounded - nearestExpected) > CADENCE_TOLERANCE_MINUTES;
  });
  if (inconsistent) {
    throw new Error('Intervals appear irregular within the first few dozen rows. Check for missing readings or gaps.');
  }

  if (!ACCEPTED_CADENCE.includes(cadence)) {
    throw new Error(
      `We expected ${ACCEPTED_CADENCE.join(', ')}-minute data; detected ${cadence}-minute cadence.`
    );
  }

  return cadence;
}

function enforceYearWindow(records: IntervalDatum[]): IntervalDatum[] {
  if (!records.length) {
    throw new Error('No rows remained after parsing.');
  }
  const intervalMs = records[0].intervalMinutes * MS_PER_MINUTE;
  const startMs = records[0].timestamp.getTime();
  const endMs = records[records.length - 1].timestamp.getTime();
  if (endMs - startMs < MS_PER_YEAR - intervalMs) {
    throw new Error('Upload at least one continuous year of interval data.');
  }
  const cutoff = endMs - MS_PER_YEAR;
  const trimmed = records.filter((record) => record.timestamp.getTime() >= cutoff);
  if (!trimmed.length) {
    throw new Error('No recent data points were found in the last year.');
  }
  const trimmedSpan = trimmed[trimmed.length - 1].timestamp.getTime() - trimmed[0].timestamp.getTime();
  if (trimmedSpan < MS_PER_YEAR - intervalMs) {
    throw new Error('We need data covering the most recent 12 months to proceed.');
  }
  return trimmed;
}

function mode(values: number[]): number {
  const counts = new Map<number, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  let winner = values[0];
  let max = 0;
  counts.forEach((count, value) => {
    if (count > max) {
      max = count;
      winner = value;
    }
  });
  return winner;
}

export function computeDemandStats(records: IntervalDatum[]) {
  if (!records.length) {
    return null;
  }
  const amps = records.map((item) => item.amps).sort((a, b) => a - b);
  const ninetyFifth = percentile(amps, 0.95);
  const max = Math.max(...amps);
  return {
    cadenceMinutes: validateCadence(records).cadenceMinutes,
    maxAmps: max,
    percentile95: ninetyFifth,
    start: records[0].timestamp,
    end: records[records.length - 1].timestamp
  };
}

function percentile(values: number[], pct: number) {
  if (!values.length) return 0;
  const idx = Math.min(values.length - 1, Math.floor(values.length * pct));
  return values[idx];
}

export function parseXml(text: string): Document {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) {
    throw new Error('Uploaded file contains invalid XML.');
  }
  return doc;
}

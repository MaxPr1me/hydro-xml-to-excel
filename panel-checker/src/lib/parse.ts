import { z } from 'zod';
import Papa from 'papaparse';
import { ColumnMapping, CsvPreview, IntervalDatum, IntervalUnit } from '../types';
import { toIntervalDatum } from './units';

const ACCEPTED_CADENCE = [15, 30, 60];
const MS_PER_MINUTE = 60_000;
const MS_PER_YEAR = 365 * 24 * 60 * MS_PER_MINUTE;
const ESPI_NS = 'http://naesb.org/espi';
const ZIP_LOCAL_FILE_HEADER = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY = 0x06054b50;

type ZipEntry = {
  name: string;
  compression: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
};

const rowSchema = z.record(z.string(), z.string().optional());

export type FileFormat = 'csv' | 'excel' | 'xml';

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

export async function parseExcel(buffer: ArrayBuffer): Promise<CsvPreview> {
  const zip = new SimpleZip(buffer);
  const workbookXml = await zip.readText('xl/workbook.xml');
  if (!workbookXml) {
    throw new Error('Workbook metadata is missing.');
  }
  const workbookDoc = parseXml(workbookXml);
  const sheetNode = workbookDoc.getElementsByTagName('sheet')[0];
  if (!sheetNode) {
    throw new Error('Workbook did not contain any worksheets.');
  }
  const relId = sheetNode.getAttribute('r:id') ?? sheetNode.getAttribute('id');
  const relsXml = await zip.readText('xl/_rels/workbook.xml.rels');
  const sheetTarget = resolveSheetTarget(relsXml, relId);
  const worksheetXml = await zip.readText(sheetTarget);
  if (!worksheetXml) {
    throw new Error('Worksheet data could not be read.');
  }
  const sharedStringsXml = await zip.readText('xl/sharedStrings.xml');
  const sharedStrings = sharedStringsXml ? extractSharedStrings(sharedStringsXml) : [];
  const table = extractRowsFromWorksheet(worksheetXml, sharedStrings);
  const csvText = tableToCsv(table);
  return parseCsv(csvText);
}

export function parseGreenButtonXml(text: string): CsvPreview {
  const doc = parseXml(text);
  const readings = Array.from(doc.getElementsByTagNameNS(ESPI_NS, 'IntervalReading'));
  if (!readings.length) {
    throw new Error('No interval readings were found in the XML file.');
  }

  const tzOffsetSeconds = Number(doc.getElementsByTagNameNS(ESPI_NS, 'tzOffset')[0]?.textContent ?? '0');
  const multiplierValue = Number(doc.getElementsByTagNameNS(ESPI_NS, 'powerOfTenMultiplier')[0]?.textContent ?? '0');
  const scaleFactor = multiplierValue === -6 ? 10 ** multiplierValue : (10 ** multiplierValue) / 1000;

  const unique = new Set<number>();
  const samples: Array<{ timestampMs: number; kwh: number }> = [];

  readings.forEach((node) => {
    const startSeconds = Number(node.getElementsByTagNameNS(ESPI_NS, 'start')[0]?.textContent ?? '');
    const rawValue = Number(node.getElementsByTagNameNS(ESPI_NS, 'value')[0]?.textContent ?? '');
    if (!Number.isFinite(startSeconds) || !Number.isFinite(rawValue)) {
      return;
    }
    const localizedSeconds = startSeconds + tzOffsetSeconds;
    const timestampMs = localizedSeconds * 1000;
    if (unique.has(timestampMs)) {
      return;
    }
    unique.add(timestampMs);
    samples.push({ timestampMs, kwh: rawValue * scaleFactor });
  });

  if (samples.length < 2) {
    throw new Error('XML file did not include enough interval readings to analyze.');
  }

  samples.sort((a, b) => a.timestampMs - b.timestampMs);

  const deltas: number[] = [];
  for (let i = 1; i < samples.length; i += 1) {
    const deltaSeconds = (samples[i].timestampMs - samples[i - 1].timestampMs) / 1000;
    if (deltaSeconds > 0) {
      deltas.push(deltaSeconds);
    }
  }

  if (!deltas.length) {
    throw new Error('Unable to determine the timestep of the XML data.');
  }

  const averageDeltaSeconds = Math.round(deltas.reduce((sum, value) => sum + value, 0) / deltas.length);
  if (averageDeltaSeconds > 60 * 60) {
    throw new Error(`Data timestep is larger than one hour (${Math.round(averageDeltaSeconds / 60)} minutes).`);
  }

  const coverageMs = samples[samples.length - 1].timestampMs - samples[0].timestampMs;
  if (coverageMs < MS_PER_YEAR) {
    throw new Error('Upload at least one continuous year of interval data.');
  }

  const rows = samples.map((entry) => ({
    timestamp: new Date(entry.timestampMs).toISOString(),
    energy_kwh: entry.kwh.toFixed(4)
  }));

  return { columns: ['timestamp', 'energy_kwh'], rows };
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

  preview.rows.forEach((row) => {
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

  const tempRecords: IntervalDatum[] = raw.map((row) =>
    toIntervalDatum(row.timestamp, row.value, mapping.unit, mapping.voltage, 15)
  );
  const validated = validateCadence(tempRecords);
  const cadenceMinutes = validated.cadenceMinutes;

  const records = raw.map((row) =>
    toIntervalDatum(row.timestamp, row.value, mapping.unit, mapping.voltage, cadenceMinutes)
  );

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

export function validateCadence(records: IntervalDatum[]): { cadenceMinutes: number } {
  if (records.length < 4) {
    throw new Error('Need at least a few rows to understand the cadence.');
  }

  const diffs: number[] = [];
  for (let i = 1; i < records.length; i += 1) {
    const delta = (records[i].timestamp.getTime() - records[i - 1].timestamp.getTime()) / MS_PER_MINUTE;
    if (delta > 0) {
      diffs.push(Math.round(delta));
    }
  }

  const cadence = mode(diffs);
  if (!ACCEPTED_CADENCE.includes(cadence)) {
    throw new Error(
      `We expected ${ACCEPTED_CADENCE.join(', ')}-minute data; detected ${cadence}-minute cadence.`
    );
  }

  return { cadenceMinutes: cadence };
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

function parseXml(text: string): Document {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) {
    throw new Error('Uploaded file contains invalid XML.');
  }
  return doc;
}

function resolveSheetTarget(relsXml: string | null, relId: string | null): string {
  if (!relsXml || !relId) {
    return 'xl/worksheets/sheet1.xml';
  }
  const doc = parseXml(relsXml);
  const relationships = Array.from(doc.getElementsByTagName('Relationship'));
  const match = relationships.find((node) => node.getAttribute('Id') === relId);
  const target = match?.getAttribute('Target');
  if (!target) {
    return 'xl/worksheets/sheet1.xml';
  }
  const normalized = target.replace(/^\.\//, '').replace(/^\//, '');
  return normalized.startsWith('xl/') ? normalized : `xl/${normalized}`;
}

function extractSharedStrings(xml: string): string[] {
  const doc = parseXml(xml);
  const items = Array.from(doc.getElementsByTagName('si'));
  return items.map((item) => {
    const textNodes = Array.from(item.getElementsByTagName('t'));
    if (textNodes.length) {
      return textNodes.map((node) => node.textContent ?? '').join('');
    }
    return item.textContent ?? '';
  });
}

function extractRowsFromWorksheet(xml: string, sharedStrings: string[]): string[][] {
  const doc = parseXml(xml);
  const rows: string[][] = [];
  const rowNodes = Array.from(doc.getElementsByTagName('row'));
  rowNodes.forEach((rowNode) => {
    const cells = Array.from(rowNode.getElementsByTagName('c'));
    const rowValues: string[] = [];
    let currentCol = 0;
    cells.forEach((cell) => {
      const ref = cell.getAttribute('r') ?? '';
      const colLabel = ref.replace(/\d+/g, '');
      const colIndex = colLabel ? columnLabelToIndex(colLabel) : currentCol;
      while (currentCol < colIndex) {
        rowValues.push('');
        currentCol += 1;
      }
      const type = cell.getAttribute('t');
      const rawValue = cell.getElementsByTagName('v')[0]?.textContent ?? '';
      let finalValue = rawValue;
      if (type === 's') {
        finalValue = sharedStrings[Number(rawValue)] ?? '';
      }
      rowValues.push(finalValue ?? '');
      currentCol += 1;
    });
    rows.push(rowValues);
  });
  return rows;
}

function columnLabelToIndex(label: string): number {
  let result = 0;
  for (let i = 0; i < label.length; i += 1) {
    const charCode = label.charCodeAt(i) - 64; // A -> 1
    result = result * 26 + charCode;
  }
  return Math.max(0, result - 1);
}

function tableToCsv(rows: string[][]): string {
  if (!rows.length) {
    throw new Error('Worksheet is empty.');
  }
  const headers = ensureUniqueHeaders(rows[0] ?? []);
  if (!headers.length) {
    throw new Error('The first row must include headers.');
  }
  const normalizedRows = rows
    .slice(1)
    .map((cells) => headers.map((_, index) => cells[index]?.toString().trim() ?? ''))
    .filter((cells) => cells.some((cell) => cell.length));
  const csvRows = [headers, ...normalizedRows];
  return csvRows
    .map((cells) => cells.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

function ensureUniqueHeaders(raw: string[]): string[] {
  const counts = new Map<string, number>();
  return raw.map((value, index) => {
    const base = value?.trim() || `Column ${index + 1}`;
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    return count === 0 ? base : `${base} (${count + 1})`;
  });
}

class SimpleZip {
  private readonly buffer: ArrayBuffer;

  private readonly view: DataView;

  private readonly entries: ZipEntry[];

  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer;
    this.view = new DataView(buffer);
    this.entries = parseCentralDirectory(buffer);
  }

  async readText(name: string): Promise<string | null> {
    const entry = this.entries.find((item) => item.name === name);
    if (!entry) {
      return null;
    }
    const bytes = await this.inflate(entry);
    return new TextDecoder().decode(bytes);
  }

  private async inflate(entry: ZipEntry): Promise<Uint8Array> {
    const compressed = this.slice(entry);
    if (entry.compression === 0) {
      return compressed;
    }
    if (entry.compression !== 8) {
      throw new Error(`Unsupported XLSX compression method: ${entry.compression}`);
    }
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('Excel parsing requires a browser with DecompressionStream support.');
    }
    const stream = new DecompressionStream('deflate-raw' as CompressionFormat);
    const writer = stream.writable.getWriter();
    await writer.write(compressed as unknown as BufferSource);
    await writer.close();
    const result = await new Response(stream.readable).arrayBuffer();
    return new Uint8Array(result);
  }

  private slice(entry: ZipEntry): Uint8Array {
    const offset = entry.localHeaderOffset;
    const signature = this.view.getUint32(offset, true);
    if (signature !== ZIP_LOCAL_FILE_HEADER) {
      throw new Error('Malformed XLSX archive.');
    }
    const nameLength = this.view.getUint16(offset + 26, true);
    const extraLength = this.view.getUint16(offset + 28, true);
    const dataStart = offset + 30 + nameLength + extraLength;
    const sliced = this.buffer.slice(dataStart, dataStart + entry.compressedSize);
    return new Uint8Array(sliced);
  }
}

function parseCentralDirectory(buffer: ArrayBuffer): ZipEntry[] {
  const view = new DataView(buffer);
  const endOffset = findEndOfCentralDirectory(view);
  const directorySize = view.getUint32(endOffset + 12, true);
  const directoryOffset = view.getUint32(endOffset + 16, true);
  const entries: ZipEntry[] = [];
  let cursor = directoryOffset;
  const decoder = new TextDecoder();
  while (cursor < directoryOffset + directorySize) {
    const signature = view.getUint32(cursor, true);
    if (signature !== ZIP_CENTRAL_DIRECTORY) {
      break;
    }
    const compression = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const uncompressedSize = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localHeaderOffset = view.getUint32(cursor + 42, true);
    const nameBytes = new Uint8Array(buffer, cursor + 46, nameLength);
    const name = decoder.decode(nameBytes);
    entries.push({ name, compression, compressedSize, uncompressedSize, localHeaderOffset });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function findEndOfCentralDirectory(view: DataView): number {
  for (let offset = view.byteLength - 22; offset >= 0; offset -= 1) {
    if (view.getUint32(offset, true) === ZIP_END_OF_CENTRAL_DIRECTORY) {
      return offset;
    }
  }
  throw new Error('Could not read XLSX archive.');
}

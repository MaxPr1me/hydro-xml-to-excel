import { z } from 'zod';
import Papa from 'papaparse';
import { toIntervalDatum } from './units';
const ACCEPTED_CADENCE = [15, 30, 60];
const rowSchema = z.record(z.string(), z.string().optional());
export function parseCsv(text) {
    const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: true
    });
    const rows = [];
    parsed.data.forEach((row) => {
        const safeRow = rowSchema.parse(row);
        rows.push(safeRow);
    });
    const columns = parsed.meta.fields ?? [];
    return { columns, rows };
}
export function mapRecords(preview, mapping) {
    const raw = [];
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
    const tempRecords = raw.map((row) => toIntervalDatum(row.timestamp, row.value, mapping.unit, mapping.voltage, 15));
    const validated = validateCadence(tempRecords);
    const cadenceMinutes = validated.cadenceMinutes;
    const records = raw.map((row) => toIntervalDatum(row.timestamp, row.value, mapping.unit, mapping.voltage, cadenceMinutes));
    return { data: records, cadenceMinutes, unit: mapping.unit };
}
export function validateCadence(records) {
    if (records.length < 4) {
        throw new Error('Need at least a few rows to understand the cadence.');
    }
    const diffs = [];
    for (let i = 1; i < records.length; i += 1) {
        const delta = (records[i].timestamp.getTime() - records[i - 1].timestamp.getTime()) / 60000;
        if (delta > 0) {
            diffs.push(Math.round(delta));
        }
    }
    const cadence = mode(diffs);
    if (!ACCEPTED_CADENCE.includes(cadence)) {
        throw new Error(`We expected ${ACCEPTED_CADENCE.join(', ')}-minute data; detected ${cadence}-minute cadence.`);
    }
    return { cadenceMinutes: cadence };
}
function mode(values) {
    const counts = new Map();
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
export function computeDemandStats(records) {
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
function percentile(values, pct) {
    if (!values.length)
        return 0;
    const idx = Math.min(values.length - 1, Math.floor(values.length * pct));
    return values[idx];
}

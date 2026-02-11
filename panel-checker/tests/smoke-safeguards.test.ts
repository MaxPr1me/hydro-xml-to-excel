import assert from 'assert';
import { describe, it } from 'node:test';
import { calculateVerdict, defaultPanelInputs } from '../src/lib/calc.js';
import { inferCadenceMinutes, mapRecords } from '../src/lib/parse.js';
import type { CsvPreview } from '../src/types.js';

describe('no-functional-change safeguards', () => {
  it('keeps cadence inference at 15 minutes for regular samples', () => {
    const start = new Date('2024-01-01T00:00:00Z').getTime();
    const samples = Array.from({ length: 48 }, (_, i) => new Date(start + i * 15 * 60_000));
    assert.equal(inferCadenceMinutes(samples), 15);
  });

  it('keeps mapped peak amps for known records', () => {
    const preview: CsvPreview = {
      columns: ['time', 'kwh'],
      rows: Array.from({ length: 365 * 24 * 4 }, (_, i) => ({
        time: new Date(new Date('2024-01-01T00:00:00Z').getTime() + i * 15 * 60_000).toISOString(),
        kwh: i === 500 ? '2.0' : '1.0'
      }))
    };

    const mapped = mapRecords(preview, { timeColumn: 'time', valueColumn: 'kwh', unit: 'kWh', voltage: 240 });
    assert.equal(mapped.cadenceMinutes, 15);
    assert.equal(mapped.maxAmps.toFixed(2), '33.33');
  });

  it('keeps panel calculator verdict output unchanged', () => {
    const inputs = defaultPanelInputs();
    inputs.serviceRating = 100;
    inputs.mainBreaker = 100;
    inputs.breakerLoadingPercent = 80;
    inputs.existingLoads = [{ id: '1', name: 'Peak', amps: 65, continuous: false }];
    inputs.newLoads = [{ id: '2', name: 'EV', amps: 20, continuous: true }];

    const verdict = calculateVerdict(inputs, 65);
    assert.equal(verdict.diversifiedLoad, 85);
    assert.equal(verdict.availableMargin, -5);
    assert.equal(verdict.status, 'Upgrade');
  });
});

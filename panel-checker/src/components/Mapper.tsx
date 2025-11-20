import { useEffect, useMemo, useState } from 'react';
import { ColumnMapping, CsvPreview, IntervalUnit } from '../types';
import { guessTimestampColumn, guessValueColumn, mapRecords, type MappingResult } from '../lib/parse';
import InfoBubble from './InfoBubble';
import { textEn } from '../content/text';

interface Props {
  preview: CsvPreview;
  onComplete: (result: MappingResult) => void;
}

const units: IntervalUnit[] = ['kWh', 'kW', 'Amps'];
const voltages: Array<120 | 208 | 240> = [120, 208, 240];

export default function Mapper({ preview, onComplete }: Props) {
  const detectedTimeColumn = useMemo(() => guessTimestampColumn(preview) ?? preview.columns[0] ?? '', [preview]);
  const detectedValueColumn = useMemo(
    () => guessValueColumn(preview, detectedTimeColumn) ?? preview.columns.find((column) => column !== detectedTimeColumn) ?? '',
    [detectedTimeColumn, preview]
  );

  const [mapping, setMapping] = useState<ColumnMapping>({
    timeColumn: detectedTimeColumn,
    valueColumn: detectedValueColumn,
    unit: 'kWh',
    voltage: 240
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMapping((prev) => ({ ...prev, timeColumn: detectedTimeColumn, valueColumn: detectedValueColumn }));
  }, [detectedTimeColumn, detectedValueColumn]);

  const ready = useMemo(
    () => Boolean(mapping.timeColumn && mapping.valueColumn && mapping.unit && mapping.voltage),
    [mapping]
  );

  const handleApply = () => {
    try {
      setError(null);
      const result = mapRecords(preview, mapping);
      onComplete(result);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Map your columns</h2>
          <p className="text-sm text-slate-600">Choose the timestamp and measurement fields.</p>
        </div>
        <InfoBubble label="Help for column mapping">{textEn.help.mapper}</InfoBubble>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Time column
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={mapping.timeColumn}
            onChange={(event) => setMapping((prev) => ({ ...prev, timeColumn: event.target.value }))}
          >
            {preview.columns.map((column) => (
              <option key={column} value={column}>
                {column}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-slate-700">
          Value column
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={mapping.valueColumn}
            onChange={(event) => setMapping((prev) => ({ ...prev, valueColumn: event.target.value }))}
          >
            {preview.columns.map((column) => (
              <option key={column} value={column}>
                {column}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-slate-700">
          Units
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={mapping.unit}
            onChange={(event) => setMapping((prev) => ({ ...prev, unit: event.target.value as IntervalUnit }))}
          >
            {units.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-slate-700">
          System voltage <span className="font-normal text-slate-500">(240 V recommended)</span>
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={mapping.voltage}
            onChange={(event) =>
              setMapping((prev) => ({ ...prev, voltage: Number(event.target.value) as 120 | 208 | 240 }))
            }
          >
            {voltages.map((voltage) => (
              <option key={voltage} value={voltage}>
                {voltage} V
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!ready}
          className="inline-flex items-center rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
          onClick={handleApply}
        >
          Continue
        </button>
        <p className="text-xs text-slate-500">We check cadence (15, 30, or 60 minute) automatically.</p>
      </div>
    </section>
  );
}

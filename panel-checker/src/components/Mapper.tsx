import { useMemo, useState } from 'react';
import { mapRecords } from '../lib/parse';
import { ColumnMapping, CsvPreview, IntervalUnit } from '../types';
import { Locale, textByLocale } from '../content/text';
import ErrorSummary from './ErrorSummary';

interface Props {
  preview: CsvPreview;
  onComplete: (result: ReturnType<typeof mapRecords>) => void;
  locale: Locale;
}

const units: IntervalUnit[] = ['kWh', 'kW', 'Amps'];
const voltages = [120, 208, 240] as const;

export default function Mapper({ preview, onComplete, locale }: Props) {
  const text = textByLocale[locale];
  const [error, setError] = useState<string | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({
    timeColumn: preview.columns[0] ?? '',
    valueColumn: preview.columns[1] ?? preview.columns[0] ?? '',
    unit: 'kWh',
    voltage: 240
  });

  const ready = useMemo(() => Boolean(mapping.timeColumn && mapping.valueColumn), [mapping.timeColumn, mapping.valueColumn]);

  const handleApply = () => {
    try {
      const result = mapRecords(preview, mapping);
      setError(null);
      onComplete(result);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <section className="panel panel-default" aria-labelledby="map-heading">
      <header className="panel-heading">
        <h2 id="map-heading" className="panel-title">{text.mapper.heading}</h2>
      </header>
      <div className="panel-body">
        <p>{text.mapper.intro}</p>
        <details className="mrgn-bttm-md wb-details">
          <summary>Help with column mapping</summary>
          <p>Select the timestamp column and the interval value column. We keep the same cadence and conversion rules.</p>
        </details>

        <ErrorSummary errors={error ? [{ id: 'time-column', message: error }] : []} />

        <div className="row">
          <div className="col-md-3">
            <label htmlFor="time-column">Time column</label>
            <select id="time-column" className="form-control" value={mapping.timeColumn} onChange={(event) => setMapping((prev) => ({ ...prev, timeColumn: event.target.value }))}>
              {preview.columns.map((column) => (<option key={column} value={column}>{column}</option>))}
            </select>
          </div>
          <div className="col-md-3">
            <label htmlFor="value-column">Value column</label>
            <select id="value-column" className="form-control" value={mapping.valueColumn} onChange={(event) => setMapping((prev) => ({ ...prev, valueColumn: event.target.value }))}>
              {preview.columns.map((column) => (<option key={column} value={column}>{column}</option>))}
            </select>
          </div>
          <div className="col-md-3">
            <label htmlFor="unit">Units</label>
            <select id="unit" className="form-control" value={mapping.unit} onChange={(event) => setMapping((prev) => ({ ...prev, unit: event.target.value as IntervalUnit }))}>
              {units.map((unit) => (<option key={unit} value={unit}>{unit}</option>))}
            </select>
          </div>
          <div className="col-md-3">
            <label htmlFor="voltage">System voltage</label>
            <select id="voltage" className="form-control" value={mapping.voltage} onChange={(event) => setMapping((prev) => ({ ...prev, voltage: Number(event.target.value) as 120 | 208 | 240 }))}>
              {voltages.map((voltage) => (<option key={voltage} value={voltage}>{voltage} V</option>))}
            </select>
          </div>
        </div>

        <p className="help-block">Accepted cadence remains 15, 30, or 60 minutes.</p>
        <button type="button" disabled={!ready} className="btn btn-primary" onClick={handleApply}>Continue</button>
      </div>
    </section>
  );
}

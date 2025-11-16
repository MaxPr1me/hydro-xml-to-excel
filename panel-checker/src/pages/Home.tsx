import { useState } from 'react';
import Uploader from '../components/Uploader';
import Mapper from '../components/Mapper';
import { CsvPreview, IntervalDatum } from '../types';
import type { MappingResult } from '../lib/parse';

interface Props {
  onData: (data: IntervalDatum[]) => void;
}

export default function Home({ onData }: Props) {
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [result, setResult] = useState<MappingResult | null>(null);

  const handlePreview = (parsed: CsvPreview) => {
    setPreview(parsed);
    setResult(null);
  };

  const handleMapping = (mappingResult: MappingResult) => {
    setResult(mappingResult);
    onData(mappingResult.data);
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
      <section className="relative overflow-hidden rounded-3xl bg-brand-800 p-8 text-white shadow-xl">
        <div className="absolute inset-y-0 right-[-80px] w-1/2 rounded-l-full bg-brand-600 opacity-40" aria-hidden />
        <div className="relative space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.4em] text-accent-300">Proven Demand Method</p>
          <h1 className="text-3xl font-bold">Screen electrical panels the LEEP way.</h1>
          <div className="h-1 w-24 bg-accent-400" aria-hidden />
          <p className="max-w-2xl text-base text-brand-50">
            Rapidly confirm if a home's electrical panel has the demand headroom needed for electrification projects. Import
            CSV, XLSX, or Green Button XML data, align the columns, and unlock the demand chart and calculator.
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-brand-50">
            <li>Validate cadence and units before relying on the data.</li>
            <li>Plot a year of amps or kWh to catch spikes and seasonal trends.</li>
            <li>Summarize diversified loads plus what-if appliances in one report.</li>
          </ul>
        </div>
      </section>

      <Uploader onPreview={handlePreview} />
      {preview && <Mapper preview={preview} onComplete={handleMapping} />}
      {result && (
        <div className="rounded-2xl bg-accent-100 p-4 text-sm text-brand-900">
          Data OK! {result.data.length.toLocaleString()} intervals covering
          {' '}
          {result.coverageStart.toLocaleDateString()} — {result.coverageEnd.toLocaleDateString()}.
          {' '}One-year peak demand hit {result.maxAmps.toFixed(1)} A.
        </div>
      )}
    </main>
  );
}

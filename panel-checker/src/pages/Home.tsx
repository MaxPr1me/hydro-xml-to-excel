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
      <section className="rounded-3xl bg-gradient-to-br from-brand-600 to-slate-900 p-8 text-white shadow-lg">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-100">Electrical planning</p>
        <h1 className="mt-3 text-3xl font-bold">Check if a panel has room before rolling a truck.</h1>
        <p className="mt-3 max-w-2xl text-base text-brand-100">
          Upload interval data, validate cadence and units, graph the demand, and run a friendly calculator to see if another EV
          charger, heat pump, or range can be added.
        </p>
      </section>

      <Uploader onPreview={handlePreview} />
      {preview && <Mapper preview={preview} onComplete={handleMapping} />}
      {result && (
        <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
          Data OK! {result.data.length.toLocaleString()} intervals covering
          {' '}
          {result.coverageStart.toLocaleDateString()} — {result.coverageEnd.toLocaleDateString()}.
          {' '}One-year peak demand hit {result.maxAmps.toFixed(1)} A.
        </div>
      )}
    </main>
  );
}

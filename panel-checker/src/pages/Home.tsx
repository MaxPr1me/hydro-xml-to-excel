import { useState } from 'react';
import Uploader from '../components/Uploader';
import Mapper from '../components/Mapper';
import { CsvPreview, IntervalDatum } from '../types';
import type { MappingResult } from '../lib/parse';
import { textEn } from '../content/text';

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
      <section className="relative overflow-hidden rounded-3xl bg-[#0F2941] p-8 text-white shadow-xl">
        <div className="absolute inset-y-0 right-[-80px] w-1/2 rounded-l-full bg-[#0F2941]/70" aria-hidden />
        <div className="relative space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.4em] text-[#FFC933]">{textEn.home.calloutLabel}</p>
          <h2 className="text-3xl font-bold">{textEn.home.calloutHeading}</h2>
          <div className="h-1 w-24 bg-[#FFC933]" aria-hidden />
          <p className="max-w-2xl text-base text-brand-50">{textEn.home.calloutParagraph}</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-brand-50">
            {textEn.home.bulletPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
      </section>

      <Uploader onPreview={handlePreview} />
      {preview && <Mapper preview={preview} onComplete={handleMapping} />}
      {result && (
        <div className="rounded-2xl bg-[#FFC933]/20 p-4 text-sm text-[#0F2941]">
          {textEn.home.summaryPrefix} {result.data.length.toLocaleString()} {textEn.home.summaryCoverageIntro}
          {' '}
          {result.coverageStart.toLocaleDateString()} — {result.coverageEnd.toLocaleDateString()}.{' '}
          {textEn.home.summaryPeakIntro} {result.maxAmps.toFixed(1)} {textEn.home.summaryPeakUnits}
        </div>
      )}
    </main>
  );
}

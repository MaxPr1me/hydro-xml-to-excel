import { useState } from 'react';
import Uploader from '../components/Uploader';
import Mapper from '../components/Mapper';
import { AnalysisState, CsvPreview, IntervalDatum, UploadMode } from '../types';
import type { MappingResult } from '../lib/parse';
import { textEn } from '../content/text';
import { convertToAmps } from '../lib/units';

interface Props {
  onAnalysisReady: (analysis: AnalysisState) => void;
}

export default function Home({ onAnalysisReady }: Props) {
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [result, setResult] = useState<MappingResult | null>(null);
  const [manualPeakKwh, setManualPeakKwh] = useState('');
  const [manualCadence, setManualCadence] = useState(60);
  const [manualVoltage, setManualVoltage] = useState<120 | 208 | 240>(240);
  const [manualError, setManualError] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [uploadMode, setUploadMode] = useState<UploadMode>('flexible');

  const handlePreview = (parsed: CsvPreview) => {
    setPreview(parsed);
    setResult(null);
  };

  const handleMapping = (mappingResult: MappingResult) => {
    setResult(mappingResult);
    onAnalysisReady({ source: 'file', data: mappingResult.data, mode: uploadMode });
  };

  const handleParsedData = (mappingResult: MappingResult) => {
    setPreview(null);
    setResult(mappingResult);
    onAnalysisReady({ source: 'file', data: mappingResult.data, mode: uploadMode });
  };

  const handleManualSubmit = () => {
    const parsed = Number(manualPeakKwh);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setManualError('Enter a positive number for the peak kWh value.');
      return;
    }
    setManualError(null);
    const amps = convertToAmps(parsed, 'kWh', manualVoltage, manualCadence);
    setPreview(null);
    setResult(null);
    onAnalysisReady({
      source: 'manual',
      data: [],
      mode: uploadMode,
      manualPeak: {
        kwh: parsed,
        intervalMinutes: manualCadence,
        voltage: manualVoltage,
        amps: Number(amps.toFixed(2))
      }
    });
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

      <Uploader
        mode={uploadMode}
        onModeChange={(mode) => {
          setUploadMode(mode);
          setPreview(null);
          setResult(null);
        }}
        onPreview={handlePreview}
        onParsedData={handleParsedData}
      />

      {uploadMode === 'flexible' && preview && <Mapper preview={preview} onComplete={handleMapping} />}

      {result && (
        <div className="rounded-2xl bg-[#FFC933]/20 p-4 text-sm text-[#0F2941]">
          {textEn.home.summaryPrefix} {result.data.length.toLocaleString()} {textEn.home.summaryCoverageIntro}
          {' '}
          {result.coverageStart.toLocaleDateString()} — {result.coverageEnd.toLocaleDateString()}.{' '}
          {textEn.home.summaryPeakIntro} {result.maxAmps.toFixed(1)} {textEn.home.summaryPeakUnits}
        </div>
      )}

      <section className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-700">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-700">No file handy?</p>
          <h3 className="text-xl font-semibold text-slate-900">Jump straight to the calculator</h3>
          <p>
            Confirmed customers occasionally provide only their absolute peak interval reading. Enter that verified kWh value
            and cadence to run the calculator without uploading a file. The demand chart will be disabled and results will be
            flagged as unverified user input.
          </p>
        </div>
        <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-inner">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-0.5 h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
              checked={showManualEntry}
              onChange={(event) => setShowManualEntry(event.target.checked)}
            />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">Use a manual peak instead</p>
              <p className="text-xs text-slate-600">
                Check to reveal the fields for a customer-provided peak reading when no interval file is available.
              </p>
            </div>
          </label>

          {showManualEntry && (
            <div className="grid gap-4 md:grid-cols-4">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Peak interval energy (kWh)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={manualPeakKwh}
                  onChange={(event) => setManualPeakKwh(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  placeholder="e.g. 3.25"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Interval cadence
                <select
                  value={manualCadence}
                  onChange={(event) => setManualCadence(Number(event.target.value))}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
                >
                  {[15, 30, 60].map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes}-minute data
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Service voltage
                <select
                  value={manualVoltage}
                  onChange={(event) => setManualVoltage(Number(event.target.value) as 120 | 208 | 240)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
                >
                  {[120, 208, 240].map((voltage) => (
                    <option key={voltage} value={voltage}>
                      {voltage} V
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow"
                  onClick={handleManualSubmit}
                >
                  Use manual peak
                </button>
              </div>
            </div>
          )}
          {showManualEntry && manualError && <p className="text-sm text-rose-600">{manualError}</p>}
          <p className="text-xs text-slate-500">
            Disclaimer: This path never generates a graph. The calculator will mark the run as user-supplied data only, so
            include proof of the interval reading when submitting to a utility or AHJ.
          </p>
        </div>
      </section>
    </main>
  );
}

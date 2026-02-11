import { useMemo, useState } from 'react';
import Uploader from '../components/Uploader';
import Mapper from '../components/Mapper';
import ErrorSummary from '../components/ErrorSummary';
import { AnalysisState, CsvPreview, UploadMode } from '../types';
import type { MappingResult } from '../lib/parse';
import { Locale, textByLocale } from '../content/text';
import { convertToAmps } from '../lib/units';
import { trackAnalysisRun, trackMappingCompleted, trackModeSelected } from '../analytics';

interface Props {
  onAnalysisReady: (analysis: AnalysisState) => void;
  locale: Locale;
}

export default function Home({ onAnalysisReady, locale }: Props) {
  const text = textByLocale[locale];
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [result, setResult] = useState<MappingResult | null>(null);
  const [manualPeakKwh, setManualPeakKwh] = useState('');
  const [manualCadence, setManualCadence] = useState(60);
  const [manualVoltage, setManualVoltage] = useState<120 | 208 | 240>(240);
  const [manualError, setManualError] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [uploadMode, setUploadMode] = useState<UploadMode>('flexible');

  const toAnalyticsMode = (mode: UploadMode) => (mode === 'flexible' ? 'flex' : 'ns_power');

  const trackMapping = (mappingResult: MappingResult, mode: UploadMode) => {
    const durationMs = mappingResult.coverageEnd.getTime() - mappingResult.coverageStart.getTime();
    const durationDays = Math.max(0, Math.round(durationMs / (1000 * 60 * 60 * 24)));
    trackMappingCompleted({
      timestepMinutes: mappingResult.cadenceMinutes,
      durationDays,
      mode: toAnalyticsMode(mode)
    });
  };

  const handlePreview = (parsed: CsvPreview) => {
    setPreview(parsed);
    setResult(null);
  };

  const handleMapping = (mappingResult: MappingResult) => {
    setResult(mappingResult);
    trackMapping(mappingResult, uploadMode);
    trackAnalysisRun({ mode: toAnalyticsMode(uploadMode), method: 'verified', hasData: true });
    onAnalysisReady({ source: 'file', data: mappingResult.data, mode: uploadMode });
  };

  const handleParsedData = (mappingResult: MappingResult) => {
    setPreview(null);
    setResult(mappingResult);
    trackMapping(mappingResult, uploadMode);
    trackAnalysisRun({ mode: toAnalyticsMode(uploadMode), method: 'verified', hasData: true });
    onAnalysisReady({ source: 'file', data: mappingResult.data, mode: uploadMode });
  };

  const handleManualSubmit = () => {
    const parsed = Number(manualPeakKwh);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setManualError('Enter a positive number for peak interval energy.');
      return;
    }
    setManualError(null);
    const amps = convertToAmps(parsed, 'kWh', manualVoltage, manualCadence);
    setPreview(null);
    setResult(null);
    trackAnalysisRun({ mode: toAnalyticsMode(uploadMode), method: 'manual_peak', hasData: false });
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

  const handleModeChange = (mode: UploadMode) => {
    setUploadMode(mode);
    setPreview(null);
    setResult(null);
    trackModeSelected(toAnalyticsMode(mode));
  };

  const currentStep = useMemo(() => {
    if (result) return 3;
    if (preview && uploadMode === 'flexible') return 2;
    return 1;
  }, [preview, result, uploadMode]);

  return (
    <main property="mainContentOfPage" className="container" id="wb-cont">
      <section className="well">
        <h2 className="h3">{text.home.heading}</h2>
        <p>{text.home.intro}</p>
        <h3 className="h5">Before you start</h3>
        <ul>
          {text.beforeYouStart.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section aria-label="Progress" className="mrgn-bttm-lg">
        <ol className="list-inline">
          {text.progress.map((step, index) => (
            <li key={step} className={`mrgn-rght-md ${index + 1 <= currentStep ? 'font-weight-bold' : ''}`}>
              {index + 1}. {step}
            </li>
          ))}
        </ol>
      </section>

      <Uploader mode={uploadMode} onModeChange={handleModeChange} onPreview={handlePreview} onParsedData={handleParsedData} />

      {uploadMode === 'flexible' && preview && <Mapper preview={preview} onComplete={handleMapping} locale={locale} />}

      {result && (
        <div className="alert alert-success">
          {text.home.summaryPrefix} {result.data.length.toLocaleString()} {text.home.summaryCoverageIntro} {result.coverageStart.toLocaleDateString()} to{' '}
          {result.coverageEnd.toLocaleDateString()}. {text.home.summaryPeakIntro} {result.maxAmps.toFixed(1)} {text.home.summaryPeakUnits}.
        </div>
      )}

      <section className="panel panel-default">
        <header className="panel-heading">
          <h2 className="panel-title">{text.home.manualHeading}</h2>
        </header>
        <div className="panel-body">
          <p>{text.home.manualDescription}</p>
          <label htmlFor="manual-enable" className="checkbox-inline">
            <input id="manual-enable" type="checkbox" checked={showManualEntry} onChange={(event) => setShowManualEntry(event.target.checked)} />
            Enter a customer-provided peak value
          </label>

          {showManualEntry && (
            <>
              <ErrorSummary errors={manualError ? [{ id: 'manual-peak-kwh', message: manualError }] : []} />
              <div className="row">
                <div className="col-md-3">
                  <label htmlFor="manual-peak-kwh">Peak interval energy (kWh)</label>
                  <input id="manual-peak-kwh" type="number" min="0" step="0.01" value={manualPeakKwh} onChange={(event) => setManualPeakKwh(event.target.value)} className="form-control" />
                </div>
                <div className="col-md-3">
                  <label htmlFor="manual-cadence">Interval cadence</label>
                  <select id="manual-cadence" value={manualCadence} onChange={(event) => setManualCadence(Number(event.target.value))} className="form-control">
                    {[15, 30, 60].map((minutes) => (<option key={minutes} value={minutes}>{minutes} minutes</option>))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label htmlFor="manual-voltage">Service voltage</label>
                  <select id="manual-voltage" value={manualVoltage} onChange={(event) => setManualVoltage(Number(event.target.value) as 120 | 208 | 240)} className="form-control">
                    {[120, 208, 240].map((voltage) => (<option key={voltage} value={voltage}>{voltage} V</option>))}
                  </select>
                </div>
                <div className="col-md-3 mrgn-tp-lg">
                  <button type="button" className="btn btn-primary" onClick={handleManualSubmit}>Use manual peak</button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

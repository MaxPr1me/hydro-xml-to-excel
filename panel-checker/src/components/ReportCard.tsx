import { type MutableRefObject } from 'react';
import { AnalysisState, PanelVerdict } from '../types';
import { computeDemandStats } from '../lib/parse';
import { renderElementSnapshot } from '../lib/snapshots';
import { trackAnalysisError, trackSummaryDownload } from '../analytics';

interface Props {
  analysis: AnalysisState;
  verdict: PanelVerdict;
  reportSectionRef?: MutableRefObject<HTMLElement | null>;
  captureTargetRef?: MutableRefObject<HTMLElement | null>;
}

export default function ReportCard({ analysis, verdict, reportSectionRef, captureTargetRef }: Props) {
  const data = analysis.data;
  const stats = computeDemandStats(data);
  const manualMode = analysis.source === 'manual' && !!analysis.manualPeak;

  const downloadReport = async () => {
    const targetElement = captureTargetRef?.current ?? reportSectionRef?.current;
    if (!targetElement) return;

    try {
      const snapshot = await renderElementSnapshot({ element: targetElement, backgroundColor: '#f8fafc' });
      const link = document.createElement('a');
      link.href = snapshot.dataUrl;
      link.download = 'leep-spark-panel-report.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      trackSummaryDownload({
        format: 'png',
        method: manualMode ? 'manual_peak' : 'verified',
        hasData: analysis.source === 'file' && analysis.data.length > 0
      });
    } catch (error) {
      trackAnalysisError({ stage: 'report', errorCode: 'REPORT_EXPORT_FAILED' });
      // eslint-disable-next-line no-console
      console.error('Failed to generate report image', error);
    }
  };

  return (
    <section ref={reportSectionRef} className="space-y-3 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">One-page report</h2>
          <p className="text-sm text-slate-600">Copy the highlights for your permit package.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            void downloadReport();
          }}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          data-export-exclude="true"
        >
          Download Report
        </button>
      </div>

      {stats && (
        <dl className="grid gap-4 sm:grid-cols-2">
          <Stat label="Coverage" value={`${stats.start.toLocaleDateString()} — ${stats.end.toLocaleDateString()}`} />
          <Stat label="Cadence" value={`${stats.cadenceMinutes}-minute data`} />
          <Stat label="Peak amps" value={`${stats.maxAmps.toFixed(1)} A`} />
          <Stat label="Verdict" value={`${verdict.status} (${verdict.availableMargin.toFixed(1)} A margin)`} />
        </dl>
      )}
      {manualMode && analysis.manualPeak && (
        <dl className="grid gap-4 sm:grid-cols-2">
          <Stat label="Manual peak (kWh)" value={analysis.manualPeak.kwh.toString()} />
          <Stat label="Manual cadence" value={`${analysis.manualPeak.intervalMinutes}-minute`} />
          <Stat label="Manual amps" value={`${analysis.manualPeak.amps.toFixed(1)} A`} />
          <Stat label="Verdict" value={`${verdict.status} (${verdict.availableMargin.toFixed(1)} A margin)`} />
        </dl>
      )}

      <div className="rounded-xl border border-slate-200 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">Proposed loads</p>
        {verdict.proposedLoads.length ? (
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {verdict.proposedLoads.map((load, index) => (
              <li key={`${load.name}-${index}`} className="flex items-center justify-between">
                <span>{load.name?.trim() || 'Load'}</span>
                <span className="font-semibold text-slate-900">
                  {load.amps.toFixed(1)} A
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-600">No what-if loads were added to this scenario.</p>
        )}
      </div>

        <p className={`text-xs ${manualMode ? 'text-amber-700' : 'text-slate-500'}`}>
          {manualMode
            ? 'Manual entry disclaimer: No interval data was uploaded. Provide documentation of the source kWh reading.'
            : 'Screening tool only — always confirm against the Canadian Electrical Code, NEC, and utility requirements.'}
        </p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-lg font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

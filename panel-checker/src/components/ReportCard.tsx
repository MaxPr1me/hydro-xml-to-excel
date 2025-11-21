import { type MutableRefObject } from 'react';
import { AnalysisState, PanelVerdict } from '../types';
import { computeDemandStats } from '../lib/parse';
import { buildSummaryPdf } from '../lib/pdf';
import { renderDemandProfileSnapshot, renderElementSnapshot, snapshotToBytes } from '../lib/snapshots';
import { trackAnalysisError, trackSummaryDownload } from '../analytics';

interface Props {
  analysis: AnalysisState;
  verdict: PanelVerdict;
  chartRef?: MutableRefObject<HTMLDivElement | null>;
  demandSectionRef?: MutableRefObject<HTMLElement | null>;
  reportSectionRef?: MutableRefObject<HTMLElement | null>;
}

export default function ReportCard({ analysis, verdict, chartRef, demandSectionRef, reportSectionRef }: Props) {
  const data = analysis.data;
  const stats = computeDemandStats(data);
  const manualMode = analysis.source === 'manual' && !!analysis.manualPeak;

  const downloadReport = async () => {
    try {
      let reportImage: { data: Uint8Array; width: number; height: number } | undefined;
      if (reportSectionRef?.current) {
        try {
          const snapshot = await renderElementSnapshot({ element: reportSectionRef.current });
          reportImage = { data: snapshotToBytes(snapshot), width: snapshot.width, height: snapshot.height };
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('Unable to capture report section for PDF', error);
        }
      }

      let demandImage: { data: Uint8Array; width: number; height: number } | undefined;
      if (demandSectionRef?.current) {
        try {
          const snapshot = await renderElementSnapshot({ element: demandSectionRef.current });
          demandImage = { data: snapshotToBytes(snapshot), width: snapshot.width, height: snapshot.height };
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('Unable to capture demand section for PDF', error);
        }
      }

      if (!demandImage && !manualMode && chartRef?.current) {
        try {
          const snapshot = await renderDemandProfileSnapshot({
            chartElement: chartRef.current,
            data,
            metric: 'amps'
          });
          demandImage = { data: snapshotToBytes(snapshot), width: snapshot.width, height: snapshot.height };
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('Unable to capture chart image for PDF export', error);
        }
      }

      const pdfBlob = buildSummaryPdf({
        documentTitle: 'LEEP SPARK Tool - Demonstrate Load Report',
        sections: [
          {
            title: 'One-page report',
            image: reportImage,
            placeholder: 'Unable to capture the report preview. Please take a screenshot as backup.'
          },
          {
            title: 'Demand profile',
            image: demandImage,
            placeholder: manualMode
              ? 'No interval data provided – demand profile not available.'
              : 'Chart capture unavailable. Take a screenshot of the demand profile as backup.'
          }
        ],
        disclaimer: manualMode
          ? 'Strong disclaimer: Manual peak entry only. Verify against utility-provided interval data before relying on this report.'
          : 'Screening tool only — always confirm against the Canadian Electrical Code, NEC, and utility requirements.'
      });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(pdfBlob);
      link.download = 'leep-spark-panel-report.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      trackSummaryDownload({
        format: 'pdf',
        method: manualMode ? 'manual_peak' : 'verified',
        hasData: analysis.source === 'file' && analysis.data.length > 0
      });
    } catch (error) {
      trackAnalysisError({ stage: 'pdf', errorCode: 'PDF_EXPORT_FAILED' });
      // eslint-disable-next-line no-console
      console.error('Failed to generate PDF', error);
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
          Download summary
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
                  {load.amps.toFixed(1)} A{load.continuous ? ' (continuous)' : ''}
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

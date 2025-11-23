import { type MutableRefObject } from 'react';
import { AnalysisState, PanelVerdict } from '../types';
import { computeDemandStats } from '../lib/parse';
import { renderDemandProfileSnapshot, renderElementSnapshot, snapshotToBytes } from '../lib/snapshots';
import { buildSummaryPdf } from '../lib/pdf';
import { trackAnalysisError, trackSummaryDownload } from '../analytics';

interface Props {
  analysis: AnalysisState;
  verdict: PanelVerdict;
  reportSectionRef?: MutableRefObject<HTMLElement | null>;
  demandSectionRef?: MutableRefObject<HTMLElement | null>;
  panelSectionRef?: MutableRefObject<HTMLElement | null>;
  chartRef?: MutableRefObject<HTMLDivElement | null>;
}

export default function ReportCard({ analysis, verdict, reportSectionRef, demandSectionRef, panelSectionRef, chartRef }: Props) {
  const data = analysis.data;
  const stats = computeDemandStats(data);
  const manualMode = analysis.source === 'manual' && !!analysis.manualPeak;
  const hasIntervalData = analysis.source === 'file' && analysis.data.length > 0;

  const downloadReport = async () => {
    const sections: Array<{
      title: string;
      image?: { data: Uint8Array; width: number; height: number };
      placeholder?: string;
    }> = [];

    const addElementSnapshot = async (title: string, element?: HTMLElement | null, placeholder?: string) => {
      if (element) {
        const snapshot = await renderElementSnapshot({ element, backgroundColor: '#f8fafc' });
        sections.push({ title, image: { data: snapshotToBytes(snapshot), width: snapshot.width, height: snapshot.height } });
      } else if (placeholder) {
        sections.push({ title, placeholder });
      }
    };

    try {
      if (hasIntervalData && chartRef?.current) {
        const snapshot = await renderDemandProfileSnapshot({
          chartElement: chartRef.current,
          data,
          metric: 'amps'
        });
        sections.push({
          title: 'Demand profile',
          image: { data: snapshotToBytes(snapshot), width: snapshot.width, height: snapshot.height }
        });
      } else {
        await addElementSnapshot(
          'Demand profile',
          demandSectionRef?.current,
          'Demand profile unavailable — upload interval data to generate this view.'
        );
      }

      await addElementSnapshot(
        'Panel calculator',
        panelSectionRef?.current,
        'Panel calculator unavailable. Re-run the analysis to populate this section.'
      );

      await addElementSnapshot(
        'One-page report',
        reportSectionRef?.current,
        'Report summary unavailable. Re-run the analysis to populate this section.'
      );

      const pdf = buildSummaryPdf({
        documentTitle: "LEEP's SPARK Tool report",
        sections,
        disclaimer: manualMode
          ? 'Manual entry disclaimer: No interval data was uploaded. Provide documentation of the source kWh reading.'
          : 'Screening tool only — always confirm against the Canadian Electrical Code, NEC, and utility requirements.'
      });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(pdf);
      link.download = 'leep-spark-panel-report.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      trackSummaryDownload({
        format: 'pdf',
        method: manualMode ? 'manual_peak' : 'verified',
        hasData: hasIntervalData
      });
    } catch (error) {
      trackAnalysisError({ stage: 'report', errorCode: 'REPORT_EXPORT_FAILED' });
      // eslint-disable-next-line no-console
      console.error('Failed to generate report PDF', error);
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
          <p className="mt-2 text-sm text-slate-600">No proposed loads were added to this scenario.</p>
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

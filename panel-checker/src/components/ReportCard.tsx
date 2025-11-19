import { type MutableRefObject } from 'react';
import Plotly from 'plotly.js-dist-min';
import { AnalysisState, PanelVerdict } from '../types';
import { computeDemandStats } from '../lib/parse';
import { buildSummaryPdf, dataUrlToBytes } from '../lib/pdf';

interface Props {
  analysis: AnalysisState;
  verdict: PanelVerdict;
  chartRef?: MutableRefObject<HTMLDivElement | null>;
}

export default function ReportCard({ analysis, verdict, chartRef }: Props) {
  const data = analysis.data;
  const stats = computeDemandStats(data);
  const manualMode = analysis.source === 'manual' && !!analysis.manualPeak;

  const downloadReport = async () => {
    const summaryLines: string[] = [];
    if (stats) {
      summaryLines.push(
        `Coverage: ${stats.start.toLocaleDateString()} — ${stats.end.toLocaleDateString()}`,
        `Cadence: ${stats.cadenceMinutes}-minute intervals`,
        `Peak amps: ${stats.maxAmps.toFixed(1)} A`
      );
    } else if (manualMode && analysis.manualPeak) {
      summaryLines.push(
        `Manual peak (kWh): ${analysis.manualPeak.kwh}`,
        `Manual cadence: ${analysis.manualPeak.intervalMinutes}-minute interval`,
        `Manual amps (×1.25 baseline): ${(analysis.manualPeak.amps * 1.25).toFixed(1)} A`
      );
    }
    summaryLines.push(`Verdict: ${verdict.status}`, `Margin: ${verdict.availableMargin.toFixed(1)} A`);
    if (manualMode) {
      summaryLines.push('WARNING: No interval data uploaded – results based on user entry.');
    }

    const loads = verdict.proposedLoads.length
      ? verdict.proposedLoads.map((load) => {
          const label = load.name?.trim() || 'Load';
          const suffix = load.continuous ? ' (continuous)' : '';
          return `• ${label}: ${load.amps.toFixed(1)} A${suffix}`;
        })
      : [];

    let chartImageBytes: Uint8Array | null = null;
    const chartWidth = 1600;
    const chartHeight = 900;
    if (!manualMode && chartRef?.current) {
      try {
        const dataUrl = (await Plotly.toImage(chartRef.current, {
          format: 'jpeg',
          width: chartWidth,
          height: chartHeight,
          scale: 2
        })) as string;
        chartImageBytes = dataUrlToBytes(dataUrl);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Unable to capture chart image for PDF export', error);
      }
    }

    const pdfBlob = buildSummaryPdf({
      title: 'LEEP SPARK Tool – Demonstrate load summary',
      summaryLines,
      loads,
      disclaimer: manualMode
        ? 'Strong disclaimer: Manual peak entry only. Verify against utility-provided interval data before relying on this report.'
        : 'Screening tool only — always confirm against the Canadian Electrical Code, NEC, and utility requirements.',
      chartImage:
        chartImageBytes && chartImageBytes.length
          ? { data: chartImageBytes, width: chartWidth, height: chartHeight }
          : undefined,
      placeholderMessage: manualMode
        ? 'No interval data provided – graph not available. Attach manual peak documentation.'
        : 'Chart capture unavailable. Take a screenshot of the demand profile as backup.'
    });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(pdfBlob);
    link.download = 'leep-spark-panel-report.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm">
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

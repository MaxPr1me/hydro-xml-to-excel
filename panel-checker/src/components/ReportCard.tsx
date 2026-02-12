import { type MutableRefObject } from 'react';
import { AnalysisState, PanelVerdict } from '../types';
import { computeDemandStats } from '../lib/parse';
import { renderDemandProfileSnapshot, renderElementSnapshot, snapshotToBytes } from '../lib/snapshots';
import { buildSummaryPdf } from '../lib/pdf';
import { trackAnalysisError, trackSummaryDownload } from '../analytics';
import { useI18n } from '../content/i18n';

interface Props {
  analysis: AnalysisState;
  verdict: PanelVerdict;
  reportSectionRef?: MutableRefObject<HTMLElement | null>;
  demandSectionRef?: MutableRefObject<HTMLElement | null>;
  panelSectionRef?: MutableRefObject<HTMLElement | null>;
  chartRef?: MutableRefObject<HTMLDivElement | null>;
}

export default function ReportCard({ analysis, verdict, reportSectionRef, demandSectionRef, panelSectionRef, chartRef }: Props) {
  const { copy, formatDate, translateError } = useI18n();
  const data = analysis.data;
  const stats = computeDemandStats(data);
  const manualMode = analysis.source === 'manual' && !!analysis.manualPeak;
  const hasIntervalData = analysis.source === 'file' && analysis.data.length > 0;

  const downloadReport = async () => {
    const sections: Array<{ title: string; image?: { data: Uint8Array; width: number; height: number }; placeholder?: string }> = [];
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
        const snapshot = await renderDemandProfileSnapshot({ chartElement: chartRef.current, data, metric: 'amps', labels: { title: copy.chart.title, oneYearPeak: copy.chart.peakLine, percentile95: copy.chart.percentile, viewing: copy.chart.view, highlights: copy.report.title, coverage: copy.chart.coverage, coverageMissing: copy.results.noGraph, cadence: copy.report.cadence, cadenceMissing: 'n/a', dataQuality: copy.chart.dataQuality, intervals: copy.chart.intervals } });
        sections.push({ title: copy.chart.title, image: { data: snapshotToBytes(snapshot), width: snapshot.width, height: snapshot.height } });
      } else {
        await addElementSnapshot(copy.chart.title, demandSectionRef?.current, copy.results.noGraph);
      }
      await addElementSnapshot(copy.calculator.title, panelSectionRef?.current, copy.results.unlock);
      await addElementSnapshot(copy.report.title, reportSectionRef?.current, copy.report.subtitle);

      const pdf = buildSummaryPdf({
        documentTitle: copy.report.title,
        sections,
        disclaimer: manualMode ? copy.report.manualDisclaimer : copy.report.toolDisclaimer
      });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(pdf);
      link.download = 'leep-spark-panel-report.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      trackSummaryDownload({ format: 'pdf', method: manualMode ? 'manual_peak' : 'verified', hasData: hasIntervalData });
    } catch (error) {
      trackAnalysisError({ stage: 'report', errorCode: 'REPORT_EXPORT_FAILED' });
      console.error('Failed to generate report PDF', error);
    }
  };

  const verdictLabel = verdict.status === 'OK' ? copy.calculator.statusOk : copy.calculator.statusUpgrade;

  return (
    <section ref={reportSectionRef} className="space-y-3 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{copy.report.title}</h2>
          <p className="text-sm text-slate-600">{copy.report.subtitle}</p>
        </div>
        <button type="button" onClick={() => void downloadReport()} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white" data-export-exclude="true">
          {copy.report.download}
        </button>
      </div>

      {stats && (
        <dl className="grid gap-4 sm:grid-cols-2">
          <Stat label={copy.report.coverage} value={`${formatDate(stats.start)} — ${formatDate(stats.end)}`} />
          <Stat label={copy.report.cadence} value={`${stats.cadenceMinutes}-minute data`} />
          <Stat label={copy.report.peakAmps} value={`${stats.maxAmps.toFixed(1)} A`} />
          <Stat label={copy.report.verdict} value={`${verdictLabel} (${verdict.availableMargin.toFixed(1)} A ${copy.report.margin})`} />
        </dl>
      )}
      {manualMode && analysis.manualPeak && (
        <dl className="grid gap-4 sm:grid-cols-2">
          <Stat label={copy.report.manualPeak} value={analysis.manualPeak.kwh.toString()} />
          <Stat label={copy.report.manualCadence} value={`${analysis.manualPeak.intervalMinutes}-minute`} />
          <Stat label={copy.report.manualAmps} value={`${analysis.manualPeak.amps.toFixed(1)} A`} />
          <Stat label={copy.report.verdict} value={`${verdictLabel} (${verdict.availableMargin.toFixed(1)} A ${copy.report.margin})`} />
        </dl>
      )}

      <div className="rounded-xl border border-slate-200 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-500">{copy.calculator.proposedLoads}</p>
        {verdict.proposedLoads.length ? (
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {verdict.proposedLoads.map((load, index) => (
              <li key={`${load.name}-${index}`} className="flex items-center justify-between">
                <span>{load.name?.trim() || copy.report.loadFallback}</span>
                <span className="font-semibold text-slate-900">{load.amps.toFixed(1)} A</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-600">{copy.report.noLoads}</p>
        )}
      </div>

      <p className={`text-xs ${manualMode ? 'text-amber-700' : 'text-slate-500'}`}>
        {translateError(manualMode ? copy.report.manualDisclaimer : copy.report.toolDisclaimer)}
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

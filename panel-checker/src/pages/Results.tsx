import DemandChart from '../components/DemandChart';
import { useRef, useState } from 'react';
import PanelCalculator from '../components/PanelCalculator';
import ReportCard from '../components/ReportCard';
import { AnalysisState, PanelVerdict } from '../types';
import { useI18n } from '../content/i18n';

interface Props {
  analysis: AnalysisState;
}

export default function Results({ analysis }: Props) {
  const { copy } = useI18n();
  const [verdict, setVerdict] = useState<PanelVerdict | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);
  const demandSectionRef = useRef<HTMLElement | null>(null);
  const reportSectionRef = useRef<HTMLElement | null>(null);
  const panelSectionRef = useRef<HTMLElement | null>(null);

  const hasIntervalData = analysis.source === 'file' && analysis.data.length > 0;
  const manualMode = analysis.source === 'manual' && !!analysis.manualPeak;
  const smocMode = analysis.mode === 'ns-power-smoc';

  if (!hasIntervalData && !manualMode) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
          {copy.results.unlock}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      {hasIntervalData ? (
        <DemandChart data={analysis.data} chartRef={chartRef} sectionRef={demandSectionRef} />
      ) : (
        <section
          ref={demandSectionRef}
          className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/90 p-6 text-center text-slate-600"
        >
          <p className="text-lg font-semibold text-slate-800">{copy.results.noGraph}</p>
          <p className="mt-2 text-sm">
            {copy.results.noGraphBody}
          </p>
        </section>
      )}
      {smocMode && hasIntervalData && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          {copy.results.smocBanner}
        </div>
      )}
      <section className="space-y-6">
        <PanelCalculator analysis={analysis} onVerdictChange={setVerdict} sectionRef={panelSectionRef} />
        {manualMode && (
          <div className="rounded-2xl border border-amber-500 bg-amber-50 p-4 text-sm text-amber-900">
            {copy.results.manualBanner}
          </div>
        )}
        {verdict && (
          <ReportCard
            analysis={analysis}
            verdict={verdict}
            reportSectionRef={reportSectionRef}
            demandSectionRef={demandSectionRef}
            panelSectionRef={panelSectionRef}
            chartRef={chartRef}
          />
        )}
      </section>
    </main>
  );
}

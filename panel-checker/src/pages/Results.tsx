import DemandChart from '../components/DemandChart';
import { useRef, useState } from 'react';
import PanelCalculator from '../components/PanelCalculator';
import ReportCard from '../components/ReportCard';
import { AnalysisState, PanelVerdict } from '../types';

interface Props {
  analysis: AnalysisState;
}

export default function Results({ analysis }: Props) {
  const [verdict, setVerdict] = useState<PanelVerdict | null>(null);
  const chartRef = useRef<HTMLDivElement | null>(null);
  const demandSectionRef = useRef<HTMLElement | null>(null);
  const reportSectionRef = useRef<HTMLElement | null>(null);
  const reportCaptureRef = useRef<HTMLElement | null>(null);

  const hasIntervalData = analysis.source === 'file' && analysis.data.length > 0;
  const manualMode = analysis.source === 'manual' && !!analysis.manualPeak;
  const smocMode = analysis.mode === 'ns-power-smoc';

  if (!hasIntervalData && !manualMode) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
          Upload interval data or use the manual peak option to unlock the calculator.
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
          <p className="text-lg font-semibold text-slate-800">No interval data provided – graph not available.</p>
          <p className="mt-2 text-sm">
            The customer-supplied peak value lets you use the calculator, but no demand profile image will be generated.
          </p>
        </section>
      )}
      {smocMode && hasIntervalData && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          NS Power SMOC mode: intervals come from the "Interval Period End Timestamp Local" column, and amperage uses the
          maximum of Max A(a) and Max A(c) per row. Files with missing Max A columns or malformed timestamps will stop with a
          clear error.
        </div>
      )}
      <section ref={reportCaptureRef} className="space-y-6">
        <PanelCalculator analysis={analysis} onVerdictChange={setVerdict} />
        {manualMode && (
          <div className="rounded-2xl border border-amber-500 bg-amber-50 p-4 text-sm text-amber-900">
            Strong disclaimer: No interval data was uploaded. The peak amperage is derived from a user-entered kWh value and is
            considered unverified. Use caution when sharing these results and attach documentation showing the original interval
            reading.
          </div>
        )}
        {verdict && (
          <ReportCard
            analysis={analysis}
            verdict={verdict}
            reportSectionRef={reportSectionRef}
            captureTargetRef={reportCaptureRef}
          />
        )}
      </section>
    </main>
  );
}

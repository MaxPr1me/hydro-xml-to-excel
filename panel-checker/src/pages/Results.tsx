import DemandChart from '../components/DemandChart';
import { useRef, useState } from 'react';
import PanelCalculator from '../components/PanelCalculator';
import ReportCard from '../components/ReportCard';
import { AnalysisState, PanelVerdict } from '../types';
import { Locale } from '../content/text';

interface Props {
  analysis: AnalysisState;
  locale: Locale;
}

export default function Results({ analysis }: Props) {
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
      <main className="container">
        <section className="alert alert-info">
          <h2 className="h4">No analysis results yet</h2>
          <p>Upload interval data or use the manual peak option to continue.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="container">
      <h2 className="h3">Results and panel check</h2>
      {hasIntervalData ? (
        <DemandChart data={analysis.data} chartRef={chartRef} sectionRef={demandSectionRef} />
      ) : (
        <section ref={demandSectionRef} className="alert alert-warning">
          <h3 className="h4">No demand profile available</h3>
          <p>Manual peak mode keeps panel calculations available but does not generate a chart.</p>
        </section>
      )}
      {smocMode && hasIntervalData && (
        <div className="alert alert-info">
          NS Power SMOC mode uses "Interval Period End Timestamp Local" and derives amperage from Max A columns.
        </div>
      )}
      <section>
        <PanelCalculator analysis={analysis} onVerdictChange={setVerdict} sectionRef={panelSectionRef} />
        {manualMode && (
          <div className="alert alert-warning">
            Manual peak data is user supplied. Attach source evidence when sharing these results.
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

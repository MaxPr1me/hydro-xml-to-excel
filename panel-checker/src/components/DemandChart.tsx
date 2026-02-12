import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import Plotly from 'plotly.js-dist-min';
import type { Config, Data, Layout, ModeBarDefaultButtons } from 'plotly.js';
import { IntervalDatum } from '../types';
import { computeDemandStats } from '../lib/parse';
import { convertToKwh } from '../lib/units';
import { renderDemandProfileSnapshot } from '../lib/snapshots';
import { trackAnalysisError, trackSummaryDownload } from '../analytics';
import { useI18n } from '../content/i18n';

interface Props { data: IntervalDatum[]; chartRef?: MutableRefObject<HTMLDivElement | null>; sectionRef?: MutableRefObject<HTMLElement | null>; }
type Metric = 'amps' | 'kwh';

export default function DemandChart({ data, chartRef, sectionRef }: Props) {
  const { copy, formatDate, translateError } = useI18n();
  const fallbackRef = useRef<HTMLDivElement | null>(null);
  const ref = chartRef ?? fallbackRef;
  const [metric, setMetric] = useState<Metric>('amps');
  const [exportError, setExportError] = useState<string | null>(null);
  const stats = useMemo(() => computeDemandStats(data), [data]);

  const chartDefinition = useMemo(() => {
    if (!data.length) return null;
    const yLabel = metric === 'amps' ? 'Amps' : 'kWh';
    const hoverSuffix = metric === 'amps' ? 'A' : 'kWh';
    const series = data.map((datum) => (metric === 'amps' ? datum.amps : convertToKwh(datum.value, datum.unit, datum.voltage, datum.intervalMinutes)));
    const peakIndex = data.reduce((maxIndex, datum, index, records) => (datum.amps > records[maxIndex].amps ? index : maxIndex), 0);
    const peakTimestamp = data[peakIndex]?.timestamp;
    const peakValue = series[peakIndex];
    const trace: Data = { x: data.map((d) => d.timestamp), y: series, type: 'scatter', mode: 'lines', line: { color: '#1f6bc4', width: 2 }, name: yLabel, hovertemplate: `%{x}<br>%{y:.2f} ${hoverSuffix}<extra></extra>` };
    const peakTrace: Data = {
      x: peakTimestamp ? [peakTimestamp] : [],
      y: typeof peakValue === 'number' ? [peakValue] : [],
      type: 'scatter',
      mode: 'text+markers',
      marker: { color: '#16a34a', size: 10, line: { color: '#ffffff', width: 1.5 } },
      text: [copy.chart.peakMarker],
      textposition: 'top center',
      textfont: { color: '#166534', size: 12 },
      name: copy.chart.peakLine,
      hovertemplate: `${copy.chart.peakLine}<br>%{x}<br>%{y:.2f} ${hoverSuffix}<extra></extra>`
    };
    const layout: Partial<Layout> = {
      margin: { t: 32, r: 16, b: 48, l: 56 }, paper_bgcolor: 'rgba(255,255,255,0)', plot_bgcolor: 'rgba(255,255,255,0)',
      xaxis: { title: copy.mapper.time, automargin: true }, yaxis: { title: yLabel, rangemode: 'tozero', automargin: true }, showlegend: true,
      legend: { orientation: 'h', x: 0, y: 1.15 }, font: { family: 'Inter, sans-serif', color: '#021b33' }
    };
    return { data: [trace, peakTrace], layout };
  }, [copy.chart.peakLine, copy.chart.peakMarker, copy.mapper.time, data, metric]);

  const chartConfig = useMemo(() => ({ responsive: true, displaylogo: false, modeBarButtonsToRemove: ['select2d', 'lasso2d'] as ModeBarDefaultButtons[] } satisfies Partial<Config>), []);

  useEffect(() => {
    if (!ref.current || !chartDefinition) return;
    Plotly.newPlot(ref.current, chartDefinition.data, chartDefinition.layout, chartConfig);
    return () => { if (ref.current) Plotly.purge(ref.current); };
  }, [chartDefinition, chartConfig, ref]);

  const exportChart = async () => {
    if (!ref.current) return;
    try {
      setExportError(null);
      const snapshot = await renderDemandProfileSnapshot({ chartElement: ref.current, data, metric, labels: { title: copy.chart.title, oneYearPeak: copy.chart.peakLine, percentile95: copy.chart.percentile, viewing: copy.chart.view, highlights: copy.report.title, coverage: copy.chart.coverage, coverageMissing: copy.results.noGraph, cadence: copy.report.cadence, cadenceMissing: 'n/a', dataQuality: copy.chart.dataQuality, intervals: copy.chart.intervals } });
      trackSummaryDownload({ format: 'png', method: 'verified', hasData: true });
      const link = document.createElement('a');
      link.href = snapshot.dataUrl;
      link.download = `leeps-demand-profile-${metric}.png`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } catch (error) {
      setExportError(translateError((error as Error).message || copy.chart.unableExport));
      trackAnalysisError({ stage: 'pdf', errorCode: 'PNG_EXPORT_FAILED' });
    }
  };

  return (
    <section ref={sectionRef} className="space-y-3 rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{copy.chart.title}</h2>
          {stats && <p className="text-sm text-slate-600">{copy.chart.peakLine} {stats.maxAmps.toFixed(0)} A · {copy.chart.percentile} {stats.percentile95.toFixed(0)} A</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-600">{copy.chart.view}</span>
          <button type="button" className={`rounded-full px-3 py-1 ${metric === 'amps' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`} onClick={() => setMetric('amps')}>Amps</button>
          <button type="button" className={`rounded-full px-3 py-1 ${metric === 'kwh' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`} onClick={() => setMetric('kwh')}>kWh</button>
          {stats && <span className="ml-4 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{stats.cadenceMinutes}-minute {copy.chart.cadence}</span>}
          <button type="button" className="ml-4 rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600" onClick={exportChart}>{copy.chart.download}</button>
        </div>
      </header>
      <div ref={ref} className="h-[360px] w-full" aria-label={copy.chart.demandChart} />
      {exportError && <p className="text-sm text-rose-600">{exportError}</p>}
      {stats && (
        <div className="grid gap-4 text-sm text-slate-600 sm:grid-cols-3">
          <div><p className="text-xs uppercase tracking-wide text-slate-500">{copy.report.cadence}</p><p className="font-semibold">{stats.cadenceMinutes} minute</p></div>
          <div><p className="text-xs uppercase tracking-wide text-slate-500">{copy.chart.coverage}</p><p className="font-semibold">{formatDate(stats.start)} — {formatDate(stats.end)}</p></div>
          <div><p className="text-xs uppercase tracking-wide text-slate-500">{copy.chart.dataQuality}</p><p className="font-semibold">{data.length.toLocaleString()} {copy.chart.intervals}</p></div>
        </div>
      )}
    </section>
  );
}

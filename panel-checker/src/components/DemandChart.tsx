import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import Plotly from 'plotly.js-dist-min';
import type { Config, Data, Layout, ModeBarDefaultButtons } from 'plotly.js';
import { IntervalDatum } from '../types';
import { computeDemandStats } from '../lib/parse';
import { convertToKwh } from '../lib/units';
import { renderDemandProfileSnapshot } from '../lib/snapshots';

interface Props {
  data: IntervalDatum[];
  chartRef?: MutableRefObject<HTMLDivElement | null>;
}

type Metric = 'amps' | 'kwh';

export default function DemandChart({ data, chartRef }: Props) {
  const fallbackRef = useRef<HTMLDivElement | null>(null);
  const ref = chartRef ?? fallbackRef;
  const [metric, setMetric] = useState<Metric>('amps');
  const [exportError, setExportError] = useState<string | null>(null);
  const stats = useMemo(() => computeDemandStats(data), [data]);
  const timestampFormatter = useMemo(
    () => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
    []
  );

  const derived = useMemo(
    () =>
      data.map((datum) => ({
        timestamp: datum.timestamp,
        amps: datum.amps,
        kwh: convertToKwh(datum.value, datum.unit, datum.voltage, datum.intervalMinutes)
      })),
    [data]
  );

  const chartDefinition = useMemo(() => {
    if (!derived.length) {
      return null;
    }
    const filtered = derived;
    const yLabel = metric === 'amps' ? 'Amps' : 'kWh';
    const hoverSuffix = metric === 'amps' ? 'A' : 'kWh';
    const series = filtered.map((datum) => (metric === 'amps' ? datum.amps : datum.kwh));
    const peak = filtered.reduce(
      (best, datum) => {
        const value = metric === 'amps' ? datum.amps : datum.kwh;
        if (value > best.value) {
          return { value, timestamp: datum.timestamp };
        }
        return best;
      },
      { value: -Infinity, timestamp: null as Date | null }
    );
    const peakLabel = peak.timestamp ? timestampFormatter.format(peak.timestamp) : '';

    const trace: Data = {
      name: metric === 'amps' ? 'Amps' : 'kWh',
      x: filtered.map((datum) => datum.timestamp),
      y: series,
      type: 'scatter',
      mode: 'lines',
      line: { color: '#1f6bc4', width: 2 },
      hovertemplate: `%{x}<br>%{y:.2f} ${hoverSuffix}<extra></extra>`
    };

    const peakTrace =
      peak.timestamp !== null
        ? ({
            name: 'Peak marker',
            x: [peak.timestamp],
            y: [peak.value],
            type: 'scatter',
            mode: 'text+markers',
            marker: { color: '#9cd956', size: 10 },
            text: [peakLabel ? `Peak — ${peakLabel}` : 'Peak'],
            textposition: 'top center',
            hovertemplate: peakLabel
              ? `Peak at ${peakLabel}<br>%{y:.2f} ${hoverSuffix}<extra></extra>`
              : `Peak %{y:.2f} ${hoverSuffix}<extra></extra>`
          } satisfies Data)
        : null;

    const layout: Partial<Layout> = {
      margin: { t: 32, r: 16, b: 48, l: 56 },
      paper_bgcolor: 'rgba(255,255,255,0)',
      plot_bgcolor: 'rgba(255,255,255,0)',
      xaxis: { title: 'Time', automargin: true },
      yaxis: { title: yLabel, rangemode: 'tozero', automargin: true },
      showlegend: true,
      legend: { orientation: 'h', x: 0, y: 1.15 },
      font: { family: 'Inter, sans-serif', color: '#021b33' }
    };

    const traces: Data[] = peakTrace ? [trace, peakTrace] : [trace];
    return { data: traces, layout };
  }, [derived, metric, timestampFormatter]);

  const chartConfig = useMemo(
    () => ({
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['select2d', 'lasso2d'] as ModeBarDefaultButtons[]
    } satisfies Partial<Config>),
    []
  );

  useEffect(() => {
    if (!ref.current || !chartDefinition) {
      return;
    }
    Plotly.newPlot(ref.current, chartDefinition.data, chartDefinition.layout, chartConfig);
    return () => {
      if (ref.current) {
        Plotly.purge(ref.current);
      }
    };
  }, [chartDefinition, chartConfig, ref]);

  const exportChart = async () => {
    if (!ref.current) return;
    try {
      setExportError(null);
      const snapshot = await renderDemandProfileSnapshot({ chartElement: ref.current, data, metric });
      const link = document.createElement('a');
      link.href = snapshot.dataUrl;
      link.download = `leeps-demand-profile-${metric}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      setExportError((error as Error).message || 'Unable to export the demand profile.');
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Demand profile</h2>
          {stats && (
            <p className="text-sm text-slate-600">
              One-year peak {stats.maxAmps.toFixed(0)} A · 95th percentile {stats.percentile95.toFixed(0)} A
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-600">View</span>
          <button
            type="button"
            className={`rounded-full px-3 py-1 ${metric === 'amps' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            onClick={() => setMetric('amps')}
          >
            Amps
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 ${metric === 'kwh' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            onClick={() => setMetric('kwh')}
          >
            kWh
          </button>
          {stats && (
            <span className="ml-4 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {stats.cadenceMinutes}-minute cadence
            </span>
          )}
          <button
            type="button"
            className="ml-4 rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600"
            onClick={exportChart}
          >
            Download demand profile PNG
          </button>
        </div>
      </header>

      <div ref={ref} className="h-[360px] w-full" aria-label="Demand chart" />

      {exportError && <p className="text-sm text-rose-600">{exportError}</p>}

      {stats && (
        <div className="grid gap-4 text-sm text-slate-600 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Cadence</p>
            <p className="font-semibold">{stats.cadenceMinutes} minute</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Coverage</p>
            <p className="font-semibold">
              {stats.start.toLocaleDateString()} — {stats.end.toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Data quality</p>
            <p className="font-semibold">{data.length.toLocaleString()} intervals</p>
          </div>
        </div>
      )}
    </section>
  );
}

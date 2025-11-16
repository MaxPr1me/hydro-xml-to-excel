import { useEffect, useMemo, useRef, useState } from 'react';
import Plotly from 'plotly.js-dist-min';
import { IntervalDatum } from '../types';
import { computeDemandStats } from '../lib/parse';
import { convertToKwh } from '../lib/units';

interface Props {
  data: IntervalDatum[];
}

type Metric = 'amps' | 'kwh';

export default function DemandChart({ data }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [windowMinutes, setWindowMinutes] = useState<15 | 60>(15);
  const [metric, setMetric] = useState<Metric>('amps');
  const stats = useMemo(() => computeDemandStats(data), [data]);

  const derived = useMemo(
    () =>
      data.map((datum) => ({
        timestamp: datum.timestamp,
        amps: datum.amps,
        kwh: convertToKwh(datum.value, datum.unit, datum.voltage, datum.intervalMinutes)
      })),
    [data]
  );

  const pointsPerWindow = useMemo(() => {
    if (!data.length) {
      return 1;
    }
    const cadence = data[0].intervalMinutes || 15;
    return Math.max(1, Math.round(windowMinutes / cadence));
  }, [data, windowMinutes]);

  useEffect(() => {
    if (!ref.current || !derived.length) {
      return;
    }

    const filtered = pointsPerWindow === 1 ? derived : derived.filter((_, index) => index % pointsPerWindow === 0);
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

    const trace: Plotly.Data = {
      x: filtered.map((datum) => datum.timestamp),
      y: series,
      type: 'scatter',
      mode: 'lines',
      line: { color: '#0ea5e9', width: 2 },
      hovertemplate: `%{x}<br>%{y:.2f} ${hoverSuffix}<extra></extra>`
    };

    const peakTrace =
      peak.timestamp !== null
        ? ({
            x: [peak.timestamp],
            y: [peak.value],
            type: 'scatter',
            mode: 'text+markers',
            marker: { color: '#f97316', size: 10 },
            text: ['Peak'],
            textposition: 'top center',
            hovertemplate: `Peak %{y:.2f} ${hoverSuffix}<extra></extra>`
          } satisfies Plotly.Data)
        : null;

    const layout: Partial<Plotly.Layout> = {
      margin: { t: 32, r: 16, b: 48, l: 56 },
      paper_bgcolor: 'rgba(255,255,255,0)',
      plot_bgcolor: 'rgba(255,255,255,0)',
      xaxis: { title: 'Time', automargin: true },
      yaxis: { title: yLabel, rangemode: 'tozero', automargin: true },
      showlegend: false,
      font: { family: 'Inter, sans-serif', color: '#0f172a' }
    };

    const traces: Plotly.Data[] = peakTrace ? [trace, peakTrace] : [trace];

    Plotly.newPlot(ref.current, traces, layout, {
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['select2d', 'lasso2d']
    });

    return () => {
      Plotly.purge(ref.current as HTMLDivElement);
    };
  }, [derived, metric, pointsPerWindow]);

  const exportChart = () => {
    if (!ref.current) return;
    Plotly.downloadImage(ref.current, {
      filename: `panel-checker-${metric}`,
      format: 'png',
      width: 1280,
      height: 720
    });
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
          <span className="ml-4 text-slate-600">Window</span>
          <button
            type="button"
            className={`rounded-full px-3 py-1 ${windowMinutes === 15 ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            onClick={() => setWindowMinutes(15)}
          >
            15 min
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 ${windowMinutes === 60 ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            onClick={() => setWindowMinutes(60)}
          >
            Hourly
          </button>
          <button
            type="button"
            className="ml-4 rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600"
            onClick={exportChart}
          >
            Export PNG
          </button>
        </div>
      </header>

      <div ref={ref} className="h-[360px] w-full" aria-label="Demand chart" />

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

import { useEffect, useMemo, useRef, useState } from 'react';
import Plotly from 'plotly.js-dist-min';
import { computeDemandStats } from '../lib/parse';
export default function DemandChart({ data }) {
    const ref = useRef(null);
    const [windowMinutes, setWindowMinutes] = useState(15);
    const stats = useMemo(() => computeDemandStats(data), [data]);
    useEffect(() => {
        if (!ref.current || !data.length) {
            return;
        }
        const filtered = data.filter((datum, index) => {
            if (windowMinutes === 60) {
                return index % 4 === 0;
            }
            return true;
        });
        const trace = {
            x: filtered.map((datum) => datum.timestamp),
            y: filtered.map((datum) => datum.amps),
            type: 'scatter',
            mode: 'lines',
            line: { color: '#0ea5e9', width: 2 },
            hovertemplate: '%{x}<br>%{y:.1f} A<extra></extra>'
        };
        const layout = {
            margin: { t: 32, r: 16, b: 48, l: 48 },
            paper_bgcolor: 'rgba(255,255,255,0)',
            plot_bgcolor: 'rgba(255,255,255,0)',
            xaxis: { title: 'Time', automargin: true },
            yaxis: { title: 'Amps', rangemode: 'tozero', automargin: true },
            showlegend: false,
            font: { family: 'Inter, sans-serif', color: '#0f172a' }
        };
        Plotly.newPlot(ref.current, [trace], layout, {
            responsive: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['select2d', 'lasso2d']
        });
        return () => {
            Plotly.purge(ref.current);
        };
    }, [data, windowMinutes]);
    return (<section className="space-y-3 rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Demand profile</h2>
          {stats && (<p className="text-sm text-slate-600">
              Peak {stats.maxAmps.toFixed(0)} A · 95th percentile {stats.percentile95.toFixed(0)} A
            </p>)}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-600">Window</span>
          <button type="button" className={`rounded-full px-3 py-1 ${windowMinutes === 15 ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`} onClick={() => setWindowMinutes(15)}>
            15 min
          </button>
          <button type="button" className={`rounded-full px-3 py-1 ${windowMinutes === 60 ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`} onClick={() => setWindowMinutes(60)}>
            Hourly
          </button>
        </div>
      </header>

      <div ref={ref} className="h-[360px] w-full" aria-label="Demand chart"/>

      {stats && (<div className="grid gap-4 text-sm text-slate-600 sm:grid-cols-3">
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
        </div>)}
    </section>);
}

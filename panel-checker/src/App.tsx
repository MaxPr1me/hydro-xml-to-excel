import { useMemo, useState } from 'react';
import Home from './pages/Home';
import Results from './pages/Results';
import { IntervalDatum } from './types';

const tabs = [
  { id: 'upload', label: 'Upload & validate' },
  { id: 'results', label: 'Results' }
] as const;

export default function App() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('upload');
  const [data, setData] = useState<IntervalDatum[]>([]);

  const actions = useMemo(
    () => ({
      onData: (records: IntervalDatum[]) => {
        setData(records);
        setActiveTab('results');
      }
    }),
    []
  );

  return (
    <div className="min-h-screen bg-brand-50 text-brand-900">
      <header className="bg-brand-900 text-white shadow-lg">
        <div className="h-1 bg-accent-500" aria-hidden />
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="space-y-2">
              <p className="text-4xl font-black tracking-[0.3em]">LEEP</p>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-brand-100">
                Local Energy Efficiency Partnerships
              </p>
            </div>
            <div className="text-right text-brand-100">
              <p className="text-sm font-semibold uppercase tracking-[0.4em] text-accent-200">Proven Demand Method</p>
              <p className="text-base">Electrical panel guidance for retrofit teams.</p>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold leading-snug">
              LEEP's Electrical Panel Screening Tool - Proven Demand Method
            </h1>
            <p className="text-sm text-brand-100 max-w-4xl">
              Upload interval data, validate cadence and units, graph peak demand, and capture a screening summary for permit
              packages — all aligned with the LEEP Proven Demand Method.
            </p>
          </div>

          <nav className="flex flex-wrap gap-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-white text-brand-900 shadow'
                    : 'bg-white/10 text-brand-100 hover:bg-white/20'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {activeTab === 'upload' ? <Home onData={actions.onData} /> : <Results data={data} />}

      <footer className="bg-brand-900/90 text-brand-100">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs">
          <p>Installable PWA · Works offline after first load.</p>
          <p>Bilingual copy ready for field teams.</p>
        </div>
      </footer>
    </div>
  );
}

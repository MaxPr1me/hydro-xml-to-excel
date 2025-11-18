import { useCallback, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import Results from './pages/Results';
import { IntervalDatum } from './types';

const tabs = [
  { id: 'upload', label: 'Upload & validate', path: '/' },
  { id: 'results', label: 'Results', path: '/results' }
] as const;

export default function App() {
  const [data, setData] = useState<IntervalDatum[]>([]);
  const navigate = useNavigate();

  const handleData = useCallback(
    (records: IntervalDatum[]) => {
      setData(records);
      navigate('/results');
    },
    [navigate]
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
              <NavLink
                key={tab.id}
                to={tab.path}
                end={tab.path === '/'}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive ? 'bg-white text-brand-900 shadow' : 'bg-white/10 text-brand-100 hover:bg-white/20'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Home onData={handleData} />} />
        <Route path="/results" element={<Results data={data} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <footer className="bg-brand-900/90 text-brand-100">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs">
          <p>Installable PWA · Works offline after first load.</p>
          <p>Bilingual copy ready for field teams.</p>
        </div>
      </footer>
    </div>
  );
}

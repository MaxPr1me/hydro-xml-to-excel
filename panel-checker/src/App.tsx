import { useCallback, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import Results from './pages/Results';
import { IntervalDatum } from './types';
import { textEn } from './content/text';

const tabs = [
  { id: 'upload', label: textEn.nav.upload, path: '/' },
  { id: 'results', label: textEn.nav.results, path: '/results' }
] as const;

export default function App() {
  const [data, setData] = useState<IntervalDatum[]>([]);
  const navigate = useNavigate();
  const sparkLogoUrl = `${import.meta.env.BASE_URL}spark-logo.svg`;

  const handleData = useCallback(
    (records: IntervalDatum[]) => {
      setData(records);
      navigate('/results');
    },
    [navigate]
  );

  return (
    <div className="min-h-screen bg-brand-50 text-[#0F2941]">
      <header className="bg-white text-[#0F2941] shadow-lg">
        <div className="h-1 bg-[#FFC933]" aria-hidden />
        <div className="bg-[#0F2941] text-white">
          <div className="mx-auto max-w-6xl px-4 py-2 text-sm font-semibold tracking-[0.4em] uppercase">
            {textEn.organization}
          </div>
        </div>
        <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
          <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center">
            <div className="flex-1 space-y-4 text-center lg:text-left">
              <p className="text-sm font-semibold uppercase tracking-[0.4em] text-[#0F2941]">
                {textEn.toolName}
              </p>
              <h1 className="text-3xl font-black lg:text-4xl">{textEn.subtitle}</h1>
              <p className="text-base text-[#0F2941] lg:max-w-2xl">{textEn.heroParagraph}</p>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#0F2941]/80">
                {textEn.heroTagline}
              </p>
            </div>
            <div className="flex flex-1 justify-center">
              <img
                src={sparkLogoUrl}
                alt="SPARK load profile logo"
                className="w-full max-w-md"
              />
            </div>
          </div>

          <nav className="flex flex-wrap gap-3">
            {tabs.map((tab) => (
              <NavLink
                key={tab.id}
                to={tab.path}
                end={tab.path === '/'}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-sm font-semibold transition ${
                    isActive ? 'bg-[#0F2941] text-white shadow' : 'bg-[#0F2941]/5 text-[#0F2941] hover:bg-[#0F2941]/10'
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

      <footer className="bg-[#0F2941] text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs">
          <p>{textEn.footer.pwa}</p>
          <p>{textEn.footer.bilingual}</p>
          <p className="flex flex-wrap gap-1">
            <span>{textEn.footer.license.prefix}</span>
            <a
              href={textEn.footer.license.url}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-white/60 underline-offset-2 hover:decoration-white"
            >
              {textEn.footer.license.linkLabel}
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

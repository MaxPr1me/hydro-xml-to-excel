import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useNavigate, useSearchParams } from 'react-router-dom';
import Home from './pages/Home';
import Results from './pages/Results';
import { AnalysisState } from './types';
import { I18nContext, Language, localizeError, translations } from './content/i18n';
import { initAnalytics, trackToolLoaded } from './analytics';
import { buildLicenseUrl } from './utils/repoLinks';

const LANG_STORAGE_KEY = 'spark-lang';

export default function App() {
  const [analysis, setAnalysis] = useState<AnalysisState>({ source: 'none', data: [] });
  const [searchParams, setSearchParams] = useSearchParams();
  const initialLang = (searchParams.get('lang') as Language) || (localStorage.getItem(LANG_STORAGE_KEY) as Language) || 'en';
  const [lang, setLang] = useState<Language>(initialLang === 'fr' ? 'fr' : 'en');
  const navigate = useNavigate();
  const sparkLogoUrl = `${import.meta.env.BASE_URL}spark-logo.svg`;

  const copy = translations[lang];

  useEffect(() => {
    initAnalytics();
    trackToolLoaded();
  }, []);

  useEffect(() => {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    const next = new URLSearchParams(searchParams);
    next.set('lang', lang);
    setSearchParams(next, { replace: true });
    document.documentElement.lang = lang === 'fr' ? 'fr-CA' : 'en-CA';
  }, [lang, searchParams, setSearchParams]);

  const handleAnalysisReady = useCallback(
    (payload: AnalysisState) => {
      setAnalysis(payload);
      navigate('/results');
    },
    [navigate]
  );

  const tabs = useMemo(
    () => [
      { id: 'upload', label: copy.nav.upload, path: '/' },
      { id: 'results', label: copy.nav.results, path: '/results' }
    ],
    [copy.nav.results, copy.nav.upload]
  );

  const value = useMemo(
    () => ({
      lang,
      copy,
      toggleLanguage: () => setLang((prev) => (prev === 'en' ? 'fr' : 'en')),
      formatDate: (date: Date) => date.toLocaleDateString(lang === 'fr' ? 'fr-CA' : 'en-CA'),
      translateError: (message: string) => localizeError(message, lang)
    }),
    [copy, lang]
  );

  return (
    <I18nContext.Provider value={value}>
      <div className="min-h-screen bg-brand-50 text-[#0F2941]">
        <header className="bg-white text-[#0F2941] shadow-lg">
          <div className="h-1 bg-[#FFC933]" aria-hidden />
          <div className="bg-[#0F2941] text-white">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2 text-sm font-semibold tracking-[0.4em] uppercase">
              <span>{copy.organization}</span>
              <button type="button" onClick={value.toggleLanguage} className="text-xs tracking-normal underline">
                {copy.languageToggle}
              </button>
            </div>
          </div>
          <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
            <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center">
              <div className="flex-1 space-y-4 text-center lg:text-left">
                <p className="text-sm font-semibold uppercase tracking-[0.4em] text-[#0F2941]">{copy.toolName}</p>
                <h1 className="text-3xl font-black lg:text-4xl">{copy.subtitle}</h1>
                <p className="text-base text-[#0F2941] lg:max-w-2xl">{copy.heroParagraph}</p>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#0F2941]/80">{copy.heroTagline}</p>
              </div>
              <div className="flex flex-1 justify-center">
                <img src={sparkLogoUrl} alt={copy.logoAlt} className="w-full max-w-md" />
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
          <Route path="/" element={<Home onAnalysisReady={handleAnalysisReady} />} />
          <Route path="/results" element={<Results analysis={analysis} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <footer className="bg-[#0F2941] text-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs">
            <p>{copy.footer.pwa}</p>
            <p>
              <a href={buildLicenseUrl()} className="font-semibold underline">
                {copy.footer.license}
              </a>
            </p>
            <p>
              {copy.footer.contact}: <span className="font-semibold">{copy.footer.contactValue}</span>
            </p>
          </div>
        </footer>
      </div>
    </I18nContext.Provider>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import Home from './pages/Home';
import Results from './pages/Results';
import { AnalysisState } from './types';
import { Locale, textByLocale } from './content/text';
import { routeForLocale } from './utils/routing';
import { initAnalytics, trackToolLoaded } from './analytics';
import { buildLicenseUrl } from './utils/repoLinks';
import { useWetEnhance } from './hooks/useWetEnhance';

const tabs = [
  { id: 'upload', label: 'upload' as const, path: '' },
  { id: 'results', label: 'results' as const, path: 'results' }
] as const;

function LocaleLayout() {
  const { lang } = useParams<{ lang: Locale }>();
  const locale: Locale = lang === 'fr' ? 'fr' : 'en';
  const text = textByLocale[locale];
  const [analysis, setAnalysis] = useState<AnalysisState>({ source: 'none', data: [] });
  const navigate = useNavigate();
  const location = useLocation();
  const sparkLogoUrl = `${import.meta.env.BASE_URL}spark-logo.svg`;

  const handleAnalysisReady = useCallback(
    (payload: AnalysisState) => {
      setAnalysis(payload);
      navigate(routeForLocale(locale, 'results'));
    },
    [locale, navigate]
  );

  useEffect(() => {
    localStorage.setItem('spark.locale', locale);
  }, [locale]);

  useEffect(() => {
    const pageName = location.pathname.endsWith('/results') ? text.nav.results : text.nav.upload;
    document.title = `${text.toolName} – ${pageName}`;
  }, [location.pathname, text.nav.results, text.nav.upload, text.toolName]);

  useWetEnhance([location.pathname, locale]);

  const breadcrumbLabel = useMemo(
    () => (location.pathname.endsWith('/results') ? text.nav.results : text.nav.upload),
    [location.pathname, text.nav.results, text.nav.upload]
  );

  return (
    <div className="wb-init">
      <header>
        <div id="wb-bnr" className="container">
          <div className="brand">
            <p className="h4 mrgn-tp-sm mrgn-bttm-0">Natural Resources Canada</p>
            <p className="mrgn-tp-0">CanmetENERGY-Ottawa</p>
          </div>
          <nav aria-label={text.language.switchLabel} className="text-right">
            <ul className="list-inline mrgn-tp-md mrgn-bttm-0">
              <li>
                <NavLink to={routeForLocale('en')} className={locale === 'en' ? 'font-weight-bold' : ''}>English</NavLink>
              </li>
              <li>
                <NavLink to={routeForLocale('fr')} className={locale === 'fr' ? 'font-weight-bold' : ''}>Français</NavLink>
              </li>
            </ul>
          </nav>
        </div>
        <div className="gcweb-menu" data-trgt="mb-pnl" />
        <div className="container">
          <h1 property="name" className="mrgn-tp-lg">{text.toolName}</h1>
          <p>{text.whatThisToolDoes}</p>
        </div>
        <nav aria-label="Breadcrumb" className="container">
          <ol className="breadcrumb">
            <li><NavLink to={routeForLocale(locale)}>{text.nav.upload}</NavLink></li>
            <li aria-current="page">{breadcrumbLabel}</li>
          </ol>
        </nav>
        <nav className="container" aria-label="Primary">
          <ul className="list-inline">
            {tabs.map((tab) => (
              <li key={tab.id} className="mrgn-rght-md">
                <NavLink to={routeForLocale(locale, tab.path)} end={!tab.path}>{text.nav[tab.label]}</NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <Routes>
        <Route index element={<Home onAnalysisReady={handleAnalysisReady} locale={locale} />} />
        <Route path="results" element={<Results analysis={analysis} locale={locale} />} />
      </Routes>

      <footer id="wb-info">
        <div className="container">
          <h2 className="wb-inv">About this site</h2>
          <p>{text.footer.license} <a href={buildLicenseUrl()}>Read the license</a>.</p>
          <p>Contact: <a href="mailto:leep@nrcan-rncan.gc.ca">leep@nrcan-rncan.gc.ca</a></p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    initAnalytics();
    trackToolLoaded();
  }, []);


  return (
    <Routes>
      <Route path="/" element={<LocaleLayout />} />
      <Route path="/:lang(en|fr)/*" element={<LocaleLayout />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

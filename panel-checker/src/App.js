import { useMemo, useState } from 'react';
import Home from './pages/Home';
import Results from './pages/Results';
const tabs = [
    { id: 'upload', label: 'Upload & validate' },
    { id: 'results', label: 'Results' }
];
export default function App() {
    const [activeTab, setActiveTab] = useState('upload');
    const [data, setData] = useState([]);
    const actions = useMemo(() => ({
        onData: (records) => {
            setData(records);
            setActiveTab('results');
        }
    }), []);
    return (<div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">
              LEEP SPARK Tool – System for Peak Amperage from Real kWh
            </p>
            <p className="text-sm text-slate-500">
              CSV → validation → charts → calculator → report.
            </p>
          </div>
          <nav className="flex gap-2">
            {tabs.map((tab) => (<button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeTab === tab.id ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                {tab.label}
              </button>))}
          </nav>
        </div>
      </header>

      {activeTab === 'upload' ? <Home onData={actions.onData}/> : <Results data={data}/>}

      <footer className="border-t border-slate-200 bg-white/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-slate-500">
          <p>Installable PWA · Works offline after first load.</p>
          <p>English / Français copy ready.</p>
        </div>
      </footer>
    </div>);
}

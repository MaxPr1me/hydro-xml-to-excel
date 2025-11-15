import DemandChart from '../components/DemandChart';
import { useState } from 'react';
import PanelCalculator from '../components/PanelCalculator';
import ReportCard from '../components/ReportCard';
export default function Results({ data }) {
    const [verdict, setVerdict] = useState(null);
    if (!data.length) {
        return (<main className="mx-auto max-w-5xl px-4 py-10">
        <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
          Upload data first to unlock the charts and calculator.
        </div>
      </main>);
    }
    return (<main className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <DemandChart data={data}/>
      <PanelCalculator data={data} onVerdictChange={setVerdict}/>
      {verdict && <ReportCard data={data} verdict={verdict}/>}
    </main>);
}

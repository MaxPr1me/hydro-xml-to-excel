import { downloadTextFile } from '../lib/download';
import { computeDemandStats } from '../lib/parse';
export default function ReportCard({ data, verdict }) {
    const stats = computeDemandStats(data);
    const downloadReport = () => {
        if (!stats)
            return;
        const lines = [
            "LEEP's Electrical Panel Screening Tool - Proven Demand Method",
            `Coverage: ${stats.start.toISOString()} — ${stats.end.toISOString()}`,
            `Cadence: ${stats.cadenceMinutes} minutes`,
            `Peak amps: ${stats.maxAmps.toFixed(1)}`,
            `95th percentile: ${stats.percentile95.toFixed(1)}`,
            `Verdict: ${verdict.status}`,
            `Margin: ${verdict.availableMargin.toFixed(1)} A`,
            '',
            'This is a screening tool only. Confirm with a licensed electrician.'
        ];
        downloadTextFile('panel-checker-report.txt', lines.join('\n'));
    };
    return (<section className="space-y-3 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">One-page report</h2>
          <p className="text-sm text-slate-600">Copy the highlights for your permit package.</p>
        </div>
        <button type="button" onClick={downloadReport} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
          Download summary
        </button>
      </div>

      {stats && (<dl className="grid gap-4 sm:grid-cols-2">
          <Stat label="Coverage" value={`${stats.start.toLocaleDateString()} — ${stats.end.toLocaleDateString()}`}/>
          <Stat label="Cadence" value={`${stats.cadenceMinutes}-minute data`}/>
          <Stat label="Peak amps" value={`${stats.maxAmps.toFixed(1)} A`}/>
          <Stat label="95th percentile" value={`${stats.percentile95.toFixed(1)} A`}/>
          <Stat label="Verdict" value={`${verdict.status} (${verdict.availableMargin.toFixed(1)} A margin)`}/>
        </dl>)}

      <p className="text-xs text-slate-500">
        Screening tool only — always confirm against the Canadian Electrical Code, NEC, and utility requirements.
      </p>
    </section>);
}
function Stat({ label, value }) {
    return (<div className="rounded-xl border border-slate-200 p-4">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="text-lg font-semibold text-slate-900">{value}</dd>
    </div>);
}

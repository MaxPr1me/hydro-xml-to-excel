import { useEffect, useMemo, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { calculateVerdict, diversifiedLoad } from '../lib/calc';
import { AnalysisState, IntervalDatum, LoadEntry, PanelInputs, PanelVerdict } from '../types';
import InfoBubble from './InfoBubble';
import { textEn } from '../content/text';

interface Props {
  analysis: AnalysisState;
  onVerdictChange?: (verdict: PanelVerdict) => void;
}

const serviceSizes = [60, 70, 80, 100, 125, 150, 200];

export default function PanelCalculator({ analysis, onVerdictChange }: Props) {
  const [inputs, setInputs] = useState<PanelInputs>({
    serviceRating: 100,
    mainBreaker: 100,
    busRating: 225,
    voltage: 240,
    existingLoads: [],
    newLoads: []
  });

  const manualMode = analysis.source === 'manual' && !!analysis.manualPeak;
  const baseline = useMemo(() => {
    if (manualMode && analysis.manualPeak) {
      return Number((analysis.manualPeak.amps * 1.25).toFixed(1));
    }
    return oneYearPeakLoad(analysis.data);
  }, [analysis, manualMode]);

  useEffect(() => {
    setInputs((prev) => {
      const baseEntry: LoadEntry = {
        id: prev.existingLoads[0]?.id ?? uuid(),
        name: manualMode ? 'Manual peak demand (user input ×1.25)' : 'One-year peak demand (×1.25)',
        amps: baseline,
        continuous: false
      };
      return {
        ...prev,
        existingLoads: [baseEntry, ...prev.existingLoads.slice(1)]
      };
    });
  }, [baseline, manualMode]);

  useEffect(() => {
    if (!manualMode || !analysis.manualPeak) {
      return;
    }
    const manualVoltage = analysis.manualPeak.voltage;
    setInputs((prev) => (prev.voltage === manualVoltage ? prev : { ...prev, voltage: manualVoltage }));
  }, [analysis, manualMode]);

  const verdict = useMemo<PanelVerdict>(() => calculateVerdict(inputs, baseline), [inputs, baseline]);

  useEffect(() => {
    onVerdictChange?.(verdict);
  }, [verdict, onVerdictChange]);

  const addLoad = (list: 'existingLoads' | 'newLoads') => {
    setInputs((prev) => ({
      ...prev,
      [list]: [
        ...prev[list],
        { id: uuid(), name: list === 'newLoads' ? 'New appliance' : 'Load', amps: 10, continuous: false }
      ]
    }));
  };

  const updateLoad = (list: 'existingLoads' | 'newLoads', id: string, value: Partial<LoadEntry>) => {
    setInputs((prev) => ({
      ...prev,
      [list]: prev[list].map((item) => (item.id === id ? { ...item, ...value } : item))
    }));
  };

  const removeLoad = (list: 'existingLoads' | 'newLoads', id: string) => {
    setInputs((prev) => ({
      ...prev,
      [list]: prev[list].filter((item) => item.id !== id)
    }));
  };

  const totalExisting = useMemo(() => diversifiedLoad(inputs.existingLoads), [inputs.existingLoads]);
  const totalNew = useMemo(() => diversifiedLoad(inputs.newLoads), [inputs.newLoads]);

  const verdictBadge =
    verdict.status === 'OK'
      ? 'bg-emerald-100 text-emerald-700'
      : verdict.status === 'Review'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-rose-100 text-rose-700';

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Panel calculator</h2>
          <p className="text-sm text-slate-600">
            {manualMode
              ? 'Using a user-entered peak interval (converted to amps ×1.25). Treat these results as provisional until verified with interval data.'
              : 'We start from the absolute one-year max (×1.25) and apply 125% to continuous loads, 100% otherwise.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <InfoBubble label="Help for panel calculator">{textEn.help.panel}</InfoBubble>
          <span className={`rounded-full px-4 py-1 text-sm font-semibold ${verdictBadge}`}>{verdict.status}</span>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Service size
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={inputs.serviceRating}
            onChange={(event) => {
              const value = Number(event.target.value);
              setInputs((prev) => ({ ...prev, serviceRating: value, mainBreaker: value }));
            }}
          >
            {serviceSizes.map((size) => (
              <option key={size} value={size}>
                {size} A
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-slate-700">
          Main breaker
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={inputs.mainBreaker}
            onChange={(event) => {
              const value = Number(event.target.value);
              setInputs((prev) => ({ ...prev, mainBreaker: value }));
            }}
            min={60}
          />
        </label>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <LoadList
          title="Existing diversified load"
          items={inputs.existingLoads}
          onAdd={() => addLoad('existingLoads')}
          onChange={(id, value) => updateLoad('existingLoads', id, value)}
          onRemove={(id) => removeLoad('existingLoads', id)}
          total={totalExisting}
          lockFirst
        />

        <LoadList
          title="What-if appliances"
          items={inputs.newLoads}
          onAdd={() => addLoad('newLoads')}
          onChange={(id, value) => updateLoad('newLoads', id, value)}
          onRemove={(id) => removeLoad('newLoads', id)}
          total={totalNew}
        />
      </div>

      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-semibold">Available margin</p>
        <p className="text-2xl font-bold text-slate-900">{verdict.availableMargin.toFixed(1)} A</p>
        <p>{verdict.message} Always confirm with local code (CEC/NEC) and utility rules.</p>
      </div>
    </section>
  );
}

interface ListProps {
  title: string;
  items: LoadEntry[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, value: Partial<LoadEntry>) => void;
  total: number;
  lockFirst?: boolean;
}

function LoadList({ title, items, onAdd, onRemove, onChange, total, lockFirst }: ListProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        <button
          type="button"
          className="rounded-full border border-brand-600 px-3 py-1 text-xs font-semibold text-brand-700"
          onClick={onAdd}
        >
          Add load
        </button>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={item.id} className="grid gap-2 rounded-xl border border-slate-200 p-3 text-sm sm:grid-cols-[1fr,120px,100px]">
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              value={item.name}
              onChange={(event) => onChange(item.id, { name: event.target.value })}
              placeholder="Name"
            />
            <input
              type="number"
              min={0}
              className="rounded-lg border border-slate-200 px-3 py-2"
              value={item.amps}
              onChange={(event) => onChange(item.id, { amps: Number(event.target.value) })}
            />
            <label className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={item.continuous}
                onChange={(event) => onChange(item.id, { continuous: event.target.checked })}
              />
              Continuous
            </label>
            <button
              type="button"
              className={`text-xs font-medium text-rose-600 hover:underline ${lockFirst && index === 0 ? 'pointer-events-none opacity-20' : ''}`}
              onClick={() => onRemove(item.id)}
              disabled={lockFirst && index === 0}
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs uppercase tracking-wide text-slate-500">Diversified total: {total.toFixed(1)} A</p>
    </div>
  );
}

function oneYearPeakLoad(records: IntervalDatum[]) {
  if (!records.length) return 0;
  const peak = records.reduce((max, datum) => Math.max(max, datum.amps), 0);
  return Number((peak * 1.25).toFixed(1));
}

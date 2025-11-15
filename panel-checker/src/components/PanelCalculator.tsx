import { useEffect, useMemo, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { calculateVerdict, diversifiedLoad } from '../lib/calc';
import { IntervalDatum, LoadEntry, PanelInputs, PanelVerdict } from '../types';

interface Props {
  data: IntervalDatum[];
  onVerdictChange?: (verdict: PanelVerdict) => void;
}

const serviceSizes = [100, 125, 150, 200, 225, 400];

export default function PanelCalculator({ data, onVerdictChange }: Props) {
  const [inputs, setInputs] = useState<PanelInputs>({
    serviceRating: 200,
    mainBreaker: 200,
    busRating: 225,
    voltage: 240,
    existingLoads: [
      { id: uuid(), name: 'Existing demand (95th percentile)', amps: demandPercentile(data), continuous: true }
    ],
    newLoads: []
  });

  useEffect(() => {
    setInputs((prev) => ({
      ...prev,
      existingLoads: prev.existingLoads.map((load, index) =>
        index === 0 ? { ...load, amps: demandPercentile(data) } : load
      )
    }));
  }, [data]);

  const verdict = useMemo<PanelVerdict>(() => calculateVerdict(inputs, peakDemand(data)), [inputs, data]);

  useEffect(() => {
    onVerdictChange?.(verdict);
  }, [verdict, onVerdictChange]);

  function demandPercentile(records: IntervalDatum[]) {
    if (!records.length) return 0;
    const sorted = [...records.map((item) => item.amps)].sort((a, b) => a - b);
    const index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
    return Number(sorted[index].toFixed(1));
  }

  function peakDemand(records: IntervalDatum[]) {
    return records.reduce((max, datum) => Math.max(max, datum.amps), 0);
  }

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
          <p className="text-sm text-slate-600">We apply 125% to continuous loads and 100% otherwise.</p>
        </div>
        <span className={`rounded-full px-4 py-1 text-sm font-semibold ${verdictBadge}`}>{verdict.status}</span>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Service size
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={inputs.serviceRating}
            onChange={(event) => setInputs((prev) => ({ ...prev, serviceRating: Number(event.target.value) }))}
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
            onChange={(event) => setInputs((prev) => ({ ...prev, mainBreaker: Number(event.target.value) }))}
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
}

function LoadList({ title, items, onAdd, onRemove, onChange, total }: ListProps) {
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
        {items.map((item) => (
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
              className="text-xs font-medium text-rose-600 hover:underline"
              onClick={() => onRemove(item.id)}
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

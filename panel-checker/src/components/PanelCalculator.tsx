import { type MutableRefObject, type ReactNode, useEffect, useMemo, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { calculateVerdict, diversifiedLoad } from '../lib/calc';
import { AnalysisState, IntervalDatum, LoadEntry, PanelInputs, PanelVerdict } from '../types';
import InfoBubble from './InfoBubble';
import { useI18n } from '../content/i18n';
import { trackAnalysisResult } from '../analytics';

interface Props {
  analysis: AnalysisState;
  onVerdictChange?: (verdict: PanelVerdict) => void;
  sectionRef?: MutableRefObject<HTMLElement | null>;
}

const serviceSizes = [60, 70, 80, 100, 125, 150, 200];

export default function PanelCalculator({ analysis, onVerdictChange, sectionRef }: Props) {
  const { copy, translateError } = useI18n();
  const [inputs, setInputs] = useState<PanelInputs>({
    serviceRating: 100,
    mainBreaker: 100,
    breakerLoadingEnabled: true,
    breakerLoadingPercent: 80,
    busRating: 225,
    voltage: 240,
    existingLoads: [],
    newLoads: [],
    existingAdjustmentEnabled: false,
    existingAdjustmentPercent: 125
  });

  const manualMode = analysis.source === 'manual' && !!analysis.manualPeak;
  const baseline = useMemo(() => {
    if (manualMode && analysis.manualPeak) {
      return Number(analysis.manualPeak.amps.toFixed(1));
    }
    return provenDemand(analysis.data);
  }, [analysis, manualMode]);

  const cadenceMinutes = useMemo(() => inferCadenceMinutes(analysis), [analysis]);
  const resetKey = useMemo(
    () => `${analysis.source}-${analysis.data.length}-${analysis.manualPeak?.amps ?? 'none'}`,
    [analysis]
  );

  useEffect(() => {
    setInputs((prev) => {
      const baseEntry: LoadEntry = {
        id: prev.existingLoads[0]?.id ?? uuid(),
        name: manualMode ? copy.report.manualPeak : copy.chart.peakLine,
        amps: baseline,
        continuous: false
      };
      return {
        ...prev,
        existingLoads: [baseEntry, ...prev.existingLoads.slice(1)]
      };
    });
  }, [baseline, manualMode, resetKey]);

  useEffect(() => {
    if (!manualMode || !analysis.manualPeak) {
      return;
    }
    const manualVoltage = analysis.manualPeak.voltage;
    setInputs((prev) => (prev.voltage === manualVoltage ? prev : { ...prev, voltage: manualVoltage }));
  }, [analysis, manualMode]);

  useEffect(() => {
    setInputs((prev) => ({
      ...prev,
      existingAdjustmentEnabled: cadenceMinutes === 60,
      existingAdjustmentPercent: prev.existingAdjustmentPercent || 125
    }));
  }, [cadenceMinutes, resetKey]);

  const verdict = useMemo<PanelVerdict>(() => calculateVerdict(inputs, baseline), [inputs, baseline]);

  useEffect(() => {
    onVerdictChange?.(verdict);
  }, [verdict, onVerdictChange]);

  useEffect(() => {
    const mode = analysis.mode === 'ns-power-smoc' ? 'ns_power' : 'flex';
    const method = manualMode ? 'manual_peak' : 'verified';
    const maxDemand = manualMode && analysis.manualPeak
      ? analysis.manualPeak.amps
      : analysis.data.reduce((max, datum) => Math.max(max, datum.amps), 0);
    trackAnalysisResult({
      mode,
      method,
      jurisdiction: analysis.mode === 'ns-power-smoc' ? 'NS' : undefined,
      panelRatingAmps: inputs.mainBreaker,
      maxDemandAmpsRounded: maxDemand ? Math.round(maxDemand / 5) * 5 : undefined,
      upgradeRequired: verdict.status === 'Upgrade'
    });
  }, [analysis, inputs.mainBreaker, manualMode, verdict]);

  const addLoad = (list: 'existingLoads' | 'newLoads') => {
    setInputs((prev) => ({
      ...prev,
      [list]: [
        ...prev[list],
        { id: uuid(), name: list === 'newLoads' ? copy.calculator.proposedLoads : copy.report.loadFallback, amps: 10, continuous: false }
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
  const adjustedExisting = useMemo(
    () =>
      inputs.existingAdjustmentEnabled
        ? totalExisting * (inputs.existingAdjustmentPercent / 100)
        : totalExisting,
    [inputs.existingAdjustmentEnabled, inputs.existingAdjustmentPercent, totalExisting]
  );
  const limitingBreaker = useMemo(
    () => Math.min(inputs.mainBreaker, inputs.serviceRating),
    [inputs.mainBreaker, inputs.serviceRating]
  );
  const effectiveBreaker = useMemo(
    () => limitingBreaker * (inputs.breakerLoadingEnabled ? inputs.breakerLoadingPercent / 100 : 1),
    [inputs.breakerLoadingEnabled, inputs.breakerLoadingPercent, limitingBreaker]
  );

  const verdictBadge =
    verdict.status === 'OK' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700';

  return (
    <section ref={sectionRef} className="space-y-4 rounded-2xl border border-slate-200 bg-white/95 p-6 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{copy.calculator.title}</h2>
          <p className="text-sm text-slate-600">
            {manualMode
              ? copy.calculator.manualIntro
              : copy.calculator.autoIntro}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <InfoBubble label={copy.calculator.helpLabel} closeLabel={copy.mapper.closeHelp}>{copy.help.panel}</InfoBubble>
          <span className={`rounded-full px-4 py-1 text-sm font-semibold ${verdictBadge}`}>{verdict.status === 'OK' ? copy.calculator.statusOk : copy.calculator.statusUpgrade}</span>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          {copy.calculator.serviceSize}
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

        <div className="space-y-2 text-sm font-medium text-slate-700">
          <label className="block">
            {copy.calculator.mainBreaker}
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
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={inputs.breakerLoadingEnabled}
                onChange={(event) =>
                  setInputs((prev) => ({ ...prev, breakerLoadingEnabled: event.target.checked }))
                }
              />
              {copy.calculator.breakerLoading}
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={150}
                className="w-16 rounded-md border border-slate-300 px-2 py-1 text-right"
                value={inputs.breakerLoadingPercent}
                onChange={(event) =>
                  setInputs((prev) => ({ ...prev, breakerLoadingPercent: Number(event.target.value) }))
                }
                disabled={!inputs.breakerLoadingEnabled}
              />
              <span>%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <LoadList
          title={copy.calculator.existingLoad}
          items={inputs.existingLoads}
          onChange={(id, value) => updateLoad('existingLoads', id, value)}
          onRemove={(id) => removeLoad('existingLoads', id)}
          total={totalExisting}
          lockFirst
          headerExtras={
            <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={inputs.existingAdjustmentEnabled}
                  onChange={(event) =>
                    setInputs((prev) => ({ ...prev, existingAdjustmentEnabled: event.target.checked }))
                  }
                />
                {copy.calculator.adjustmentFactor}
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={200}
                  className="w-16 rounded-md border border-slate-300 px-2 py-1 text-right"
                  value={inputs.existingAdjustmentPercent}
                  onChange={(event) =>
                    setInputs((prev) => ({ ...prev, existingAdjustmentPercent: Number(event.target.value) }))
                  }
                  disabled={!inputs.existingAdjustmentEnabled}
                />
                <span>%</span>
              </div>
            </div>
          }
          footerText={
            inputs.existingAdjustmentEnabled
              ? `${copy.calculator.diversifiedTotal}: ${totalExisting.toFixed(1)} A (${copy.calculator.adjustedTo} ${adjustedExisting.toFixed(1)} A)`
              : `${copy.calculator.diversifiedTotal}: ${totalExisting.toFixed(1)} A`
          }
        />

        <LoadList
          title={copy.calculator.proposedLoads}
          items={inputs.newLoads}
          onAdd={() => addLoad('newLoads')}
          onChange={(id, value) => updateLoad('newLoads', id, value)}
          onRemove={(id) => removeLoad('newLoads', id)}
          total={totalNew}
        />
      </div>

      <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-semibold">{copy.calculator.availableMargin}</p>
        <p className="text-2xl font-bold text-slate-900">{verdict.availableMargin.toFixed(1)} A</p>
        <p>{translateError(verdict.message)} {copy.calculator.alwaysConfirm}</p>
        <p className="mt-2 text-slate-600">
          {copy.calculator.effectiveCapacity}: {effectiveBreaker.toFixed(1)} A (capped by {limitingBreaker} A service/breaker) at{' '}
          {inputs.breakerLoadingEnabled ? `${inputs.breakerLoadingPercent}%` : '100%'}.
        </p>
        <p className="text-slate-600">
          {copy.calculator.existingLoad} {inputs.existingAdjustmentEnabled ? copy.calculator.afterAdjustment : copy.calculator.entered}: {adjustedExisting.toFixed(1)} A ·
          {copy.calculator.additions}: {totalNew.toFixed(1)} A.
        </p>
      </div>
    </section>
  );
}

interface ListProps {
  title: string;
  items: LoadEntry[];
  onAdd?: () => void;
  onRemove: (id: string) => void;
  onChange: (id: string, value: Partial<LoadEntry>) => void;
  total: number;
  lockFirst?: boolean;
  headerExtras?: ReactNode;
  footerText?: string;
}

function LoadList({ title, items, onAdd, onRemove, onChange, total, lockFirst, headerExtras, footerText }: ListProps) {
  const { copy } = useI18n();
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-700">{title}</p>
          {headerExtras}
        </div>
        {onAdd && (
          <button
            type="button"
            className="rounded-full border border-brand-600 px-3 py-1 text-xs font-semibold text-brand-700"
            onClick={onAdd}
          >
            {copy.calculator.addLoad}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="grid gap-2 rounded-xl border border-slate-200 p-3 text-sm sm:grid-cols-[1fr,120px,80px] sm:items-center"
          >
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              value={item.name}
              onChange={(event) => onChange(item.id, { name: event.target.value })}
              placeholder={copy.calculator.loadPlaceholder}
            />
            <input
              type="number"
              min={0}
              className="rounded-lg border border-slate-200 px-3 py-2"
              value={item.amps}
              onChange={(event) => onChange(item.id, { amps: Number(event.target.value) })}
            />
            <button
              type="button"
              className={`text-xs font-medium text-rose-600 hover:underline ${lockFirst && index === 0 ? 'pointer-events-none opacity-20' : ''}`}
              onClick={() => onRemove(item.id)}
              disabled={lockFirst && index === 0}
            >
              {copy.calculator.remove}
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs uppercase tracking-wide text-slate-500">{footerText ?? `${copy.calculator.diversifiedTotal}: ${total.toFixed(1)} A`}</p>
    </div>
  );
}

function provenDemand(records: IntervalDatum[]) {
  if (!records.length) return 0;
  const peak = records.reduce((max, datum) => Math.max(max, datum.amps), 0);
  return Number(peak.toFixed(1));
}

function inferCadenceMinutes(analysis: AnalysisState) {
  if (analysis.manualPeak) {
    return analysis.manualPeak.intervalMinutes;
  }
  return analysis.data[0]?.intervalMinutes ?? null;
}

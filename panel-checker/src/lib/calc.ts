import { LoadEntry, PanelInputs, PanelVerdict } from '../types';

export function diversifiedLoad(loads: LoadEntry[]): number {
  return loads.reduce((sum, load) => sum + load.amps, 0);
}

export function calculateVerdict(inputs: PanelInputs, demandAmps: number): PanelVerdict {
  const existing = diversifiedLoad(inputs.existingLoads);
  const adjustedExisting = inputs.existingAdjustmentEnabled
    ? existing * (inputs.existingAdjustmentPercent / 100)
    : existing;
  const additions = diversifiedLoad(inputs.newLoads);
  const diversified = Math.max(adjustedExisting, demandAmps) + additions;
  const effectiveBreaker = inputs.mainBreaker * (inputs.breakerLoadingEnabled ? inputs.breakerLoadingPercent / 100 : 1);
  const available = effectiveBreaker - diversified;

  let status: PanelVerdict['status'] = 'OK';
  let message = 'Demand appears to be within the main breaker allowance.';

  if (available < 0) {
    status = 'Upgrade';
    message = 'Calculated load exceeds the effective main breaker capacity; consider an upgrade.';
  }

  return {
    diversifiedLoad: diversified,
    availableMargin: available,
    status,
    message,
    proposedLoads: inputs.newLoads.map((load: LoadEntry) => ({
      name: load.name,
      amps: load.amps,
      continuous: load.continuous
    }))
  };
}

export function defaultPanelInputs(): PanelInputs {
  return {
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
  };
}

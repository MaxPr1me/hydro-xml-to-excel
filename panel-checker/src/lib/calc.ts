import { LoadEntry, PanelInputs, PanelVerdict } from '../types';

function effectiveLoad(load: LoadEntry): number {
  return load.continuous ? load.amps * 1.25 : load.amps;
}

export function diversifiedLoad(loads: LoadEntry[]): number {
  return loads.reduce((sum, load) => sum + effectiveLoad(load), 0);
}

export function calculateVerdict(inputs: PanelInputs, demandAmps: number): PanelVerdict {
  const existing = diversifiedLoad(inputs.existingLoads);
  const additions = diversifiedLoad(inputs.newLoads);
  const diversified = Math.max(existing, demandAmps) + additions;
  const available = inputs.mainBreaker - diversified;

  let status: PanelVerdict['status'] = 'OK';
  let message = 'Demand appears to be within the service rating.';

  if (available < 0) {
    status = 'Upgrade';
    message = 'Calculated load exceeds the main breaker rating; consider an upgrade.';
  } else if (available < inputs.mainBreaker * 0.1) {
    status = 'Review';
    message = 'Available margin is slim; review with a licensed electrician.';
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
    busRating: 225,
    voltage: 240,
    existingLoads: [],
    newLoads: []
  };
}
